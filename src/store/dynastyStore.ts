// Dynasty mode data layer (docs/handoff/03-legacy-mode.md, referred to in
// that doc as "Legacy mode" — renamed Dynasty throughout per product
// direction). A separate Zustand store from gameStore.ts, not fields
// bolted onto it: Dynasty's roster persists across many sessions instead
// of resetting per run, so its lifecycle is fundamentally different.
//
// Persistence: local-only via AsyncStorage (confirmed — Dynasty progress
// does not need to survive a reinstall or sync across devices yet; the
// planned Supabase + Fastify backend is not a prerequisite for this).
// Hand-rolled load/save instead of zustand's `persist` middleware: that
// middleware ships bundled with its `devtools` sibling (both live in the
// single compiled zustand/middleware.js — there's no subpath to import
// just persist), and devtools references `import.meta.env`. Metro's web
// bundle isn't loaded as an ES module, so that throws
// "Cannot use 'import.meta' outside a module" at runtime and blanks the
// whole app.
//
// Season model: pure accumulation (confirmed) — the roster only ever
// improves season over season, no aging/decay curve.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player, Position, ratingToTier } from '../data/players';
import { pullPlayerPack, PackPlayer, PackRarity, TODO_BALANCE_DUPE_REFUND_RINGS } from '../data/packs';
import { todaySeedBase } from '../utils/seededRandom';

export type DynastyRoster = Partial<Record<Position, Player>>;

export interface HallOfFameEntry {
  player: Player;
  retiredAtSeason: number;
  careerRecord: string;
}

// Perk packs are retired for now — every pack is a player pack, so
// ownedPacks is just a fungible count rather than an array of typed
// objects (nothing distinguishes one pack from another anymore).
export type PackPullResult =
  | { player: Player; rarity: PackRarity; duplicate: false }
  | { rarity: PackRarity; duplicate: true; ringsRefund: number };

export type PackPlacement = 'start' | 'bench';
export interface PackResolution {
  player: Player;
  placement: PackPlacement;
}

// TODO_BALANCE: none of the amounts below are confirmed game balance — see
// docs/handoff/03-legacy-mode.md > DECISION NEEDED ("Rings currency",
// "Packs"). Stubbed as named placeholders per that doc's instruction not to
// invent real numbers; update these constants once product signs off.
export const TODO_BALANCE_RINGS_SOURCES = {
  dailyChallengeCompletion: 15,
} as const;

export const TODO_BALANCE_PACK_COST_RINGS = 100;

// docs/handoff/08-dynasty-gameplay-redesign.md > point 3: shared pool, any
// position, 5-6 slots — exact count wasn't locked beyond "5-6", picked 6.
export const BENCH_CAPACITY = 6;

// docs/handoff/08-dynasty-gameplay-redesign.md > point 4: exact reward
// wasn't locked down beyond "one or two packs" — named constant, easy to
// retune once product signs off. Each pack now opens PACK_CARD_COUNT cards
// (data/packs.ts), so this is packs, not individual cards.
export const TODO_BALANCE_SEASON_END_PACKS = 1;

// Confirmed with the user: completing the one-time initial draft awards
// more packs than a normal season-end (2 vs. 1) since the fresh 12-player
// roster has no bench depth at all yet and packs are the only way to build
// it. Replaces, not adds to, the normal per-season pack award for season 1
// specifically — see completeInitialDraft().
export const TODO_BALANCE_INITIAL_DRAFT_BONUS_PACKS = 2;

interface DynastyState {
  rings: number;
  allTimeRecord: { wins: number; losses: number };
  // Dynasty's progression counter (replaces the earlier dynastyLevel/XP
  // system, which had no confirmed XP-earning source or leveling curve).
  // Starts at 1; increments by exactly 1 each time a season is simulated
  // (applySeasonOutcome, run once per "Start season" / initial draft) — one
  // season per simulation, not a points-accumulation metric.
  currentSeason: number;
  roster: DynastyRoster;
  bench: Player[];
  hallOfFame: HallOfFameEntry[];
  ownedPacks: number;
  lastDailyClaimDate: number | null;

