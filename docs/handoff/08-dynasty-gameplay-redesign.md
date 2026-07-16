# 08 — Dynasty mode gameplay redesign

**This supersedes the Dynasty roster/season model previously resolved in
`03-legacy-mode.md` and `05-game-loop-bugfixes.md` (P0, "Dynasty season
loop isn't connected to gameplay").** That earlier model — persistent
roster built entirely through packs, no draft step ever, seasons
computed instantly from average roster rating — is replaced by the
design below. Don't implement or reference the old model; where the
older docs describe it, treat this doc as the current source of truth
for Dynasty's core loop.

## Why this changed

The old model technically worked but had no gameplay moment — "Start
Season" was a button tap that instantly produced a record with no
draft, no spin, nothing to actually play. Discussed directly with the
user: the goal for Dynasty is "similar to Classic, but not a one-time
throwaway roster" — Classic's actual draft-and-play loop, persistent
instead of resetting every run. This redesign makes the initial roster
build a real Classic-style draft, and turns packs into the ongoing
evolution mechanism afterward, rather than the only acquisition path
from the start.

## The loop, end to end

### 1. Initial draft (once per Dynasty save)

The first time a player enters Dynasty mode with no existing roster,
"Start Dynasty" routes into the **same Spin → Draft flow Classic uses**
— reuse `gameStore.ts`'s existing `beginDraftSession` /
`pickSpinResult` / draft machinery wholesale, don't reimplement it.
Add a `'dynasty'` value to `GameMode` in `gameStore.ts` (this reverses
the earlier decision to omit it — it's needed again for this specific
one-time flow, not for every season).

- Full 12-round draft, same UI/UX as Classic (`GameScreen.tsx`
  unchanged).
- On completion, `ResultScreen.tsx` (when `mode === 'dynasty'`):
  writes the drafted roster into `dynastyStore`'s persistent `roster`
  (all 12 starting positions filled at once, replacing the old
  pack-only `addPulledPlayerToRoster`-only path), then immediately
  simulates **season 1** game-by-game (see point 2) using that roster,
  and awards season-end packs (see point 4) same as any other season.
  This means there's no separate "draft, then separately start season
  1" step — completing the initial draft *is* playing season 1.

### 2. Every season after that — no draft, real simulation

`DynastyHomeScreen`'s "Start season N+1" continues to *not* route
through a draft (that part of the old model was right) — it uses the
current persistent starting roster as-is. What changes:

> **Season record must come from actually simulating the season
> game-by-game**, the same simulation logic `ResultScreen.tsx` already
> uses for Classic/Daily/etc (`simulateSeasonResults` or equivalent),
> not the current instant single average-rating calculation in
> `dynastyStore.ts`'s `startNextSeason()`. Reuse that simulation
> function directly — don't fork a second implementation of "simulate
> a season" for Dynasty.

This was explicitly confirmed with the user as a requirement, not an
optional nice-to-have.

### 3. Bench — new roster concept

Dynasty roster now has two parts:
- **Starters** — the 12 positions that count toward season simulation
  strength, unchanged in structure from `DynastyRoster`.
- **Bench** — a new **shared pool of 5-6 slots, any position** (not
  1-per-position). Add `bench: Player[]` (capped at
  `BENCH_CAPACITY = 6` — mark as a named constant, this exact number
  wasn't hard-locked by the user beyond "5-6," pick 6 and leave it easy
  to tune) to `DynastyState` / `PersistedDynastyState` in
  `dynastyStore.ts`.
- **Bench does not affect season simulation.** Only the 12 starters'
  average rating feeds `simulateSeasonResults`. Confirmed explicitly.
- **Bench is manually manageable at any time**, not just at
  pack-pull/draft time — add a swap action (e.g.
  `swapStarterWithBench(position, benchPlayerId)`) and expose it from
  `DynastyHomeScreen`'s roster tab, not only from the pack-opening flow.

### 4. End-of-season packs — the new primary acquisition path

At the end of every season (including season 1, per point 1), award
free packs automatically — don't gate the core progression loop behind
the Rings economy, which is currently near-nonexistent (see prior
play-test findings: only real Rings source in the whole game is the
15/day Daily Challenge).

> TODO_BALANCE: exact reward wasn't locked down beyond "one or two
> packs" — implement as a named constant
> (`TODO_BALANCE_SEASON_END_PACKS`), suggested default **1 player pack
> + 1 perk pack per season**, easy to retune. Rings-purchased packs
> (`buyPack()`, already implemented) remain available as a bonus
> accelerant on top of this, unchanged.

### 5. Pack pull resolution — Start, Bench, or the displaced-starter choice

When a player pack pull is **not** a duplicate (duplicate-check must
now also cover the bench, not just starters + Hall of Fame — update
`isDuplicate()` accordingly), present the player with a choice:

- **Bench it** — goes straight into the bench pool. If the bench is
  already full (6/6), the player must first choose to release/retire
  one existing bench occupant to make room (or decline to keep the new
  pull at all — don't force a specific resolution, let them pick which
  player leaves).
- **Start it** — replaces whoever currently holds that position in the
  starting 12. The displaced starter does **not** auto-resolve — per
  the user's explicit call, the player always manually chooses where
  the displaced starter goes: **bench** (subject to the same
  full-bench rule above) or **retire to Hall of Fame** (reuses the
  existing `retirePlayer` flow/reward).

This needs a new modal/screen step in `PackOpeningScreen.tsx` — pulling
a player is no longer just "reveal card, tap Add to Roster," it's
reveal → choose start/bench → (if start and position occupied) choose
what happens to the displaced player → (if bench and bench is full)
choose who gets released. Don't collapse these into fewer taps than
that; each is a real decision the user asked for.

## What this doc does NOT change

- Perk packs and the perk system (`03-legacy-mode.md`) — unaffected,
  still season-scoped, still pulled the same way.
- Hall of Fame retirement mechanics/rewards — unaffected by this doc;
  still owes a fix per `07-phase2-design-gap-analysis.md` (no payout
  currently implemented), just not part of this redesign.
- Rings-purchased packs (`buyPack`) — still exist as-is, just no longer
  the *only* pack source.
- Dynasty's XP/level system — unaffected, still awards
  `TODO_BALANCE_DYNASTY_SEASON_XP` per season regardless of record.

## Acceptance criteria

- [ ] `'dynasty'` re-added to `GameMode`, used only for the one-time
      initial draft, not subsequent seasons
- [ ] Initial draft reuses `gameStore.ts`'s existing Spin/Draft flow
      with zero forked duplicate logic
- [ ] Completing the initial draft immediately plays out season 1's
      simulation and awards season-end packs — it's not a separate
      manual step
- [ ] Every season's win/loss record comes from real game-by-game
      simulation (shared function with Classic/Daily), not an instant
      average-rating shortcut
- [ ] `bench: Player[]` added to `dynastyStore`, capped at
      `BENCH_CAPACITY`, persisted same as `roster`
- [ ] Bench has zero effect on season simulation strength — verify by
      testing that benching your best player doesn't change the sim
      output
- [ ] Starter/bench swaps are available any time from the roster tab,
      not gated behind pack-opening moments
- [ ] `isDuplicate()` checks bench in addition to starters + Hall of
      Fame
- [ ] Pack-pull flow has explicit start-vs-bench and
      displaced-player-goes-where steps — not collapsed into one tap
- [ ] Full-bench edge case forces a release/retire choice rather than
      silently failing or silently overwriting
