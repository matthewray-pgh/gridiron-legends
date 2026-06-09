import { create } from 'zustand';
import { Player, Position, DRAFT_POSITIONS, PLAYERS } from '../data/players';

export type GameMode = 'daily' | 'classic' | 'iq';
export type TeamScope = 'all' | 'single';
export type SpinState = 'pre' | 'spinning' | 'revealed' | 'picked';

export type EraToken =
  | 'Legends (pre-1999)'
  | '1999-2005'
  | '2006-2010'
  | '2011-2015'
  | '2016-2020'
  | '2021-2025';

export const ERA_OPTIONS: EraToken[] = [
  'Legends (pre-1999)',
  '1999-2005',
  '2006-2010',
  '2011-2015',
  '2016-2020',
  '2021-2025',
];

export interface Franchise {
  id: string;
  abbr: string;
  name: string;
}

export const FRANCHISES: Franchise[] = [
  { id: 'pit', abbr: 'PIT', name: 'Pittsburgh Steelers' },
  { id: 'dal', abbr: 'DAL', name: 'Dallas Cowboys' },
  { id: 'ne', abbr: 'NE', name: 'New England Patriots' },
  { id: 'sf', abbr: 'SF', name: 'San Francisco 49ers' },
  { id: 'gb', abbr: 'GB', name: 'Green Bay Packers' },
  { id: 'bal', abbr: 'BAL', name: 'Baltimore Ravens' },
  { id: 'mia', abbr: 'MIA', name: 'Miami Dolphins' },
  { id: 'kc', abbr: 'KC', name: 'Kansas City Chiefs' },
  { id: 'buf', abbr: 'BUF', name: 'Buffalo Bills' },
  { id: 'den', abbr: 'DEN', name: 'Denver Broncos' },
  { id: 'chi', abbr: 'CHI', name: 'Chicago Bears' },
  { id: 'nyg', abbr: 'NYG', name: 'New York Giants' },
];

interface SpinResult {
  team: Franchise;
  era: EraToken;
}

export interface GameState {
  mode: GameMode;
  teamScope: TeamScope;
  selectedEras: EraToken[];
  lockedTeam: Franchise | null;
  rerollsRemaining: number;
  spinState: SpinState;
  currentSpin: SpinResult | null;
  positionIndex: number;
  playerIndex: number;
  passesUsed: Record<string, number>;
  roster: Partial<Record<Position, Player>>;
  isComplete: boolean;

  // Actions
  setMode: (mode: GameMode) => void;
  beginDraftSession: (params: { teamScope: TeamScope; selectedEras: EraToken[] }) => void;
  rollSpin: () => void;
  rerollSpin: () => void;
  setSpinState: (state: SpinState) => void;
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
  teamScope: 'all',
  selectedEras: ERA_OPTIONS,
  lockedTeam: null,
  rerollsRemaining: 1,
  spinState: 'pre',
  currentSpin: null,
  positionIndex: 0,
  playerIndex: 0,
  passesUsed: {},
  roster: {},
  isComplete: false,

  setMode: (mode) => set({ mode }),

  beginDraftSession: ({ teamScope, selectedEras }) => {
    const eras = selectedEras.length > 0 ? selectedEras : ERA_OPTIONS;
    set({
      teamScope,
      selectedEras: eras,
      lockedTeam: null,
      rerollsRemaining: 1,
      spinState: 'pre',
      currentSpin: null,
      positionIndex: 0,
      playerIndex: 0,
      passesUsed: {},
      roster: {},
      isComplete: false,
    });
  },

  rollSpin: () => {
    const { teamScope, selectedEras, lockedTeam } = get();
    const eras = selectedEras.length > 0 ? selectedEras : ERA_OPTIONS;
    const era = eras[Math.floor(Math.random() * eras.length)];

    let team = lockedTeam;
    if (teamScope === 'all' || !team) {
      team = FRANCHISES[Math.floor(Math.random() * FRANCHISES.length)];
    }

    set({
      lockedTeam: teamScope === 'single' ? team : null,
      currentSpin: { team, era },
      spinState: 'revealed',
    });
  },

  rerollSpin: () => {
    const { rerollsRemaining, spinState } = get();
    if (rerollsRemaining <= 0 || spinState === 'picked') return;
    set({
      rerollsRemaining: rerollsRemaining - 1,
      spinState: 'pre',
      currentSpin: null,
    });
  },

  setSpinState: (state) => set({ spinState: state }),

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
      currentSpin: null,
      spinState: isComplete ? 'picked' : 'pre',
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
      teamScope: 'all',
      selectedEras: ERA_OPTIONS,
      lockedTeam: null,
      rerollsRemaining: 1,
      spinState: 'pre',
      currentSpin: null,
      positionIndex: 0,
      playerIndex: 0,
      passesUsed: {},
      roster: {},
      isComplete: false,
    }),
}));
