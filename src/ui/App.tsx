import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Copy, Gem, Heart, HelpCircle, RotateCcw, Share2, Shield, Swords, Wifi, X } from 'lucide-react';
import { elementLabel } from '../game/cards';
import { attackLane, createGame, endTurn, playSelectedCard, runCpuTurn, selectHand } from '../game/engine';
import { createShareUrl, loadRoomSnapshot, saveRoomSnapshot } from '../game/online';
import type { BoardUnit, Card, GameState, Lane, PlayerId } from '../game/types';

type ActionKind = 'shield' | 'health' | 'trap' | 'mana';

interface ActionEffect {
  id: string;
  key: string;
  kind: ActionKind;
  label: string;
}

function initialGame(): GameState {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  return room ? loadRoomSnapshot(room) ?? createGame('online') : createGame('cpu');
}

export function App() {
  const [game, setGame] = useState<GameState>(() => initialGame());
  const [showRules, setShowRules] = useState(false);
  const [actionEffects, setActionEffects] = useState<ActionEffect[]>([]);
  const previousGame = useRef<GameState | null>(null);
  const active = game.players[game.activePlayer];
  const player = game.players.player;
  const selected = game.selectedHandIndex === null ? null : active.hand[game.selectedHandIndex];
  const shareUrl = useMemo(() => createShareUrl(game.roomCode), [game.roomCode]);

  useEffect(() => {
    const previous = previousGame.current;
    previousGame.current = game;
    if (!previous) return;

    const nextEffects = detectActionEffects(previous, game);
    if (nextEffects.length === 0) return;

    setActionEffects(nextEffects);
    const timer = window.setTimeout(() => setActionEffects([]), 1100);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (game.mode === 'online') saveRoomSnapshot(game);
  }, [game]);

  useEffect(() => {
    if (game.mode !== 'cpu' || game.activePlayer !== 'opponent' || game.phase === 'finished') return;
    const timer = window.setTimeout(() => setGame((current) => runCpuTurn(current)), 650);
    return () => window.clearTimeout(timer);
  }, [game.activePlayer, game.mode, game.phase]);

  function start(mode: GameState['mode']) {
    const next = createGame(mode);
    setGame(next);
    if (mode === 'online') saveRoomSnapshot(next);
  }

  function copyRoom() {
    navigator.clipboard?.writeText(shareUrl);
    setGame((current) => ({ ...current, log: ['ルームURLをコピーしました。', ...current.log].slice(0, 12) }));
  }

  const canAct = game.activePlayer === 'player' && game.phase !== 'finished';

  return (
    <main className="shell">
      <section className="topbar" aria-label="match controls">
        <div>
          <p className="eyebrow">キングダム</p>
          <h1>シールドを割り切れ</h1>
        </div>
        <div className="toolbar">
          <button className={game.mode === 'cpu' ? 'active' : ''} onClick={() => start('cpu')} title="CPU対戦">
            <Bot size={18} />
            <span>CPU</span>
          </button>
          <button className={game.mode === 'online' ? 'active' : ''} onClick={() => start('online')} title="オンライン対戦">
            <Wifi size={18} />
            <span>Online</span>
          </button>
          <button onClick={() => start(game.mode)} title="リセット">
            <RotateCcw size={18} />
          </button>
          <button onClick={() => setShowRules(true)} title="ルール説明">
            <HelpCircle size={18} />
            <span>Rules</span>
          </button>
        </div>
      </section>

      <section className="status-grid">
        <PlayerBadge side="opponent" state={game} effects={actionEffects} />
        <div className="turn-pill">
          <Swords size={17} />
          <span>{game.phase === 'finished' ? '決着' : `${active.name} / T${game.turn}`}</span>
        </div>
        <PlayerBadge side="player" state={game} effects={actionEffects} />
      </section>

      {game.mode === 'online' && (
        <section className="room-band">
          <div>
            <span>ROOM</span>
            <strong>{game.roomCode}</strong>
          </div>
          <button onClick={copyRoom} title="ルームURLをコピー">
            <Copy size={17} />
            <span>URL</span>
          </button>
          <button onClick={() => navigator.share?.({ title: 'キングダム', url: shareUrl })} title="共有">
            <Share2 size={17} />
          </button>
        </section>
      )}

      <section className="battlefield">
        <PlayerBoard playerId="opponent" state={game} effects={actionEffects} />
        <div className="lane-actions">
          {[0, 1, 2].map((lane) => (
            <button
              key={lane}
              disabled={!canAct || !player.lanes[lane] || player.lanes[lane]?.exhausted}
              onClick={() => setGame((current) => attackLane(current, lane as Lane))}
              title={`レーン${lane + 1}で攻撃`}
            >
              <Swords size={18} />
            </button>
          ))}
        </div>
        <PlayerBoard playerId="player" state={game} effects={actionEffects} />
      </section>

      <section className="hand-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Hand</p>
            <h2>{selected ? `${selected.name} を配置` : 'カードを選択'}</h2>
          </div>
          <ManaPanel current={player.mana} flash={hasEffect(actionEffects, 'player-mana')} />
          <button disabled={!canAct} onClick={() => setGame((current) => endTurn(current))}>
            ターン終了
          </button>
        </div>
        <div className="hand">
          {player.hand.map((card, index) => (
            <CardView
              key={`${card.id}-${index}`}
              card={card}
              compact={false}
              selected={game.selectedHandIndex === index}
              onClick={() => canAct && setGame((current) => selectHand(current, index))}
            />
          ))}
        </div>
        {selected && (
          <div className="summon-row">
            {[0, 1, 2].map((lane) => (
              <button key={lane} disabled={!canAct} onClick={() => setGame((current) => playSelectedCard(current, lane as Lane))}>
                レーン{lane + 1}
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="log-panel">
        {game.phase === 'finished' && <strong>{game.players[game.winner!].name}の勝利</strong>}
        {game.log.map((entry, index) => (
          <p key={`${entry}-${index}`}>{entry}</p>
        ))}
      </aside>
      {actionEffects.length > 0 && (
        <div className="action-stack" aria-live="polite">
          {actionEffects.map((effect) => (
            <div className={`action-toast ${effect.kind}`} key={effect.id}>
              {effect.label}
            </div>
          ))}
        </div>
      )}
      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </main>
  );
}

function detectActionEffects(previous: GameState, next: GameState): ActionEffect[] {
  const effects: ActionEffect[] = [];
  const sides: PlayerId[] = ['player', 'opponent'];

  for (const side of sides) {
    const before = previous.players[side];
    const after = next.players[side];
    const name = after.name;

    if (after.shields.length < before.shields.length) {
      effects.push(createEffect(`${side}-shield`, 'shield', `${name}のシールド破壊`));
    }
    if (after.health < before.health) {
      effects.push(createEffect(`${side}-health`, 'health', `${name}のHP減少`));
    }
    if (before.trap && !after.trap) {
      effects.push(createEffect(`${side}-trap`, 'trap', `${name}のトラップ発動`));
    }
    if (after.mana > before.mana) {
      effects.push(createEffect(`${side}-mana`, 'mana', `${name}のマナ追加`));
    }
  }

  return effects;
}

function createEffect(key: string, kind: ActionKind, label: string): ActionEffect {
  return {
    id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    key,
    kind,
    label,
  };
}

function hasEffect(effects: ActionEffect[], key: string): boolean {
  return effects.some((effect) => effect.key === key);
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-backdrop" role="presentation" onClick={onClose}>
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(event) => event.stopPropagation()}>
        <div className="rules-titlebar">
          <div>
            <p className="eyebrow">How to play</p>
            <h2 id="rules-title">キングダム ルール</h2>
          </div>
          <button onClick={onClose} title="閉じる">
            <X size={19} />
          </button>
        </div>

        <div className="rules-content">
          <section>
            <h3>勝利条件</h3>
            <p>相手のシールドをすべて割り、その後さらに攻撃してライフを0にすると勝利です。</p>
          </section>

          <section>
            <h3>ターンの流れ</h3>
            <ol>
              <li>自分のターン開始時にカードを1枚引き、マナが1増えます。</li>
              <li>手札のカードを選び、レーン1から3のどこかに使います。</li>
              <li>準備済みのユニットは、同じレーンの敵または相手シールドへ攻撃できます。</li>
              <li>行動を終えたらターン終了を押します。</li>
            </ol>
          </section>

          <section>
            <h3>カード種別</h3>
            <dl>
              <div>
                <dt>Unit</dt>
                <dd>レーンに残って戦うカードです。表示は ATK/HP です。</dd>
              </div>
              <div>
                <dt>Spell</dt>
                <dd>使うとすぐ効果を発揮し、捨て札に置かれます。</dd>
              </div>
              <div>
                <dt>Trap</dt>
                <dd>伏せておき、次に攻撃された時に攻撃ユニットへ反撃します。</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3>重要な戦術</h3>
            <ul>
              <li>火は森、森は雷、雷は水、水は火に強く、戦闘ダメージが+1されます。</li>
              <li>既にユニットがいるレーンに進化ユニットを重ねると、コストが下がります。</li>
              <li>雷の速攻ユニットは出したターンから攻撃できます。</li>
              <li>シールドを守りたい時は、耐久の高いユニットを同じレーンに置きます。</li>
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}

function PlayerBadge({ side, state, effects }: { side: PlayerId; state: GameState; effects: ActionEffect[] }) {
  const player = state.players[side];
  return (
    <div className={`player-badge ${state.activePlayer === side ? 'current' : ''} ${hasEffect(effects, `${side}-health`) ? 'damage-hit' : ''}`}>
      <div className="player-nameplate">
        <strong>{player.name}</strong>
      </div>
      <div className="badge-resources">
        <ResourceMeter icon="life" label="HP" current={player.health} max={5} flash={hasEffect(effects, `${side}-health`)} />
        <ResourceMeter icon="mana" label="Mana" current={player.mana} max={10} flash={hasEffect(effects, `${side}-mana`)} />
        <ResourceMeter icon="shield" label="Shield" current={player.shields.length} max={5} flash={hasEffect(effects, `${side}-shield`)} />
      </div>
    </div>
  );
}

function ResourceMeter({
  icon,
  label,
  current,
  max,
  flash,
}: {
  icon: 'life' | 'mana' | 'shield';
  label: string;
  current: number;
  max: number;
  flash?: boolean;
}) {
  return (
    <div className={`resource-meter ${icon} ${flash ? 'flash' : ''}`} aria-label={`${label} ${current}/${max}`}>
      <div className="resource-label">
        {icon === 'life' && <Heart size={14} />}
        {icon === 'mana' && <Gem size={14} />}
        {icon === 'shield' && <Shield size={14} />}
        <span>{label}</span>
        <strong>
          {current}/{max}
        </strong>
      </div>
      <div className="resource-pips" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span key={index} className={index < current ? 'filled' : ''} />
        ))}
      </div>
    </div>
  );
}

function ManaPanel({ current, flash }: { current: number; flash?: boolean }) {
  return (
    <div className={`mana-panel ${flash ? 'flash' : ''}`} aria-label={`現在のマナ ${current}`}>
      <div className="mana-head">
        <Gem size={16} />
        <strong>{current}</strong>
        <span>/10</span>
      </div>
      <div className="mana-gems" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className={index < current ? 'filled' : ''} />
        ))}
      </div>
    </div>
  );
}

