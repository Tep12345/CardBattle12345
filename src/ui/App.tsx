import { useEffect, useMemo, useState } from 'react';
import { Bot, Copy, RotateCcw, Share2, Shield, Swords, Wifi } from 'lucide-react';
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
    </main>
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
