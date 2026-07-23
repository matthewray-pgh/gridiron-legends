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
import { GeneratedEra, Player, Position, ratingToTier } from '../data/players';
import {
  pullPlayerPack, PackPlayer, PackRarity, PackTierId, PACK_TIERS,
  TODO_BALANCE_DUPE_REFUND_RINGS, TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS,
} from '../data/packs';
import { isNextConsecutiveDay, todaySeedBase } from '../utils/seededRandom';

export type DynastyRoster = Partial<Record<Position, Player>>;

export interface HallOfFameEntry {
  player: Player;
  retiredAtSeason: number;
  careerRecord: string;
}

// Where a pending pack came from — shown in the Shop's My Packs tab
// (docs/handoff/gridiron-legends-shop-mockups.html: "Purchased · Season 6",
// "Season reward · Season 7").
export type PackSource = 'purchase' | 'season_reward' | 'draft_bonus';

// Packs are individually tracked again (not a fungible per-tier count):
// an era-locked pack pulls from a narrower pool than an unlocked pack of the
// same tier, so two "Pro Pack" entries aren't interchangeable once one of
// them is era-locked — each needs its own identity to remember that.
export interface OwnedPack {
  id: string;
  tierId: PackTierId;
  eraLock?: GeneratedEra;
  acquiredSeason: number;
  source: PackSource;
}

export function totalOwnedPacks(ownedPacks: OwnedPack[]): number {
  return ownedPacks.length;
}

let packIdCounter = 0;
function makeOwnedPack(tierId: PackTierId, acquiredSeason: number, source: PackSource, eraLock?: GeneratedEra): OwnedPack {
  packIdCounter += 1;
  return { id: `pack_${Date.now()}_${packIdCounter}`, tierId, acquiredSeason, source, eraLock };
}

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
//
// dailyChallengeCompletion bumped 15 -> 40: at 15/day a Rookie pack (100)
// took ~7 days and Legend (650) ~44 days with no other earn source, making
// the Shop feel decorative for weeks. 40/day brings that to ~2.5/7/16 days
// (Rookie/Pro/Legend) — still a real grind, not a rate change to pack costs.
export const TODO_BALANCE_RINGS_SOURCES = {
  dailyChallengeCompletion: 40,
} as const;

// docs/handoff/08-dynasty-gameplay-redesign.md > point 3: shared pool, any
// position, 5-6 slots — exact count wasn't locked beyond "5-6", picked 6.
export const BENCH_CAPACITY = 6;

// docs/handoff/08-dynasty-gameplay-redesign.md > point 4: exact reward
// wasn't locked down beyond "one or two packs" — named constant, easy to
// retune once product signs off. Each pack now opens PACK_CARD_COUNT cards
// (data/packs.ts), so this is packs, not individual cards.
export const TODO_BALANCE_SEASON_END_PACKS = 1;

// docs/handoff/13-ad-monetization-economy.md, section 3 — the season-end
// pack's count stays TODO_BALANCE_SEASON_END_PACKS (1) always; watching the
// ad only upgrades that same pack's tier, never adds a second pack (so this
// can't double as a quantity-inflation lever on top of
// TODO_BALANCE_INITIAL_DRAFT_BONUS_PACKS). No ad path to Legend from this
// placement — top tier stays reserved for milestone/HOF-retirement
// progression so it doesn't feel ad-farmable once per season.
export const TODO_BALANCE_SEASON_END_PACK_TIER = {
  base: 'rookie',
  adUpgrade: 'pro',
} satisfies Record<'base' | 'adUpgrade', PackTierId>;