  earnRings: (amount: number, source: string) => void;
  buyPack: () => boolean;
  // Opens one pack, returning its PACK_CARD_COUNT card results (or null if
  // no pack is owned). Duplicate cards are auto-resolved into Rings here;
  // non-duplicate cards are placed via resolvePackPulls() once the player
  // has chosen start-or-bench for each.
  openPack: () => PackPullResult[] | null;
  // One-time initial-draft completion (docs/handoff/08, point 1): writes the
  // full 12-slot drafted roster in one shot (replacing whatever pack-only
  // roster existed, which for a fresh save is nothing), then immediately
  // applies season 1's outcome using the results ResultScreen.tsx already
  // simulated — not a second simulation pass.
  completeInitialDraft: (roster: DynastyRoster, results: boolean[]) => void;
  // Applies an already-simulated season's outcome for every season after
  // the first — ResultScreen.tsx now runs the same simulate-and-reveal flow
  // for "Start season N" as it does for the initial draft (confirmed with
  // the user), computing `results` itself from the current roster and
  // handing them here rather than this store simulating a second time.
  applyNextSeasonResults: (results: boolean[]) => void;
  // Bench management (docs/handoff/08, point 3) — the Roster tab
  // (RosterManager.tsx) is a staged editor: every Bench/Start/Retire/
  // Release action there only mutates local component state, and this is
  // the single atomic commit that lands the whole edit session at once.
  // `retiredPlayers` covers both starters retired and bench players
  // released — both go to the Hall of Fame the same way.
  commitLineup: (roster: DynastyRoster, bench: Player[], retiredPlayers: Player[]) => void;
  // Batch-applies a whole pack's worth of start/bench choices in one shot
  // (confirmed with the user: all cards from a pack are shown together with
  // a forced choice per card + a single "save" commit, not a sequential
  // per-card decision chain). A "start" that displaces a current starter
  // auto-benches the displaced player; if the bench is already full (either
  // from that displacement or a "bench" placement), the lowest-rated bench
  // occupant is auto-released to Hall of Fame to make room.
  resolvePackPulls: (resolutions: PackResolution[]) => void;
  // Gate for Daily Challenge's Rings/stats reward — the ticker's "1 attempt"
  // claim wasn't actually enforced anywhere, so replaying Daily kept
  // re-minting Rings for an identical (seeded) result. Returns true the
  // first time it's called on a given calendar day, false on any repeat.
  claimDailyChallenge: () => boolean;
  // Wipes all Dynasty progress back to a fresh save (Season 1, no roster,
  // no Rings). Dev/testing affordance for now — see DynastyHomeScreen's
  // __DEV__-gated button — there's no player-facing confirmation UX yet.
  resetDynasty: () => void;
}

const INITIAL_DYNASTY_STATE: PersistedDynastyState = {
  rings: 0,
  allTimeRecord: { wins: 0, losses: 0 },
  currentSeason: 1,
  roster: {},
  bench: [],
  hallOfFame: [],
  ownedPacks: 0,
  lastDailyClaimDate: null,
};

function toRosterPlayer(packPlayer: PackPlayer): Player {
  return {
    id: packPlayer.id,
    name: packPlayer.name,
    team: packPlayer.team,
    years: packPlayer.era,
    stats: packPlayer.stats,
    rating: packPlayer.rating,
    tier: ratingToTier(packPlayer.rating),
    position: packPlayer.position,
    eligiblePositions: [packPlayer.position],
  };
}

// Duplicate-check now also covers the bench, not just starters + Hall of
// Fame (docs/handoff/08, point 5).
function isDuplicate(roster: DynastyRoster, bench: Player[], hallOfFame: HallOfFameEntry[], playerId: string): boolean {
  const inRoster = Object.values(roster).some((player) => player?.id === playerId);
  const inBench = bench.some((player) => player.id === playerId);
  const inHallOfFame = hallOfFame.some((entry) => entry.player.id === playerId);
  return inRoster || inBench || inHallOfFame;
}

