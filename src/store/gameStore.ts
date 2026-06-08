import { create } from 'zustand';
import { Player, Position, DRAFT_POSITIONS, PLAYERS } from '../data/players';

export type GameMode = 'daily' | 'classic' | 'iq';

export interface GameState {
  mode: GameMode;
  positionIndex: number;
  playerIndex: number;
  passesUsed: Record<string, number>;
  roster: Partial<Record<Position, Player>>;
  isComplete: boolean;

  // Actions
  setMode: (mode: GameMode) => void;
  keepPlayer: () => void;
  passPlayer: () => void;
  resetGame: () => void;
  currentPosition: () => Position;
  currentPlayer: () => Player;
  maxPasses: () => number;
}

const MAX_PASSES_BY_MODE: Record<GameMode, number> = {
  daily: 1,
  classic: 2,
  iq: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'classic',
  positionIndex: 0,
  playerIndex: 0,
  passesUsed: {},
  roster: {},
  isComplete: false,

  setMode: (mode) => set({ mode }),

  currentPosition: () => DRAFT_POSITIONS[get().positionIndex],

  currentPlayer: () => {
    const pos = get().currentPosition();
    const pool = PLAYERS[pos];
    return pool[get().playerIndex % pool.length];
  },

  maxPasses: () => MAX_PASSES_BY_MODE[get().mode],

  keepPlayer: () => {
    const { positionIndex, roster, currentPosition, currentPlayer } = get();
    const pos = currentPosition();
    const player = currentPlayer();
    const newRoster = { ...roster, [pos]: player };
    const isComplete = positionIndex + 1 >= DRAFT_POSITIONS.length;
    set({
      roster: newRoster,
      positionIndex: isComplete ? positionIndex : positionIndex + 1,
      playerIndex: 0,
      passesUsed: {},
      isComplete,
    });
  },

  passPlayer: () => {
    const { playerIndex, passesUsed, currentPosition, maxPasses } = get();
    const pos = currentPosition();
    const used = passesUsed[pos] ?? 0;
    if (used >= maxPasses()) return;
    set({
      playerIndex: playerIndex + 1,
      passesUsed: { ...passesUsed, [pos]: used + 1 },
    });
  },

  resetGame: () =>
    set({
      positionIndex: 0,
      playerIndex: 0,
      passesUsed: {},
      roster: {},
      isComplete: false,
    }),
}));
