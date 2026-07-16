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
import { dailyRandom } from '../utils/seededRandom';

export type GameMode = 'daily' | 'classic' | 'iq' | 'timer' | 'dynasty';
export type TeamScope = 'all' | 'single';
export type SpinState = 'pre' | 'spinning' | 'revealed' | 'picked';
export type LockResult = 'pending' | 'hit' | 'miss';

// docs/handoff/02-spin-mechanic-and-two-minute-drill.md > DECISION NEEDED:
// these bonus values are placeholders carried directly from the reference
// mockup's demo JS (lockReel() in gridiron-legends-redesign-concepts.html),
// not finalized game balance. Also left open there: whether these should
// mint Rings currency once Legacy mode (doc 03) ships. Don't tune either
// without confirming first.
export const DRILL_TEAM_LOCK_REROLL_BONUS = 1;
export const DRILL_ERA_LOCK_OVR_BONUS = 3;

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

export interface SpinResult {
  team: Franchise;
  era: EraToken;
}

interface DrillPending {
  spin: SpinResult;
  nextLockedTeam: Franchise | null;
}

// Shared by rollSpin() and beginDrillRound() so both modes select from the
// identical playable-combo pool — the only thing Two-Minute Drill changes is
// *when* the result is revealed to the player, never how it's picked.
//
// Daily Challenge must produce the same spins for every player on the same
// calendar day (docs/handoff/05-game-loop-bugfixes.md, P0) — every other
// mode stays genuinely random. `roundSalt` (the draft round index) keeps
// each of the 12 rounds distinct instead of replaying one seed 12 times.
function pickSpinResult(params: {
  mode: GameMode;
  roundSalt: number;
  teamScope: TeamScope;
  selectedEras: EraToken[];
  lockedTeam: Franchise | null;
  openPositions: Position[];
}): DrillPending | null {
  const { mode, roundSalt, teamScope, selectedEras, lockedTeam, openPositions } = params;
  const eras = selectedEras.length > 0 ? selectedEras : ERA_OPTIONS;

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

  if (playableCombos.length === 0) return null;

  const random = mode === 'daily' ? dailyRandom('spin', roundSalt) : Math.random();
  const selectedCombo = playableCombos[Math.floor(random * playableCombos.length)];
  const team = availableTeams.find((entry) => entry.abbr === selectedCombo.teamAbbr);
  if (!team) return null;

  return {
    spin: { team, era: selectedCombo.era as EraToken },
    nextLockedTeam: teamScope === 'single' ? team : null,
  };
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
  roster: Partial<Record<Position, Player>>;
  isComplete: boolean;

  // Two-Minute Drill ("Lock It In") state — see TwoMinuteDrillSpinScreen.
  teamLockResult: LockResult;
  eraLockResult: LockResult;
  drillPending: DrillPending | null;
  drillOvrBonusPending: number;

  setMode: (mode: GameMode) => void;
  beginDraftSession: (params: { teamScope: TeamScope; selectedEras: EraToken[] }) => void;
  rollSpin: () => void;
  rerollSpin: () => void;
  setSpinState: (state: SpinState) => void;
  beginDrillRound: () => void;
  lockDrillTrack: (which: 'team' | 'era', hit: boolean) => void;
  setPlayerIndex: (index: number) => void;
  assignPlayerToPosition: (position: Position) => void;
  resetGame: () => void;
  currentPosition: () => Position;
  openPositions: () => Position[];
  currentCandidates: () => Player[];
  currentPlayer: () => Player | null;
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'classic',
  teamScope: 'all',
  selectedEras: ERA_OPTIONS,
  lockedTeam: null,
  rerollsRemaining: 1,
  spinState: 'pre',
  currentSpin: null,
  positionIndex: 0,
  playerIndex: -1, // -1 = no candidate selected (see setPlayerIndex)
  roster: {},
  isComplete: false,

  teamLockResult: 'pending',
  eraLockResult: 'pending',
  drillPending: null,
  drillOvrBonusPending: 0,

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
      playerIndex: -1, // -1 = no candidate selected (see setPlayerIndex)
      roster: {},
      isComplete: false,
      teamLockResult: 'pending',
      eraLockResult: 'pending',
      drillPending: null,
      drillOvrBonusPending: 0,
    });
  },

  rollSpin: () => {
    const { mode, teamScope, selectedEras, lockedTeam, positionIndex } = get();
    const openPositions = get().openPositions();

    if (openPositions.length === 0) {
      set({ currentSpin: null, spinState: 'picked' });
      return;
    }

    const picked = pickSpinResult({ mode, roundSalt: positionIndex, teamScope, selectedEras, lockedTeam, openPositions });
    if (!picked) {
      set({ currentSpin: null, spinState: 'pre' });
      return;
    }

    set({
      lockedTeam: picked.nextLockedTeam,
      currentSpin: picked.spin,
      // playerIndex: 0, — disabled: this auto-selected (and visually
      // highlighted) the pool's first candidate on every reveal, which
      // — since candidates are sorted by rating descending — amounted to
      // an unrequested "top rated player" suggestion. Selection is now
      // only ever set by the user tapping a row (see setPlayerIndex).
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

  beginDrillRound: () => {
    const { mode, teamScope, selectedEras, lockedTeam, positionIndex } = get();
    const openPositions = get().openPositions();

    if (openPositions.length === 0) {
      set({
        drillPending: null,
        currentSpin: null,
        spinState: 'picked',
        teamLockResult: 'pending',
        eraLockResult: 'pending',
      });
      return;
    }

    // Pre-determine the result now and hold it — don't reveal it to the UI
    // until both tracks lock, so lock timing can never leak the outcome.
    const picked = pickSpinResult({ mode, roundSalt: positionIndex, teamScope, selectedEras, lockedTeam, openPositions });
    set({
      drillPending: picked,
      currentSpin: null,
      spinState: 'spinning',
      teamLockResult: 'pending',
      eraLockResult: 'pending',
    });
  },

  lockDrillTrack: (which, hit) => {
    const { teamLockResult, eraLockResult, drillPending } = get();
    const currentResult = which === 'team' ? teamLockResult : eraLockResult;
    if (currentResult !== 'pending') return; // already locked — ignore duplicate taps

    const resultValue: LockResult = hit ? 'hit' : 'miss';
    const nextTeamLock = which === 'team' ? resultValue : teamLockResult;
    const nextEraLock = which === 'era' ? resultValue : eraLockResult;

    if (nextTeamLock === 'pending' || nextEraLock === 'pending') {
      set(which === 'team' ? { teamLockResult: resultValue } : { eraLockResult: resultValue });
      return;
    }

    // Both tracks locked — reveal the pre-determined result and apply bonuses.
    if (!drillPending) {
      set({ teamLockResult: nextTeamLock, eraLockResult: nextEraLock, currentSpin: null, spinState: 'pre' });
      return;
    }

    const rerollBonus = nextTeamLock === 'hit' ? DRILL_TEAM_LOCK_REROLL_BONUS : 0;
    const ovrBonus = nextEraLock === 'hit' ? DRILL_ERA_LOCK_OVR_BONUS : 0;

    set({
      teamLockResult: nextTeamLock,
      eraLockResult: nextEraLock,
      lockedTeam: drillPending.nextLockedTeam,
      currentSpin: drillPending.spin,
      drillPending: null,
      // playerIndex: 0, — disabled, see rollSpin() above: no auto-selected
      // "top rated player" on reveal, selection is user-tap-driven only.
      spinState: 'revealed',
      rerollsRemaining: get().rerollsRemaining + rerollBonus,
      drillOvrBonusPending: ovrBonus,
    });
  },

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
    const index = get().playerIndex;
    if (pool.length === 0 || index < 0) return null;
    return pool[index % pool.length];
  },

  // index < 0 explicitly clears the selection (no candidate highlighted) —
  // this is never called with a negative index automatically/on-reveal, only
  // from the user tapping a row, so there's no auto-suggested "top rated
  // player" default. Don't clamp negative values up to 0 here.
  setPlayerIndex: (index) => {
    const poolSize = get().currentCandidates().length;
    if (index < 0 || poolSize <= 0) {
      set({ playerIndex: -1 });
      return;
    }
    const clampedIndex = Math.min(index, poolSize - 1);
    set({ playerIndex: clampedIndex });
  },

  assignPlayerToPosition: (position) => {
    const { roster, currentPlayer, openPositions, drillOvrBonusPending } = get();

    if (!openPositions().includes(position)) return;

    const player = currentPlayer();
    if (!player) return;

    const eligiblePositions = player.eligiblePositions ?? [];
    if (!eligiblePositions.includes(position)) return;

    // Two-Minute Drill era-lock bonus: a one-time OVR boost on this pick only.
    const boostedRating = drillOvrBonusPending > 0 ? player.rating + drillOvrBonusPending : player.rating;
    const nextRoster = { ...roster, [position]: { ...player, position, rating: boostedRating } };
    const draftedCount = DRAFT_POSITIONS.filter((slot) => nextRoster[slot]).length;
    const isComplete = draftedCount >= DRAFT_POSITIONS.length;

    set({
      roster: nextRoster,
      positionIndex: Math.min(draftedCount, DRAFT_POSITIONS.length - 1),
      // playerIndex: 0, — disabled, see rollSpin() above: don't auto-select
      // the next round's top-rated candidate either.
      currentSpin: null,
      drillOvrBonusPending: 0,
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
      playerIndex: -1, // -1 = no candidate selected (see setPlayerIndex)
      roster: {},
      isComplete: false,
      teamLockResult: 'pending',
      eraLockResult: 'pending',
      drillPending: null,
      drillOvrBonusPending: 0,
    }),
}));