function makeHallOfFameEntry(
  player: Player,
  currentSeason: number,
  allTimeRecord: { wins: number; losses: number },
): HallOfFameEntry {
  return {
    player,
    retiredAtSeason: currentSeason,
    careerRecord: `${allTimeRecord.wins}-${allTimeRecord.losses}`,
  };
}

// Shared by applyNextSeasonResults() and completeInitialDraft()
// (docs/handoff/08, acceptance criteria) so win/pack bookkeeping only lives
// in one place — callers (ResultScreen.tsx, for every season) are
// responsible for producing `results` via simulateSeasonResults, this only
// applies the outcome. `packAward` defaults to the normal per-season amount;
// completeInitialDraft() passes the larger one-time draft bonus instead.
function applySeasonOutcome(
  state: Pick<DynastyState, 'allTimeRecord' | 'currentSeason' | 'ownedPacks'>,
  results: boolean[],
  packAward: number = TODO_BALANCE_SEASON_END_PACKS,
): Pick<DynastyState, 'allTimeRecord' | 'currentSeason' | 'ownedPacks'> {
  const wins = results.filter(Boolean).length;
  const losses = results.length - wins;

  return {
    allTimeRecord: {
      wins: state.allTimeRecord.wins + wins,
      losses: state.allTimeRecord.losses + losses,
    },
    currentSeason: state.currentSeason + 1,
    ownedPacks: state.ownedPacks + packAward,
  };
}

// Bench is full — auto-release the lowest-rated occupant to make room
// rather than blocking the incoming player or asking a separate question
// per card (confirmed with the user: pack resolution is a single batched
// choice, not a sequential decision chain).
function makeRoomOnBench(
  bench: Player[],
  hallOfFame: HallOfFameEntry[],
  currentSeason: number,
  allTimeRecord: { wins: number; losses: number },
  incoming: Player,
): { bench: Player[]; hallOfFame: HallOfFameEntry[] } {
  if (bench.length < BENCH_CAPACITY) {
    return { bench: [...bench, incoming], hallOfFame };
  }
  let lowestIndex = 0;
  bench.forEach((player, i) => {
    if (player.rating < bench[lowestIndex].rating) lowestIndex = i;
  });
  const released = bench[lowestIndex];
  const nextBench = [...bench.slice(0, lowestIndex), ...bench.slice(lowestIndex + 1), incoming];
  return { bench: nextBench, hallOfFame: [...hallOfFame, makeHallOfFameEntry(released, currentSeason, allTimeRecord)] };
}

const STORAGE_KEY = 'dynasty-store';

// Fields persisted to AsyncStorage — the action functions below aren't
// serializable and are re-created by `create` on every load.
type PersistedDynastyState = Omit<
  DynastyState,
  | 'earnRings' | 'buyPack' | 'openPack'
  | 'applyNextSeasonResults' | 'claimDailyChallenge' | 'resetDynasty' | 'completeInitialDraft'
  | 'commitLineup' | 'resolvePackPulls'
>;

const PERSISTED_KEYS: (keyof PersistedDynastyState)[] = [
  'rings', 'allTimeRecord', 'currentSeason', 'roster', 'bench',
  'hallOfFame', 'ownedPacks', 'lastDailyClaimDate',
];

function pickPersistedState(state: DynastyState): PersistedDynastyState {
  const result = {} as PersistedDynastyState;
  for (const key of PERSISTED_KEYS) {
    (result as Record<string, unknown>)[key] = state[key];
  }
  return result;
}

