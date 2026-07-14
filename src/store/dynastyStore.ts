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
import { pullRandomPerk } from '../data/perks';
import { simulateSeasonResults } from '../utils/seasonSim';
import { todaySeedBase } from '../utils/seededRandom';

export type DynastyRoster = Partial<Record<Position, Player>>;

export interface HallOfFameEntry {
  player: Player;
  retiredAtSeason: number;
  careerRecord: string;
}

export type PackType = 'player' | 'perk';

export interface OwnedPack {
  id: string;
  type: PackType;
}

export type PackPullResult =
  | { type: 'player'; player: Player; rarity: PackRarity; duplicate: false }
  | { type: 'player'; rarity: PackRarity; duplicate: true; ringsRefund: number }
  | { type: 'perk'; perkId: string; perkName: string };

// TODO_BALANCE: none of the amounts below are confirmed game balance — see
// docs/handoff/03-legacy-mode.md > DECISION NEEDED ("Rings currency",
// "Packs"). Stubbed as named placeholders per that doc's instruction not to
// invent real numbers; update these constants once product signs off.
export const TODO_BALANCE_RINGS_SOURCES = {
  dailyChallengeCompletion: 15,
} as const;

export const TODO_BALANCE_PACK_COST_RINGS: Record<PackType, number> = {
  player: 100,
  perk: 60,
};

// XP awarded for completing a Dynasty season, regardless of record — not
// confirmed game balance (docs/handoff/05-game-loop-bugfixes.md, P0).
export const TODO_BALANCE_DYNASTY_SEASON_XP = 250;

// dynastyLevel / dynastyXP are part of the state shape the handoff doc
// specifies, but the doc names no XP-earning source at all (only Rings
// sources are discussed) — so nothing feeds XP yet rather than guessing a
// formula. Starts at Level 1 / 0 XP until a real source is confirmed.
const XP_PER_LEVEL = 1000;

interface DynastyState {
  dynastyLevel: number;
  dynastyXP: number;
  xpToNextLevel: number;
  rings: number;
  allTimeRecord: { wins: number; losses: number };
  currentSeason: number;
  roster: DynastyRoster;
  hallOfFame: HallOfFameEntry[];
  ownedPacks: OwnedPack[];
  activePerks: string[];
  lastDailyClaimDate: number | null;

  earnRings: (amount: number, source: string) => void;
  buyPack: (type: PackType) => boolean;
  openPack: (packId: string) => PackPullResult | null;
  addPulledPlayerToRoster: (player: Player) => void;
  retirePlayer: (position: Position) => void;
  startNextSeason: () => void;
  // Gate for Daily Challenge's Rings/stats reward — the ticker's "1 attempt"
  // claim wasn't actually enforced anywhere, so replaying Daily kept
  // re-minting Rings for an identical (seeded) result. Returns true the
  // first time it's called on a given calendar day, false on any repeat.
  claimDailyChallenge: () => boolean;
  // Wipes all Dynasty progress back to a fresh save (Level 1, no roster,
  // no Rings). Dev/testing affordance for now — see DynastyHomeScreen's
  // __DEV__-gated button — there's no player-facing confirmation UX yet.
  resetDynasty: () => void;
}

const INITIAL_DYNASTY_STATE: PersistedDynastyState = {
  dynastyLevel: 1,
  dynastyXP: 0,
  xpToNextLevel: XP_PER_LEVEL,
  rings: 0,
  allTimeRecord: { wins: 0, losses: 0 },
  currentSeason: 1,
  roster: {},
  hallOfFame: [],
  ownedPacks: [],
  activePerks: [],
  lastDailyClaimDate: null,
};

function toRosterPlayer(packPlayer: PackPlayer): Player {
  return {
    id: packPlayer.id,
    name: packPlayer.name,
    team: packPlayer.team,
    years: packPlayer.era,
    stats: '',
    rating: packPlayer.rating,
    tier: ratingToTier(packPlayer.rating),
    position: packPlayer.position,
    eligiblePositions: [packPlayer.position],
  };
}

function isDuplicate(roster: DynastyRoster, hallOfFame: HallOfFameEntry[], playerId: string): boolean {
  const inRoster = Object.values(roster).some((player) => player?.id === playerId);
  const inHallOfFame = hallOfFame.some((entry) => entry.player.id === playerId);
  return inRoster || inHallOfFame;
}

