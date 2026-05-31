import { buildStarterDeck, elementBeats } from './cards';
import type { BoardUnit, Card, GameState, Lane, PlayerId, PlayerState } from './types';

const lanes: Array<BoardUnit | null> = [null, null, null];

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function opponentOf(player: PlayerId): PlayerId {
  return player === 'player' ? 'opponent' : 'player';
}

function draw(player: PlayerState, count = 1): PlayerState {
  const deck = [...player.deck];
  const hand = [...player.hand];
  const discard = [...player.discard];

  for (let i = 0; i < count; i += 1) {
    if (deck.length === 0 && discard.length > 0) {
      deck.push(...shuffle(discard.splice(0)));
    }
    const card = deck.shift();
    if (card) hand.push(card);
  }

  return { ...player, deck, hand, discard };
}

function createPlayer(id: PlayerId, name: string): PlayerState {
  const deck = shuffle(buildStarterDeck());
  const shields = deck.splice(0, 5);
  const base: PlayerState = {
    id,
    name,
    health: 5,
    mana: 1,
    deck,
    hand: [],
    discard: [],
    shields,
    lanes: [...lanes],
    trap: null,
  };
  return draw(base, 5);
}

export function createGame(mode: GameState['mode'] = 'cpu'): GameState {
  const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    players: {
      player: createPlayer('player', 'あなた'),
      opponent: createPlayer('opponent', mode === 'cpu' ? 'CPU' : '対戦相手'),
    },
    activePlayer: 'player',
    turn: 1,
    phase: 'main',
    winner: null,
    selectedHandIndex: null,
    selectedLane: null,
    log: ['ゲーム開始。マナは毎ターン+1、相手のシールドをすべて割ると勝利です。'],
    mode,
    roomCode,
  };
}

function appendLog(state: GameState, entry: string): GameState {
  return { ...state, log: [entry, ...state.log].slice(0, 12) };
}

function updatePlayer(state: GameState, player: PlayerState): GameState {
  return { ...state, players: { ...state.players, [player.id]: player } };
}

function checkWinner(state: GameState): GameState {
  const playerDead = state.players.player.health <= 0;
  const opponentDead = state.players.opponent.health <= 0;
  if (!playerDead && !opponentDead) return state;
  const winner = opponentDead ? 'player' : 'opponent';
  return appendLog({ ...state, phase: 'finished', winner }, `${state.players[winner].name}の勝利。`);
}

function cardCost(card: Card, targetLane: BoardUnit | null): number {
  if (card.evolution && targetLane) return Math.max(1, card.cost - 2);
  return card.cost;
}

function dealUnitDamage(unit: BoardUnit, damage: number): BoardUnit | null {
  const next = { ...unit, damage: unit.damage + damage };
  return next.damage >= next.card.shield ? null : next;
}

function firstOccupiedLane(player: PlayerState): Lane | null {
  const index = player.lanes.findIndex(Boolean);
  return index === -1 ? null : (index as Lane);
}

export function selectHand(state: GameState, index: number): GameState {
  if (state.phase === 'finished') return state;
  return { ...state, selectedHandIndex: index };
}

export function playSelectedCard(state: GameState, lane: Lane): GameState {
  if (state.phase === 'finished' || state.selectedHandIndex === null) return state;
  const active = state.players[state.activePlayer];
  const enemy = state.players[opponentOf(state.activePlayer)];
  const card = active.hand[state.selectedHandIndex];
  if (!card) return state;

  const targetLane = active.lanes[lane];
  const cost = cardCost(card, targetLane);
  if (active.mana < cost) return appendLog(state, `マナが足りません: ${card.name} は${cost}必要です。`);

  const hand = active.hand.filter((_, index) => index !== state.selectedHandIndex);
  let nextActive: PlayerState = { ...active, mana: active.mana - cost, hand };
  let nextEnemy = enemy;
  let nextState: GameState = { ...state, selectedHandIndex: null };

  if (card.kind === 'unit') {
    const unit: BoardUnit = {
      instanceId: `${card.id}-${Date.now()}`,
      card,
      damage: 0,
      exhausted: card.id.includes('volt-runner') ? false : true,
    };
    const laneCards = [...nextActive.lanes];
    if (laneCards[lane]) nextActive = { ...nextActive, discard: [...nextActive.discard, laneCards[lane]!.card] };
    laneCards[lane] = unit;
    nextActive = { ...nextActive, lanes: laneCards };

    if (card.trigger === 'onSummon') {
      const enemyLane = firstOccupiedLane(nextEnemy);
      if (enemyLane !== null) {
        const enemyLanes = [...nextEnemy.lanes];
        enemyLanes[enemyLane] = dealUnitDamage(enemyLanes[enemyLane]!, 1);
        nextEnemy = { ...nextEnemy, lanes: enemyLanes };
      }
    }
  }

  if (card.kind === 'spell') {
    nextActive = { ...nextActive, discard: [...nextActive.discard, card] };
    if (card.id.includes('ember-burst')) {
      const enemyLane = firstOccupiedLane(nextEnemy);
      if (enemyLane !== null) {
        const enemyLanes = [...nextEnemy.lanes];
        enemyLanes[enemyLane] = dealUnitDamage(enemyLanes[enemyLane]!, card.power);
        nextEnemy = { ...nextEnemy, lanes: enemyLanes };
      } else {
        nextEnemy = breakShield(nextEnemy);
      }
    }
    if (card.id.includes('tide-recall')) nextActive = draw(nextActive, 2);
    if (card.id.includes('terra-root')) nextActive = { ...nextActive, mana: nextActive.mana + 2 };
  }

  if (card.kind === 'trap') {
    if (nextActive.trap) nextActive = { ...nextActive, discard: [...nextActive.discard, nextActive.trap] };
    nextActive = { ...nextActive, trap: card };
  }

  nextState = updatePlayer(nextState, nextActive);
  nextState = updatePlayer(nextState, nextEnemy);
  return checkWinner(appendLog(nextState, `${active.name} は ${card.name} を使用。`));
}

