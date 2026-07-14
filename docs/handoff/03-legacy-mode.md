# 03 — Legacy mode (dynasty, Rings, packs, Hall of Fame)

Reference: sections 2 and 3 of `gridiron-legends-legacy-concepts.html`
(Legacy home tab, pack opening screen — the pack-opening interaction in
that file is a working JS demo, use it as the reveal-flow reference).

This is the largest piece of this handoff and has the most open game-
design decisions. **Build the data layer and navigation shell first,
and stop for confirmation before implementing anything marked
`> DECISION NEEDED` below** — those are economy/balance calls the user
explicitly hasn't finalized yet.

## Concept summary

Every other mode (Classic, Gridiron IQ, Challenge, Two-Minute Drill) is
one-and-done: draft a roster, sim 20 games, get a record, reset. Legacy
mode is persistent — the roster carries forward across "seasons"
instead of resetting, and players spend an earned currency (**Rings**)
on **packs** to add or upgrade players and season-long **perks** between
seasons. Retired players move to a **Hall of Fame** shelf.

## New state: `legacyStore.ts`

Follow the existing `gameStore.ts` / `statsStore.ts` pattern — a new
Zustand store, not new fields bolted onto `gameStore`, since Legacy's
lifecycle (persists across many game sessions) is fundamentally
different from `gameStore`'s per-run state.

```ts
export interface LegacyRoster {
  // same shape as gameStore's roster: Partial<Record<Position, Player>>
  // but persisted, not reset between sessions
}

export interface HallOfFameEntry {
  player: Player;
  retiredAtSeason: number;
  careerRecord: string; // e.g. "34-6"
}

export interface OwnedPack {
  id: string;
  type: 'player' | 'perk';
}

interface LegacyState {
  dynastyLevel: number;
  dynastyXP: number;
  xpToNextLevel: number;
  rings: number;
  allTimeRecord: { wins: number; losses: number };
  currentSeason: number;
  roster: LegacyRoster;
  hallOfFame: HallOfFameEntry[];
  ownedPacks: OwnedPack[];
  activePerks: string[]; // perk ids active for the current season

  startNextSeason: () => void;
  earnRings: (amount: number, source: string) => void;
  openPack: (packId: string) => PackPullResult;
  retirePlayer: (position: Position) => void;
}
```

> DECISION NEEDED: persistence layer. `AsyncStorage` (RN) is listed as
> a dependency already (`@react-native-async-storage/async-storage` in
> `package.json`), which would work for local persistence, but confirm
> whether Legacy progress needs to survive a reinstall / sync across
> devices before deciding local-only vs. a real backend. The README's
> "Product Direction" section already lists Supabase + Fastify as a
> planned backend milestone — Legacy mode may be the actual trigger for
> building that, not something to fake with local storage and migrate
> later. Flag this back to the user rather than picking silently.

## Rings currency

Single soft currency, no second premium currency for now (keeps the
economy simple to explain and balance).

Earn sources (from the design discussion, not yet numerically balanced):
- Season record (wins, undefeated bonus, win streaks)
- Daily Challenge completion
- Milestones (season-count thresholds, first Hall of Fame retirement,
  etc.)

> DECISION NEEDED: actual Rings payout amounts per source, and whether
> Two-Minute Drill's lock-in bonuses (doc 02) also mint Rings. Stub
> `earnRings()` calls with a `TODO_BALANCE` constant, don't invent real
> numbers.

## Packs

Two pack types, visually and functionally distinct — keep them as
separate types/components, not one generic "Pack" with a type flag
threaded through every function, since their reveal content and pull
tables are unrelated.

**Player packs** — pull a random player at a rarity tier, reusing the
OVR-band logic that presumably already exists for player generation in
`data/players.ts` / `data_generator/`. Rarity tiers for pack pulls:
common / rare / elite / legend (map to new `Colors.rarityCommon` /
`rarityRare` / `rarityElite` / `rarityLegend` tokens from doc 00).

- **Dupe protection**: pulling a player already in the Legacy roster or
  Hall of Fame should convert to a Rings refund or upgrade material,
  not a wasted duplicate card. Exact conversion value is a
  `> DECISION NEEDED`.

**Perk packs** — pull a season-long modifier, not a player. Candidate
perks discussed (none finalized — implement as data-driven entries in a
`PERKS` table, not hardcoded branches, so the list can grow without
touching pack-opening logic):

```ts
interface Perk {
  id: string;
  name: string;
  description: string;
  effect: PerkEffect; // discriminated union, see below
}
```

Candidates: extra reroll every round for the season ("Two-a-Days"), a
sim win-probability boost for N games ("Homefield Advantage"), immunity
to one forced low-OVR pick per season ("Iron Man"), reveal hidden OVR
in a Gridiron IQ-style Legacy run ("Scouting Report" — scope expanded
by `05-game-loop-bugfixes.md`: OVR is hidden by default in *every*
mode now, not just Gridiron IQ, so this perk's actual value is reveal-
ing OVR during a Dynasty season regardless of which underlying mode
it's paired with), protect one
roster slot from downgrade on a bad spin ("Cap Insurance").

> DECISION NEEDED: full perk list and each perk's mechanical effect
> needs product sign-off before implementation — these are gameplay-
> balance decisions, not just UI. Build the `Perk` interface and pack-
> opening flow generically enough to accept whatever list is finalized,
> but don't ship guessed effect values.

## Season transition ("Start Season N")

> DECISION NEEDED, blocks implementation: does the persistent roster
> carry over completely untouched between seasons, or do some slots
> reset/degrade (an aging curve) each season? This materially changes
> what `startNextSeason()` does and needs to be settled before writing
> it — a pure-accumulation model (roster only ever gets better) is a
> much simpler implementation than one with decay, but the design
> conversation flagged this as an open question specifically because
> unlimited accumulation may not stay interesting. Confirm with the
> user before building either version.

## Screens

New screens needed, following existing `screens/` pattern:

- `LegacyHomeScreen.tsx` — dynasty overview (level/XP progress bar,
  roster snapshot strip, HOF teaser, Rings balance, "Open packs" /
  "Start season N" CTAs). Has its own sub-tab-bar (Dynasty / Roster /
  Packs / HOF) — this is a nested nav inside Legacy, separate from the
  app's top-level tab bar, so it likely needs its own nested navigator
  or simple internal tab state rather than polluting
  `RootStackParamList` with four more top-level routes.
- `PackOpeningScreen.tsx` — pack type selector, tap-to-open reveal,
  rarity-coded result card, "Open another" / "Add to roster" actions.
- `HallOfFameScreen.tsx` — not detailed in the mockups yet; scope this
  as a simple list view of `hallOfFame` entries for now, revisit visual
  design later.

### Acceptance criteria

- [ ] `legacyStore.ts` created, decoupled from `gameStore.ts`
- [ ] Persistence approach confirmed with user before building (see
      decision above) — don't default to AsyncStorage silently if a
      backend is actually intended
- [ ] Pack pull logic is data-driven (rarity table, perk table), not
      hardcoded per-pull branches
- [ ] Dupe protection implemented for player pack pulls
- [ ] No Rings payout, pack odds, or perk effect values are shipped
      without explicit confirmation — all such numbers are named
      constants clearly marked as placeholders until confirmed
- [ ] Legacy banner on home screen (doc 01) only renders once this
      store exists and has real data to show