export const useDynastyStore = create<DynastyState>()(
  (set, get) => ({
      ...INITIAL_DYNASTY_STATE,

      earnRings: (amount) => set((s) => ({ rings: s.rings + amount })),

      resetDynasty: () => {
        set(INITIAL_DYNASTY_STATE);
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      },

      claimDailyChallenge: () => {
        const today = todaySeedBase();
        if (get().lastDailyClaimDate === today) return false;
        set({ lastDailyClaimDate: today });
        return true;
      },

      buyPack: () => {
        const { rings, ownedPacks } = get();
        if (rings < TODO_BALANCE_PACK_COST_RINGS) return false;
        set({ rings: rings - TODO_BALANCE_PACK_COST_RINGS, ownedPacks: ownedPacks + 1 });
        return true;
      },

      openPack: () => {
        const { ownedPacks, roster, bench, hallOfFame } = get();
        if (ownedPacks <= 0) return null;

        const pulled = pullPlayerPack();
        const results: PackPullResult[] = pulled.map((card) =>
          isDuplicate(roster, bench, hallOfFame, card.id)
            ? { rarity: card.rarity, duplicate: true, ringsRefund: TODO_BALANCE_DUPE_REFUND_RINGS }
            : { player: toRosterPlayer(card), rarity: card.rarity, duplicate: false },
        );
        const ringsRefund = results.reduce((sum, r) => sum + (r.duplicate ? r.ringsRefund : 0), 0);

        set((s) => ({ ownedPacks: s.ownedPacks - 1, rings: s.rings + ringsRefund }));
        return results;
      },

      completeInitialDraft: (roster, results) => {
        set((s) => ({ roster, ...applySeasonOutcome(s, results, TODO_BALANCE_INITIAL_DRAFT_BONUS_PACKS) }));
      },

      // Pure-accumulation model (confirmed): the roster carries over
      // completely untouched — this never touches `roster`/`bench`.
      applyNextSeasonResults: (results) => {
        set((s) => applySeasonOutcome(s, results));
      },

      commitLineup: (roster, bench, retiredPlayers) => {
        const { currentSeason, allTimeRecord, hallOfFame } = get();
        const newEntries = retiredPlayers.map((player) =>
          makeHallOfFameEntry(player, currentSeason, allTimeRecord),
        );
        set({ roster, bench, hallOfFame: [...hallOfFame, ...newEntries] });
      },

      resolvePackPulls: (resolutions) => {
        const { currentSeason, allTimeRecord } = get();
        let nextRoster = { ...get().roster };
        let nextBench = get().bench;
        let nextHallOfFame = get().hallOfFame;

        resolutions.forEach(({ player, placement }) => {
          if (placement === 'start') {
            const displaced = nextRoster[player.position];
            nextRoster = { ...nextRoster, [player.position]: player };
            if (displaced) {
              const room = makeRoomOnBench(nextBench, nextHallOfFame, currentSeason, allTimeRecord, displaced);
              nextBench = room.bench;
              nextHallOfFame = room.hallOfFame;
            }
          } else {
            const room = makeRoomOnBench(nextBench, nextHallOfFame, currentSeason, allTimeRecord, player);
            nextBench = room.bench;
            nextHallOfFame = room.hallOfFame;
          }
        });

        set({ roster: nextRoster, bench: nextBench, hallOfFame: nextHallOfFame });
      },
  }),
);

// Pre-pack-redesign saves persisted `ownedPacks` as an array of `{id, type}`
// pack objects (and had an `activePerks` field that no longer exists) —
// coerce old shapes on load so a stale save from before this change doesn't
// clobber the fresh `ownedPacks: number` initial state with an array that
// then gets rendered directly as a React child.
function migratePersistedState(raw: unknown): Partial<DynastyState> {
  if (!raw || typeof raw !== 'object') return {};
  const data = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(data.ownedPacks)) {
    data.ownedPacks = data.ownedPacks.length;
  } else if (typeof data.ownedPacks !== 'number') {
    data.ownedPacks = 0;
  }

  delete data.activePerks;
  // dynastyLevel/dynastyXP/xpToNextLevel are retired — Seasons (currentSeason)
  // is now the one progression counter. Strip them from old saves so they
  // don't linger in AsyncStorage forever.
  delete data.dynastyLevel;
  delete data.dynastyXP;
  delete data.xpToNextLevel;

  return data as Partial<DynastyState>;
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    useDynastyStore.setState(migratePersistedState(JSON.parse(raw)));
  })
  .catch(() => {});

useDynastyStore.subscribe((state) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersistedState(state))).catch(() => {});
});