function PlayerBoard({ playerId, state, effects }: { playerId: PlayerId; state: GameState; effects: ActionEffect[] }) {
  const player = state.players[playerId];
  return (
    <div className={`board ${playerId} ${hasEffect(effects, `${playerId}-trap`) ? 'trap-burst' : ''}`}>
      <div className="board-meta">
        <span>{player.name}</span>
        <span>Deck {player.deck.length}</span>
        <span>{player.trap ? 'Trap Set' : 'Trap Empty'}</span>
      </div>
      <div className="lanes">
        {player.lanes.map((unit, index) => (
          <div className="lane" key={`${playerId}-${index}`}>
            {unit ? <UnitView unit={unit} /> : <span className="empty">Lane {index + 1}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnitView({ unit }: { unit: BoardUnit }) {
  const hp = unit.card.shield - unit.damage;
  return (
    <div className={`unit-card ${unit.card.element} ${unit.exhausted ? 'exhausted' : ''}`}>
      <div className="card-topline">
        <span>{elementLabel[unit.card.element]}</span>
        <strong>{unit.card.cost}</strong>
      </div>
      <CardArt card={unit.card} compact />
      <h3>{unit.card.name}</h3>
      <div className="stat-row">
        <span>ATK {unit.card.power}</span>
        <span>HP {hp}</span>
      </div>
    </div>
  );
}

function CardView({
  card,
  compact,
  selected,
  onClick,
}: {
  card: Card;
  compact: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`hand-card ${card.element} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-topline">
        <span>{elementLabel[card.element]}</span>
        <strong>{card.cost}</strong>
      </div>
      <CardArt card={card} compact={compact} />
      <h3>{card.name}</h3>
      {!compact && <p>{card.text}</p>}
      <div className="stat-row">
        <span>{card.kind}</span>
        <span>{card.kind === 'unit' ? `${card.power}/${card.shield}` : card.power ? `+${card.power}` : 'skill'}</span>
      </div>
    </button>
  );
}

function CardArt({ card, compact }: { card: Card; compact?: boolean }) {
  const art = artForCard(card.id);
  const gradientId = `sky-${card.id.replace(/[^a-z0-9-]/gi, '')}`;

  return (
    <div className={`card-art ${card.element} ${card.kind} ${compact ? 'compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 160 96" role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={art.sky[0]} />
            <stop offset="100%" stopColor={art.sky[1]} />
          </linearGradient>
        </defs>
        <rect width="160" height="96" rx="10" fill={`url(#${gradientId})`} />
        <path d="M0 72 C32 54 52 70 79 55 C111 38 126 64 160 48 L160 96 L0 96 Z" fill="rgba(8,12,16,.34)" />
        <path d="M0 82 C34 69 62 84 90 68 C116 53 137 71 160 60 L160 96 L0 96 Z" fill="rgba(255,255,255,.16)" />
        <CardIllustration type={art.type} />
      </svg>
      <span className="art-caption">{art.label}</span>
    </div>
  );
}

type ArtType = 'scout' | 'strategist' | 'guardian' | 'cavalry' | 'dragon' | 'flame' | 'scroll' | 'supply' | 'trap';

function artForCard(cardId: string): { type: ArtType; label: string; sky: [string, string] } {
  if (cardId.startsWith('ember-scout')) return { type: 'scout', label: '若き斥候', sky: ['#e96b3a', '#582217'] };
  if (cardId.startsWith('tide-adept')) return { type: 'strategist', label: '水軍の軍師', sky: ['#45a6bc', '#173f58'] };
  if (cardId.startsWith('terra-warden')) return { type: 'guardian', label: '盾の守将', sky: ['#85b968', '#1d4b34'] };
  if (cardId.startsWith('volt-runner')) return { type: 'cavalry', label: '雷騎兵', sky: ['#f0c84d', '#604c13'] };
  if (cardId.startsWith('void-dragon')) return { type: 'dragon', label: '黒星龍', sky: ['#a37ac1', '#251c3d'] };
  if (cardId.startsWith('ember-burst')) return { type: 'flame', label: '火矢の号令', sky: ['#f07a34', '#5d1818'] };
  if (cardId.startsWith('tide-recall')) return { type: 'scroll', label: '兵法の巻物', sky: ['#6bc5d8', '#244c6b'] };
  if (cardId.startsWith('terra-root')) return { type: 'supply', label: '補給陣', sky: ['#8fbf61', '#285437'] };
  return { type: 'trap', label: '反鏡陣', sky: ['#8f75a8', '#282038'] };
}

function CardIllustration({ type }: { type: ArtType }) {
  if (type === 'scout') {
    return (
      <g className="ink-figure scout">
        <path d="M76 35 l16 18 l-10 4 l-11 -13 Z" />
        <circle cx="70" cy="31" r="9" />
        <path d="M61 43 h30 l-6 34 h-21 Z" />
        <path d="M54 52 l-22 12 M88 51 l26 -19 M112 31 l12 3" />
      </g>
    );
  }
  if (type === 'strategist') {
    return (
      <g className="ink-figure strategist">
        <circle cx="78" cy="31" r="8" />
        <path d="M61 47 q17 -19 35 0 l5 31 h-45 Z" />
        <path d="M45 63 q35 -18 70 0" />
        <path d="M43 69 q37 -18 74 0" />
        <path d="M103 36 l22 -12 l-5 24 Z" />
      </g>
    );
  }
  if (type === 'guardian') {
    return (
      <g className="ink-figure guardian">
        <path d="M58 35 l22 -13 l23 13 v20 q0 21 -23 31 q-22 -10 -22 -31 Z" />
        <path d="M80 28 v49 M63 49 h34" />
        <circle cx="80" cy="42" r="6" />
      </g>
    );
  }
  if (type === 'cavalry') {
    return (
      <g className="ink-figure cavalry">
        <path d="M45 62 q28 -30 68 -4 l17 18 h-32 l-10 -10 h-28 l-12 10 h-25 Z" />
        <circle cx="112" cy="48" r="8" />
        <path d="M78 35 l10 18 l-15 5 l-10 -15 Z" />
        <path d="M88 29 l32 -15 M119 14 l8 9" />
      </g>
    );
  }
  if (type === 'dragon') {
    return (
      <g className="ink-figure dragon">
        <path d="M34 64 q20 -40 51 -15 q18 14 36 -14 q5 25 -17 37 q-24 13 -45 -4 q-11 -9 -25 -4 Z" />
        <path d="M109 35 l18 -11 l-5 20 Z" />
        <path d="M53 50 q8 -19 25 -28 M72 70 q-3 13 -17 18" />
        <circle cx="113" cy="39" r="3" />
      </g>
    );
  }
  if (type === 'flame') {
    return (
      <g className="ink-figure flame">
        <path d="M79 82 q-26 -16 -10 -39 q7 -9 5 -22 q22 14 16 31 q13 -7 17 -21 q18 28 -3 47 q-11 10 -25 4 Z" />
        <path d="M34 68 l90 -42 M118 24 l12 3 M116 25 l7 -10" />
        <path d="M43 76 l78 -31" />
      </g>
    );
  }
  if (type === 'scroll') {
    return (
      <g className="ink-figure scroll">
        <path d="M48 32 h63 q-10 8 0 16 v31 h-63 q10 -8 0 -16 Z" />
        <path d="M60 48 h40 M60 58 h32 M60 68 h45" />
        <circle cx="48" cy="32" r="8" />
        <circle cx="48" cy="79" r="8" />
      </g>
    );
  }
  if (type === 'supply') {
    return (
      <g className="ink-figure supply">
        <path d="M39 68 h82 v17 h-82 Z" />
        <path d="M52 43 h56 l8 25 h-72 Z" />
        <path d="M68 43 v-18 h24 v18" />
        <path d="M58 56 h44 M64 68 v17 M96 68 v17" />
      </g>
    );
  }
  return (
    <g className="ink-figure trap">
      <path d="M80 23 l45 25 l-45 26 l-45 -26 Z" />
      <path d="M80 38 l20 10 l-20 11 l-20 -11 Z" />
      <path d="M35 48 h-17 M125 48 h17 M80 23 v-15 M80 74 v14" />
    </g>
  );
}