// docs/handoff/13-ad-monetization-economy.md, section 1 — Shop's always-
// available "Watch an ad for Rings" button. Reward scales on a daily
// watch streak rather than a flat per-watch amount. Two open questions the
// doc left undecided are resolved here as the simplest options (both
// explicitly "not decided" in the doc, confirmed with the user for this
// pass): a missed calendar day fully resets the streak to Day 1 rather than
// a softer partial rollback, and the Day 7+ reward holds flat forever
// rather than creeping upward — either alternative needs an extra invented
// number (how many tiers to roll back, or a creep rate/ceiling) that
// nothing in the doc specifies. Proposed values, not confirmed game
// balance — product sign-off still needed before real use.
export const TODO_BALANCE_SHOP_AD_STREAK_RINGS = {
  day1: 15,
  day2: 25,
  day3: 35,
  day4: 50,
  day5: 65,
  day6: 80,
  day7Plus: 100,
} as const;

export const TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY = 3;

function shopAdStreakRingsForDay(streakDay: number): number {
  const table = TODO_BALANCE_SHOP_AD_STREAK_RINGS;
  if (streakDay <= 1) return table.day1;
  if (streakDay === 2) return table.day2;
  if (streakDay === 3) return table.day3;
  if (streakDay === 4) return table.day4;
  if (streakDay === 5) return table.day5;
  if (streakDay === 6) return table.day6;
  return table.day7Plus;
}

// Shared by watchShopAdForRings() and computeShopAdPreview() so the "what
// happens if I watch right now" preview the Shop UI shows before the watch
// can't drift from what actually happens on watch. Same-day repeat watches
// don't advance the streak (only the first watch of a new calendar day
// does); a gap of more than one calendar day resets to Day 1.
function nextShopAdStreakDay(lastWatchDate: number | null, streakDay: number, today: number): number {
  if (lastWatchDate === today) return streakDay;
  if (lastWatchDate !== null && isNextConsecutiveDay(lastWatchDate, today)) return streakDay + 1;
  return 1;
}

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
  ownedPacks: OwnedPack[];
  lastDailyClaimDate: number | null;
  // Shop ad-streak (docs/handoff/13, section 1). lastShopAdWatchDate +
  // shopAdWatchesToday gate the per-day watch cap; shopAdStreakDay is the
  // TODO_BALANCE_SHOP_AD_STREAK_RINGS lookup, reset to 1 whenever a
  // calendar day is skipped between watches.
  shopAdStreakDay: number;
  lastShopAdWatchDate: number | null;
  shopAdWatchesToday: number;

  earnRings: (amount: number, source: string) => void;
  // eraLock adds TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS to the tier's base
  // cost and narrows that pack's own pull pool once opened — the odds
  // themselves are unaffected (data/packs.ts pullPlayerPack).
  buyPack: (tierId: PackTierId, eraLock?: GeneratedEra) => boolean;
  // Opens the given pack instance, returning its PACK_CARD_COUNT card
  // results (or null if that pack id isn't owned). Duplicate cards are
  // auto-resolved into Rings here; non-duplicate cards are placed via
  // resolvePackPulls() once the player has chosen start-or-bench for each.
  openPack: (packId: string) => PackPullResult[] | null;
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
  // `packTierId` defaults to TODO_BALANCE_SEASON_END_PACK_TIER.base (Rookie)
  // — ResultScreen passes the ad-upgrade tier explicitly once the player has
  // made that choice (docs/handoff/13, section 3).
  applyNextSeasonResults: (results: boolean[], packTierId?: PackTierId) => void;
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
  // Shop's "watch an ad for Rings" button (docs/handoff/13, section 1).
  // Caller is responsible for checking computeShopAdPreview()'s
  // watchesRemainingToday before invoking this (that's what the button's
  // disabled state is driven by) — this only re-derives the same gate
  // itself and returns 0 (no-op) if it's somehow called past the cap.
  // Returns the Rings amount actually earned.
  watchShopAdForRings: () => number;
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
  ownedPacks: [],
  lastDailyClaimDate: null,
  shopAdStreakDay: 0,
  lastShopAdWatchDate: null,
  shopAdWatchesToday: 0,
};