function breakShield(player: PlayerState): PlayerState {
  const shields = [...player.shields];
  const shield = shields.shift();
  if (!shield) return { ...player, health: player.health - 1 };
  const hand = shield.trigger === 'onBreak' ? [...player.hand, shield] : player.hand;
  const discard = shield.trigger === 'onBreak' ? player.discard : [...player.discard, shield];
  return { ...player, shields, hand, discard };
}

export function attackLane(state: GameState, lane: Lane): GameState {
  if (state.phase === 'finished') return state;
  const active = state.players[state.activePlayer];
  const enemy = state.players[opponentOf(state.activePlayer)];
  const attacker = active.lanes[lane];
  if (!attacker || attacker.exhausted) return state;

  let attackPower = attacker.card.power;
  let nextAttacker: BoardUnit | null = { ...attacker, exhausted: true };
  let nextEnemy = enemy;
  const blocker = enemy.lanes[lane];

  if (enemy.trap) {
    nextAttacker = dealUnitDamage(nextAttacker, enemy.trap.power);
    nextEnemy = { ...nextEnemy, discard: [...nextEnemy.discard, enemy.trap], trap: null };
  }

  if (blocker && nextAttacker) {
    const bonus = elementBeats[attacker.card.element] === blocker.card.element ? 1 : 0;
    const enemyLanes = [...nextEnemy.lanes];
    enemyLanes[lane] = dealUnitDamage(blocker, attackPower + bonus);
    nextEnemy = { ...nextEnemy, lanes: enemyLanes };
    attackPower = blocker.card.power;
    nextAttacker = dealUnitDamage(nextAttacker, attackPower);
  } else if (nextAttacker) {
    nextEnemy = breakShield(nextEnemy);
  }

  let nextActive = active;
  const activeLanes = [...active.lanes];
  activeLanes[lane] = nextAttacker;
  nextActive = { ...nextActive, lanes: activeLanes };
  if (attacker.card.trigger === 'onAttack' && nextAttacker) nextActive = draw(nextActive, 1);

  let nextState = updatePlayer(state, nextActive);
  nextState = updatePlayer(nextState, nextEnemy);
  return checkWinner(appendLog(nextState, `${active.name} の ${attacker.card.name} が攻撃。`));
}

export function endTurn(state: GameState): GameState {
  if (state.phase === 'finished') return state;
  const nextPlayerId = opponentOf(state.activePlayer);
  const nextPlayer = state.players[nextPlayerId];
  const readyLanes = nextPlayer.lanes.map((unit) => (unit ? { ...unit, exhausted: false } : null));
  const advanced = draw(
    {
      ...nextPlayer,
      mana: Math.min(10, nextPlayer.mana + 1),
      lanes: readyLanes,
    },
    1,
  );
  const nextState = updatePlayer(
    {
      ...state,
      activePlayer: nextPlayerId,
      turn: state.turn + 1,
      selectedHandIndex: null,
      selectedLane: null,
    },
    advanced,
  );
  return appendLog(nextState, `${advanced.name} のターン。`);
}

export function runCpuTurn(state: GameState): GameState {
  if (state.activePlayer !== 'opponent' || state.phase === 'finished') return state;
  let next = state;
  const cpu = next.players.opponent;
  const playable = cpu.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.cost <= cpu.mana)
    .sort((a, b) => b.card.cost - a.card.cost)[0];

  if (playable) {
    const lane = (cpu.lanes.findIndex((unit) => unit === null) === -1 ? 0 : cpu.lanes.findIndex((unit) => unit === null)) as Lane;
    next = selectHand(next, playable.index);
    next = playSelectedCard(next, lane);
  }

  for (let lane = 0; lane < 3; lane += 1) {
    const unit = next.players.opponent.lanes[lane];
    if (unit && !unit.exhausted) next = attackLane(next, lane as Lane);
  }

  return endTurn(next);
}
