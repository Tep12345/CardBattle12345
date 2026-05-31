export type Element = 'ember' | 'tide' | 'terra' | 'volt' | 'void';
export type CardKind = 'unit' | 'spell' | 'trap';
export type Lane = 0 | 1 | 2;
export type PlayerId = 'player' | 'opponent';
export type MatchMode = 'cpu' | 'online';

export interface Card {
  id: string;
  name: string;
  kind: CardKind;
  element: Element;
  cost: number;
  power: number;
  shield: number;
  text: string;
  evolution?: string;
  trigger?: 'onBreak' | 'onAttack' | 'onSummon';
}

export interface BoardUnit {
  instanceId: string;
  card: Card;
  damage: number;
  exhausted: boolean;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  health: number;
  mana: number;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  shields: Card[];
  lanes: Array<BoardUnit | null>;
  trap: Card | null;
}

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  activePlayer: PlayerId;
  turn: number;
  phase: 'main' | 'battle' | 'finished';
  winner: PlayerId | null;
  selectedHandIndex: number | null;
  selectedLane: Lane | null;
  log: string[];
  mode: MatchMode;
  roomCode: string;
}

export interface ActionResult {
  state: GameState;
  message?: string;
}