// Pure preview of what watchShopAdForRings() would do right now, without
// mutating anything — the Shop button needs this to show "Day N · +R
// Rings" and disable itself once the daily cap is hit, before the player
// commits to watching.
export function computeShopAdPreview(
  state: Pick<DynastyState, 'lastShopAdWatchDate' | 'shopAdStreakDay' | 'shopAdWatchesToday'>,
): { watchesRemainingToday: number; nextStreakDay: number; nextReward: number } {
  const today = todaySeedBase();
  const isNewDay = state.lastShopAdWatchDate !== today;
  const watchesToday = isNewDay ? 0 : state.shopAdWatchesToday;
  const nextStreakDay = nextShopAdStreakDay(state.lastShopAdWatchDate, state.shopAdStreakDay, today);
  return {
    watchesRemainingToday: Math.max(0, TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY - watchesToday),
    nextStreakDay,
    nextReward: shopAdStreakRingsForDay(nextStreakDay),
  };
}

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
  packSource: PackSource = 'season_reward',
  packTierId: PackTierId = TODO_BALANCE_SEASON_END_PACK_TIER.base,
): Pick<DynastyState, 'allTimeRecord' | 'currentSeason' | 'ownedPacks'> {
  const wins = results.filter(Boolean).length;
  const losses = results.length - wins;
  const nextSeason = state.currentSeason + 1;
  // Season-end packs default to Rookie tier; ResultScreen passes
  // TODO_BALANCE_SEASON_END_PACK_TIER.adUpgrade instead once the player
  // watches the ad (docs/handoff/13, section 3). Draft-bonus packs
  // (completeInitialDraft) never pass a tier override, so they stay Rookie
  // always. Never era-locked either way — higher tiers and era locks are
  // ring purchases only, not a reward source (yet).
  const newPacks = Array.from({ length: packAward }, () => makeOwnedPack(packTierId, nextSeason, packSource));

  return {
    allTimeRecord: {
      wins: state.allTimeRecord.wins + wins,
      losses: state.allTimeRecord.losses + losses,
    },
    currentSeason: nextSeason,
    ownedPacks: [...state.ownedPacks, ...newPacks],
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
  | 'commitLineup' | 'resolvePackPulls' | 'watchShopAdForRings'
>;

const PERSISTED_KEYS: (keyof PersistedDynastyState)[] = [
  'rings', 'allTimeRecord', 'currentSeason', 'roster', 'bench',
  'hallOfFame', 'ownedPacks', 'lastDailyClaimDate',
  'shopAdStreakDay', 'lastShopAdWatchDate', 'shopAdWatchesToday',
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

      // docs/handoff/14-reset-icon-rewards-undefeated.md, section 1: Rings
      // are the one balance a reset doesn't touch — everything else (roster,
      // bench, record, Hall of Fame, owned packs, season counter) goes back
      // to a fresh Season 1. The removeItem then setItem (rather than a
      // single write) is deliberate, not redundant: it wipes the old save
      // wholesale first, then writes the preserved Rings balance back on its
      // own, so a crash between the two calls fails safe (an empty save, not
      // a corrupt partial one).
      resetDynasty: () => {
        const { rings } = get();
        set({ ...INITIAL_DYNASTY_STATE, rings });
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersistedState(get()))).catch(() => {});
      },

      claimDailyChallenge: () => {
        const today = todaySeedBase();
        if (get().lastDailyClaimDate === today) return false;
        set({ lastDailyClaimDate: today });
        return true;
      },

      watchShopAdForRings: () => {
        const { lastShopAdWatchDate, shopAdStreakDay, shopAdWatchesToday, rings } = get();
        const today = todaySeedBase();
        const isNewDay = lastShopAdWatchDate !== today;
        const watchesToday = isNewDay ? 0 : shopAdWatchesToday;
        if (watchesToday >= TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY) return 0;

        const nextStreakDay = nextShopAdStreakDay(lastShopAdWatchDate, shopAdStreakDay, today);
        const reward = shopAdStreakRingsForDay(nextStreakDay);

        set({
          rings: rings + reward,
          lastShopAdWatchDate: today,
          shopAdWatchesToday: watchesToday + 1,
          shopAdStreakDay: nextStreakDay,
        });
        return reward;
      },

      buyPack: (tierId, eraLock) => {
        const tier = PACK_TIERS.find((t) => t.id === tierId);
        if (!tier) return false;
        const cost = tier.cost + (eraLock ? TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS : 0);
        const { rings, ownedPacks, currentSeason } = get();
        if (rings < cost) return false;
        set({
          rings: rings - cost,
          ownedPacks: [...ownedPacks, makeOwnedPack(tierId, currentSeason, 'purchase', eraLock)],
        });
        return true;
      },

      openPack: (packId) => {
        const { ownedPacks, roster, bench, hallOfFame } = get();
        const pack = ownedPacks.find((p) => p.id === packId);
        if (!pack) return null;
        const tier = PACK_TIERS.find((t) => t.id === pack.tierId);
        if (!tier) return null;

        const pulled = pullPlayerPack(tier, pack.eraLock);
        const results: PackPullResult[] = pulled.map((card) =>
          isDuplicate(roster, bench, hallOfFame, card.id)
            ? { rarity: card.rarity, duplicate: true, ringsRefund: TODO_BALANCE_DUPE_REFUND_RINGS }
            : { player: toRosterPlayer(card), rarity: card.rarity, duplicate: false },
        );
        const ringsRefund = results.reduce((sum, r) => sum + (r.duplicate ? r.ringsRefund : 0), 0);

        set((s) => ({
          ownedPacks: s.ownedPacks.filter((p) => p.id !== packId),
          rings: s.rings + ringsRefund,
        }));
        return results;
      },

      completeInitialDraft: (roster, results) => {
        set((s) => ({
          roster,
          ...applySeasonOutcome(s, results, TODO_BALANCE_INITIAL_DRAFT_BONUS_PACKS, 'draft_bonus'),
        }));
      },

      // Pure-accumulation model (confirmed): the roster carries over
      // completely untouched — this never touches `roster`/`bench`.
      applyNextSeasonResults: (results, packTierId) => {
        set((s) => applySeasonOutcome(s, results, undefined, undefined, packTierId));
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

// ownedPacks has gone through a few shapes before the current per-instance
// array: pre-pack-redesign saves had it as an array of `{id, type}` pack
// objects (plus an `activePerks` field that no longer exists), and
// pre-Shop saves had it as a single flat number (one pack "type" only, no
// tiers, no era locks). Coerce both old shapes into that many fresh Rookie
// packs on load — the original tier/source/season of a legacy pack isn't
// recoverable, but treating it as a Rookie season-reward pack is a safe
// default (Rookie is the only tier those old saves could have meant).
function migratePersistedState(raw: unknown): Partial<DynastyState> {
  if (!raw || typeof raw !== 'object') return {};
  const data = { ...(raw as Record<string, unknown>) };
  const currentSeason = typeof data.currentSeason === 'number' ? data.currentSeason : 1;

  if (Array.isArray(data.ownedPacks)) {
    const looksCurrent = data.ownedPacks.length === 0
      || (typeof data.ownedPacks[0] === 'object' && data.ownedPacks[0] !== null && 'tierId' in (data.ownedPacks[0] as object));
    data.ownedPacks = looksCurrent
      ? data.ownedPacks
      : data.ownedPacks.map(() => makeOwnedPack('rookie', currentSeason, 'season_reward'));
  } else if (typeof data.ownedPacks === 'number') {
    data.ownedPacks = Array.from({ length: data.ownedPacks }, () => makeOwnedPack('rookie', currentSeason, 'season_reward'));
  } else {
    data.ownedPacks = [];
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
