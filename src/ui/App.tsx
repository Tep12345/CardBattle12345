import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Copy, Gem, Heart, HelpCircle, RotateCcw, Share2, Shield, Swords, Wifi, X } from 'lucide-react';
import { elementLabel } from '../game/cards';
import { attackLane, createGame, endTurn, playSelectedCard, runCpuTurn, selectHand } from '../game/engine';
import { createShareUrl, loadRoomSnapshot, saveRoomSnapshot } from '../game/online';
import type { BoardUnit, Card, GameState, Lane, PlayerId } from '../game/types';
import cardArtSheet from '../assets/card-art-sheet.png';

type ActionKind = 'shield' | 'health' | 'trap' | 'mana';
const PLAYER_MAX_HP = 8000;

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
            <p>相手のシールドをすべて割り、その後さらに攻撃してHP8000を0にすると勝利です。</p>
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
                <dt>武将</dt>
                <dd>レーンに残って戦うモンスター系カードです。表示は ATK/HP です。</dd>
              </div>
              <div>
                <dt>計略</dt>
                <dd>使うとすぐ効果を発揮し、捨て札に置かれます。</dd>
              </div>
              <div>
                <dt>罠</dt>
                <dd>伏せておき、次に攻撃された時に攻撃ユニットへ反撃します。</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3>重要な戦術</h3>
            <ul>
              <li>火は森、森は雷、雷は水、水は火に強く、戦闘ダメージが+500されます。</li>
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
        <ResourceMeter icon="life" label="HP" current={player.health} max={PLAYER_MAX_HP} flash={hasEffect(effects, `${side}-health`)} />
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
  const pipCount = icon === 'life' ? 8 : max;
  const filledPips = Math.max(0, Math.ceil((Math.max(current, 0) / max) * pipCount));

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
        {Array.from({ length: pipCount }, (_, index) => (
          <span key={index} className={index < filledPips ? 'filled' : ''} />
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
  const kind = cardKindMeta(unit.card.kind);
  return (
    <div className={`unit-card ${unit.card.element} ${unit.exhausted ? 'exhausted' : ''}`}>
      <div className="card-topline">
        <span>{elementLabel[unit.card.element]}</span>
        <strong>{unit.card.cost}</strong>
      </div>
      <span className={`kind-badge ${unit.card.kind}`}>{kind.label}</span>
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
  const kind = cardKindMeta(card.kind);

  return (
    <button className={`hand-card ${card.element} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-topline">
        <span>{elementLabel[card.element]}</span>
        <strong>{card.cost}</strong>
      </div>
      <span className={`kind-badge ${card.kind}`}>{kind.label}</span>
      <CardArt card={card} compact={compact} />
      <h3>{card.name}</h3>
      {!compact && <p>{card.text}</p>}
      <div className="stat-row">
        <span>{kind.label}</span>
        <span>{card.kind === 'unit' ? `${card.power}/${card.shield}` : card.power ? `+${card.power}` : 'skill'}</span>
      </div>
    </button>
  );
}

function cardKindMeta(kind: Card['kind']): { label: string } {
  if (kind === 'unit') return { label: '武将' };
  if (kind === 'spell') return { label: '計略' };
  return { label: '罠' };
}

function CardArt({ card, compact }: { card: Card; compact?: boolean }) {
  const art = artForCard(card.id);

  return (
    <div className={`card-art ${card.element} ${card.kind} ${compact ? 'compact' : ''}`} aria-hidden="true">
      <span
        className="art-image"
        style={{
          backgroundImage: `url(${cardArtSheet})`,
          backgroundPosition: art.position,
        }}
      />
      <span className="art-caption">{art.label}</span>
    </div>
  );
}

type ArtType = 'scout' | 'strategist' | 'guardian' | 'cavalry' | 'dragon' | 'flame' | 'scroll' | 'supply' | 'trap';

function artForCard(cardId: string): { type: ArtType; label: string; position: string } {
  if (cardId.startsWith('ember-scout')) return { type: 'scout', label: '若き斥候', position: '0% 0%' };
  if (cardId.startsWith('tide-adept')) return { type: 'strategist', label: '水軍の軍師', position: '50% 0%' };
  if (cardId.startsWith('terra-warden')) return { type: 'guardian', label: '盾の守将', position: '100% 0%' };
  if (cardId.startsWith('volt-runner')) return { type: 'cavalry', label: '雷騎兵', position: '0% 50%' };
  if (cardId.startsWith('void-dragon')) return { type: 'dragon', label: '黒星龍', position: '50% 50%' };
  if (cardId.startsWith('ember-burst')) return { type: 'flame', label: '火矢の号令', position: '100% 50%' };
  if (cardId.startsWith('tide-recall')) return { type: 'scroll', label: '兵法の巻物', position: '0% 100%' };
  if (cardId.startsWith('terra-root')) return { type: 'supply', label: '補給陣', position: '50% 100%' };
  return { type: 'trap', label: '反鏡陣', position: '100% 100%' };
}
