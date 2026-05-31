import type { GameState } from './types';

const key = 'arcana-duel-room';

export function saveRoomSnapshot(state: GameState): void {
  localStorage.setItem(`${key}:${state.roomCode}`, JSON.stringify(state));
}

export function loadRoomSnapshot(roomCode: string): GameState | null {
  const raw = localStorage.getItem(`${key}:${roomCode.toUpperCase()}`);
  return raw ? (JSON.parse(raw) as GameState) : null;
}

export function createShareUrl(roomCode: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomCode);
  return url.toString();
}