function makePackId(type: PackType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STORAGE_KEY = 'dynasty-store';

// Fields persisted to AsyncStorage — the action functions below aren't
// serializable and are re-created by `create` on every load.
type PersistedDynastyState = Omit<
  DynastyState,
  | 'earnRings' | 'buyPack' | 'openPack' | 'addPulledPlayerToRoster' | 'retirePlayer'
  | 'startNextSeason' | 'claimDailyChallenge' | 'resetDynasty'
>;

const PERSISTED_KEYS: (keyof PersistedDynastyState)[] = [
  'dynastyLevel', 'dynastyXP', 'xpToNextLevel', 'rings', 'allTimeRecord',
  'currentSeason', 'roster', 'hallOfFame', 'ownedPacks', 'activePerks',
  'lastDailyClaimDate',
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

      buyPack: (type) => {
        const cost = TODO_BALANCE_PACK_COST_RINGS[type];
        const { rings } = get();
        if (rings < cost) return false;
        set({ rings: rings - cost, ownedPacks: [...get().ownedPacks, { id: makePackId(type), type }] });
        return true;
      },

      openPack: (packId) => {
        const pack = get().ownedPacks.find((p) => p.id === packId);
        if (!pack) return null;

        const remainingPacks = get().ownedPacks.filter((p) => p.id !== packId);

        if (pack.type === 'perk') {
          const perk = pullRandomPerk();
          set((s) => ({
            ownedPacks: remainingPacks,
            activePerks: s.activePerks.includes(perk.id) ? s.activePerks : [...s.activePerks, perk.id],
          }));
          return { type: 'perk', perkId: perk.id, perkName: perk.name };
        }

        const pulled = pullPlayerPack();
        if (!pulled) {
          set({ ownedPacks: remainingPacks });
          return null;
        }

        const { roster, hallOfFame } = get();
        if (isDuplicate(roster, hallOfFame, pulled.id)) {
          set((s) => ({ ownedPacks: remainingPacks, rings: s.rings + TODO_BALANCE_DUPE_REFUND_RINGS }));
          return { type: 'player', rarity: pulled.rarity, duplicate: true, ringsRefund: TODO_BALANCE_DUPE_REFUND_RINGS };
        }

        set({ ownedPacks: remainingPacks });
        return { type: 'player', player: toRosterPlayer(pulled), rarity: pulled.rarity, duplicate: false };
      },

      addPulledPlayerToRoster: (player) => set((s) => ({
        roster: { ...s.roster, [player.position]: player },
      })),

      retirePlayer: (position) => {
        const { roster, currentSeason, allTimeRecord, hallOfFame } = get();
        const player = roster[position];
        if (!player) return;

        const nextRoster = { ...roster };
        delete nextRoster[position];

        set({
          roster: nextRoster,
          hallOfFame: [
            ...hallOfFame,
            {
              player,
              retiredAtSeason: currentSeason,
              careerRecord: `${allTimeRecord.wins}-${allTimeRecord.losses}`,
            },
          ],
        });
      },

      // Pure-accumulation model (confirmed): the roster carries over
      // completely untouched. Perks are season-scoped, so they clear here.
      //
      // Roster-carryover model (docs/handoff/05-game-loop-bugfixes.md, P0
      // DECISION NEEDED — confirmed with the user): Dynasty has no draft
      // step of its own. A "season" simulates games directly against the
      // current pack-built roster, matching 03-legacy-mode.md's original
      // description (roster grows only via packs) rather than routing
      // through gameStore's Spin/Draft flow.
      startNextSeason: () => {
        const { roster, allTimeRecord, dynastyXP, xpToNextLevel, dynastyLevel } = get();
        const rosterEntries = Object.values(roster).filter((p): p is Player => !!p);

        if (rosterEntries.length === 0) {
          // Nothing pulled from packs yet — nothing to simulate against,
          // but the season counter and perk reset still advance.
          set((s) => ({ currentSeason: s.currentSeason + 1, activePerks: [] }));
          return;
        }

        // Mirrors ResultScreen.tsx's team-strength calc: average of filled
        // slots only, unfilled positions don't drag the rating down.
        const avgRating = Math.round(
          rosterEntries.reduce((sum, p) => sum + p.rating, 0) / rosterEntries.length,
        );
        const results = simulateSeasonResults(avgRating);
        const wins = results.filter(Boolean).length;
        const losses = results.length - wins;

        // xpToNextLevel scaling per level isn't specified in 03-legacy-mode.md
        // or 05-game-loop-bugfixes.md — kept flat (never changes) rather than
        // guessing a curve; revisit once product confirms a progression
        // formula.
        let nextXP = dynastyXP + TODO_BALANCE_DYNASTY_SEASON_XP;
        let nextLevel = dynastyLevel;
        while (nextXP >= xpToNextLevel) {
          nextXP -= xpToNextLevel;
          nextLevel += 1;
        }

        set((s) => ({
          allTimeRecord: { wins: allTimeRecord.wins + wins, losses: allTimeRecord.losses + losses },
          dynastyXP: nextXP,
          dynastyLevel: nextLevel,
          currentSeason: s.currentSeason + 1,
          activePerks: [],
        }));
      },
  }),
);

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    useDynastyStore.setState(JSON.parse(raw) as Partial<DynastyState>);
  })
  .catch(() => {});

useDynastyStore.subscribe((state) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersistedState(state))).catch(() => {});
});
