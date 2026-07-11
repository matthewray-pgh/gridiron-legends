import { create } from 'zustand';
import {
  Player,
  Position,
  DRAFT_POSITIONS,
  GENERATED_ERA_OPTIONS,
  getAllPlayersForSpin,
  getPlayableSpinCombosForOpenPositions,
  getViableTeamAbbrs,
} from '../data/players';

export type GameMode = 'daily' | 'classic' | 'iq' | 'timer';
export type TeamScope = 'all' | 'single';
export type SpinState = 'pre' | 'spinning' | 'revealed' | 'picked';

export type EraToken =
  | '2000-2005'
  | '2006-2010'
  | '2011-2015'
  | '2016-2020'
  | '2021-2025';

export const ERA_OPTIONS: EraToken[] = [...GENERATED_ERA_OPTIONS];

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

  setMode: (mode: GameMode) => void;
  beginDraftSession: (params: { teamScope: TeamScope; selectedEras: EraToken[] }) => void;
  rollSpin: () => void;
  rerollSpin: () => void;
  setSpinState: (state: SpinState) => void;
  keepPlayer: () => void;
  passPlayer: () => void;
  setPlayerIndex: (index: number) => void;
  assignPlayerToPosition: (position: Position) => void;
  resetGame: () => void;
  currentPosition: () => Position;
  openPositions: () => Position[];
  currentCandidates: () => Player[];
  currentPlayer: () => Player | null;
  maxPasses: () => number;
}

const MAX_PASSES_BY_MODE: Record<GameMode, number> = {
  daily: 1,
  classic: 2,
  iq: 0,
  timer: 3,
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
    const openPositions = get().openPositions();

    if (openPositions.length === 0) {
      set({ currentSpin: null, spinState: 'picked' });
      return;
    }

    const viableTeamAbbrs = getViableTeamAbbrs(FRANCHISES.map((franchise) => franchise.abbr), eras);
    const availableTeams = teamScope === 'single'
      ? (lockedTeam
        ? [lockedTeam]
        : FRANCHISES.filter((team) => viableTeamAbbrs.includes(team.abbr)))
      : FRANCHISES;

    const playableCombos = getPlayableSpinCombosForOpenPositions(
      openPositions,
      availableTeams.map((team) => team.abbr),
      eras,
    );

    if (playableCombos.length === 0) {
      set({ currentSpin: null, spinState: 'pre' });
      return;
    }

    const selectedCombo = playableCombos[Math.floor(Math.random() * playableCombos.length)];
    const team = availableTeams.find((entry) => entry.abbr === selectedCombo.teamAbbr);

    if (!team) {
      set({ currentSpin: null, spinState: 'pre' });
      return;
    }

    set({
      lockedTeam: teamScope === 'single' ? team : null,
      currentSpin: { team, era: selectedCombo.era as EraToken },
      playerIndex: 0,
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

  currentPosition: () => {
    const nextOpen = DRAFT_POSITIONS.find((position) => !get().roster[position]);
    return nextOpen ?? DRAFT_POSITIONS[DRAFT_POSITIONS.length - 1];
  },

  openPositions: () => DRAFT_POSITIONS.filter((position) => !get().roster[position]),

  currentCandidates: () => {
    const currentSpin = get().currentSpin;
    if (!currentSpin) return [];
    return getAllPlayersForSpin(currentSpin, get().openPositions());
  },

  currentPlayer: () => {
    const pool = get().currentCandidates();
    if (pool.length === 0) return null;
    return pool[get().playerIndex % pool.length];
  },

  maxPasses: () => MAX_PASSES_BY_MODE[get().mode],

  keepPlayer: () => {
    const position = get().currentPosition();
    get().assignPlayerToPosition(position);
  },

  passPlayer: () => {
    const poolSize = get().currentCandidates().length;
    if (poolSize <= 1) return;
    const nextIndex = (get().playerIndex + 1) % poolSize;
    set({ playerIndex: nextIndex });
  },

  setPlayerIndex: (index) => {
    const poolSize = get().currentCandidates().length;
    if (poolSize <= 0) {
      set({ playerIndex: 0 });
      return;
    }
    const clampedIndex = Math.max(0, Math.min(index, poolSize - 1));
    set({ playerIndex: clampedIndex });
  },

  assignPlayerToPosition: (position) => {
    const { roster, currentPlayer, openPositions } = get();

    if (!openPositions().includes(position)) return;

    const player = currentPlayer();
    if (!player) return;

    const eligiblePositions = player.eligiblePositions ?? [];
    if (!eligiblePositions.includes(position)) return;

    const nextRoster = { ...roster, [position]: { ...player, position } };
    const draftedCount = DRAFT_POSITIONS.filter((slot) => nextRoster[slot]).length;
    const isComplete = draftedCount >= DRAFT_POSITIONS.length;

    set({
      roster: nextRoster,
      positionIndex: Math.min(draftedCount, DRAFT_POSITIONS.length - 1),
      playerIndex: 0,
      passesUsed: {},
      currentSpin: null,
      spinState: isComplete ? 'picked' : 'pre',
      isComplete,
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
