import { useEffect, useMemo, useState } from 'react';
import { Bot, Copy, HelpCircle, RotateCcw, Share2, Shield, Swords, Wifi, X } from 'lucide-react';
import { elementLabel } from '../game/cards';
import { attackLane, createGame, endTurn, playSelectedCard, runCpuTurn, selectHand } from '../game/engine';
import { createShareUrl, loadRoomSnapshot, saveRoomSnapshot } from '../game/online';
import type { BoardUnit, Card, GameState, Lane, PlayerId } from '../game/types';

function initialGame(): GameState {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  return room ? loadRoomSnapshot(room) ?? createGame('online') : createGame('cpu');
}

export function App() {
  const [game, setGame] = useState<GameState>(() => initialGame());
  const [showRules, setShowRules] = useState(false);
  const active = game.players[game.activePlayer];
  const player = game.players.player;
  const selected = game.selectedHandIndex === null ? null : active.hand[game.selectedHandIndex];
  const shareUrl = useMemo(() => createShareUrl(game.roomCode), [game.roomCode]);

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
          <p className="eyebrow">Arcana Duel</p>
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
        <PlayerBadge side="opponent" state={game} />
        <div className="turn-pill">
          <Swords size={17} />
          <span>{game.phase === 'finished' ? '決着' : `${active.name} / T${game.turn}`}</span>
        </div>
        <PlayerBadge side="player" state={game} />
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
          <button onClick={() => navigator.share?.({ title: 'Arcana Duel', url: shareUrl })} title="共有">
            <Share2 size={17} />
          </button>
        </section>
      )}

      <section className="battlefield">
        <PlayerBoard playerId="opponent" state={game} />
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
        <PlayerBoard playerId="player" state={game} />
      </section>

      <section className="hand-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Hand</p>
            <h2>{selected ? `${selected.name} を配置` : 'カードを選択'}</h2>
          </div>
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
      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </main>
  );
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-backdrop" role="presentation" onClick={onClose}>
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(event) => event.stopPropagation()}>
        <div className="rules-titlebar">
          <div>
            <p className="eyebrow">How to play</p>
            <h2 id="rules-title">CardBattle12345 ルール</h2>
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

function PlayerBadge({ side, state }: { side: PlayerId; state: GameState }) {
  const player = state.players[side];
  return (
    <div className={`player-badge ${state.activePlayer === side ? 'current' : ''}`}>
      <div>
        <strong>{player.name}</strong>
        <span>Mana {player.mana}/10</span>
      </div>
      <div className="shield-count">
        <Shield size={16} />
        <span>{player.shields.length}</span>
      </div>
    </div>
  );
}

function PlayerBoard({ playerId, state }: { playerId: PlayerId; state: GameState }) {
  const player = state.players[playerId];
  return (
    <div className={`board ${playerId}`}>
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
      <h3>{card.name}</h3>
      {!compact && <p>{card.text}</p>}
      <div className="stat-row">
        <span>{card.kind}</span>
        <span>{card.kind === 'unit' ? `${card.power}/${card.shield}` : card.power ? `+${card.power}` : 'skill'}</span>
      </div>
    </button>
  );
}
