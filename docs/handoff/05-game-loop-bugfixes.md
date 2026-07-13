# 05 — Game loop bugfixes (play-test findings)

Found by tracing the actual code paths in `gameStore.ts`, `dynastyStore.ts`,
`GameScreen.tsx`, and `ResultScreen.tsx` end to end — not visual testing,
a full read-through of every state transition in the Setup → Spin →
Draft → Sim → Result loop and the Dynasty pack/season loop. These are
real gaps between what the app claims to do and what the code actually
does, not style issues.

Fix in priority order below — the first two break the stated promise of
a flagship feature each; the second two are real but narrower.

---

## P0 — Daily Challenge isn't actually deterministic

**Claim** (Home screen copy): *"Same spins for everyone · 1 attempt"*

**Reality:** two bugs, both need fixing for the claim to be true.

1. `pickSpinResult()` in `gameStore.ts` picks from `playableCombos` with
   plain `Math.random()`, unconditionally, regardless of `mode`. No
   date-based seed exists anywhere in the spin logic.
2. `simulateSeason()` in `ResultScreen.tsx` also uses plain
   `Math.random()` for every game's win/loss roll. Even if the draft
   spins were fixed, two players with identical Daily rosters would
   still get different season simulation outcomes.

**Fix approach:**

- Add a small seeded PRNG (mulberry32 or equivalent — no need for a
  crypto-grade generator, just deterministic given a numeric seed).
  Put it in a new `src/utils/seededRandom.ts`.
- Derive the seed from the current date (e.g. `YYYYMMDD` as a number)
  plus a call-specific salt (round index for spins, game index for the
  season sim) so each of the 12 draft rounds and 20 simulated games gets
  a distinct-but-reproducible value rather than one seed producing the
  same result 32 times in a row.
- Thread this through `pickSpinResult()` and `simulateSeason()`: when
  `mode === 'daily'`, use the seeded generator; every other mode keeps
  plain `Math.random()`. Don't seed non-Daily modes — Classic/IQ/Timer/
  Challenge should stay genuinely random.
- Verify: two separate sessions run on the same calendar day with
  `mode: 'daily'` produce an identical sequence of spins and an
  identical season result grid, given the same starting position order.
  The next calendar day should produce a different (but again, that
  day's players' still-identical-to-each-other) sequence.

### Acceptance criteria
- [ ] `seededRandom.ts` created, unit-testable in isolation
- [ ] Daily-mode spins are reproducible within the same day, differ
      day to day
- [ ] Daily-mode season simulation results are reproducible within the
      same day
- [ ] Classic/IQ/Timer/Challenge modes are unaffected — confirm they
      still use unseeded randomness

---

## P0 — Dynasty season loop isn't connected to gameplay

This is bigger than "progression doesn't update" — tracing it back
further, there's no route from playing a season to Dynasty at all yet.

**What's missing, concretely:**

- There is no `'dynasty'` value in `GameMode` (`gameStore.ts` only has
  `'daily' | 'classic' | 'iq' | 'timer'`). Nothing marks a draft session
  as "this one counts toward my dynasty."
- `DynastyHomeScreen`'s "Start season N+1" button calls
  `startNextSeason()` only — it doesn't navigate anywhere. It increments
  `currentSeason` and clears `activePerks`, but never actually starts a
  draft/spin session. There's currently no way to reach `GameScreen` for
  a season that will affect the Dynasty roster.
- `ResultScreen.tsx` only ever writes to `statsStore` (via
  `recordResult`) and conditionally mints Rings when `mode === 'daily'`.
  It never touches `useDynastyStore`'s `allTimeRecord`, `dynastyXP`, or
  `dynastyLevel` for any mode, including a hypothetical Dynasty run.
- Net effect: `dynastyLevel`, `dynastyXP`, and `allTimeRecord` are set
  once at store initialization (`1`, `0`, `{0, 0}`) and never change
  again, no matter how many seasons get played or packs opened.

**Fix approach:**

1. Add `'dynasty'` to `GameMode` in `gameStore.ts`.
2. `DynastyHomeScreen`'s "Start season N+1" button should call
   `startNextSeason()` **and** navigate into the draft flow with
   `mode: 'dynasty'` (`setMode('dynasty')` then route to `Spin`,
   mirroring how other modes kick off from `HomeScreen`'s `startGame()`).
3. In `ResultScreen.tsx`, when `mode === 'dynasty'`:
   - Write the season's win/loss record into
     `useDynastyStore`'s `allTimeRecord` (add wins/losses, don't
     overwrite).
   - Award `dynastyXP` for the season (amount is a
     `TODO_BALANCE`-style placeholder — don't invent a real number,
     follow the existing pattern in `dynastyStore.ts` of named
     placeholder constants).
   - When `dynastyXP` crosses `xpToNextLevel`, increment
     `dynastyLevel` and roll over the remainder XP. Decide/confirm
     whether `xpToNextLevel` scales with level (e.g. a fixed multiplier
     per level) — this wasn't specified in `03-legacy-mode.md` and
     needs a value, flag it rather than guessing a curve.
   - Consider whether the drafted roster from this session should feed
     `useDynastyStore`'s persistent `roster` (via
     `addPulledPlayerToRoster` or similar), or whether the persistent
     Dynasty roster is *only* built through packs, and a Dynasty
     "season" is a separate draft-and-sim run scored against your
     standing roster. This is a real product question, not an
     implementation detail — the original Legacy mode concept
     (`03-legacy-mode.md`) describes the drafted roster *as* the
     persistent one, but the current separate `gameStore.roster` vs.
     `dynastyStore.roster` split suggests these may have diverged.
     > DECISION NEEDED: confirm which model is intended before wiring
     > this up — it changes what `startNextSeason` should actually do
     > with the just-completed `gameStore.roster`.

### Acceptance criteria
- [ ] `'dynasty'` added as a `GameMode`
- [ ] "Start season N+1" actually routes into a playable draft session
- [ ] Completing a Dynasty-mode season updates `allTimeRecord` and
      `dynastyXP`/`dynastyLevel` in `dynastyStore`
- [ ] Roster-carryover model (drafted roster IS the dynasty roster, vs.
      pack-built roster is separate from season runs) is confirmed with
      the user before implementation, not assumed

---

## P1 — Gridiron IQ mode has no gameplay effect

**Claim** (Home screen copy): *"Stats hidden"*

**Reality:** `hideStats` is implemented as a prop on `PlayerCard.tsx`,
but that component is never imported or rendered anywhere in the app —
it's dead code left over from an earlier draft-screen implementation.
The live draft screen, `GameScreen.tsx`, always renders
`candidate.rating` directly in the player list (`metricValue` /
`metricLabel` in the row card) with no mode check at all. Selecting
Gridiron IQ currently produces a draft screen visually and functionally
identical to Classic.

**Fix approach:**

- In `GameScreen.tsx`, read `mode` from `useGameStore()` (already
  destructured, just currently unused for this purpose) and
  conditionally hide the OVR display — both in the row card
  (`metricValue`/`metricLabel`) and in `PlayerDetailPanel` (check that
  component too, it likely also surfaces rating).
- Decide what Gridiron IQ shows *instead* of OVR — nothing, a vague
  qualitative tag (e.g. "Starter" / "Depth"), or era/team info only.
  The original design says "trust your instincts," which implies
  showing nothing rating-related, but confirm before assuming.
  > DECISION NEEDED: exact IQ-mode fallback display.
- `PlayerCard.tsx` — once `GameScreen.tsx` has its own inline hideStats
  handling, decide whether to delete `PlayerCard.tsx` entirely (if
  confirmed dead) or actually adopt it as the real row component (see
  next section, this may be the same decision).

### Acceptance criteria
- [ ] Gridiron IQ mode visibly and functionally differs from Classic in
      the draft screen — OVR is not shown
- [ ] `PlayerDetailPanel` also respects the mode's hideStats rule, not
      just the list row

---

## P1 (decision needed first) — Pass/keep mechanic is dead code

`passPlayer`, `passesUsed`, and `maxPasses()` exist in `gameStore.ts`
and are fully implemented there, but nothing in `GameScreen.tsx` calls
or displays any of them. The live draft screen is "browse the full
candidate list for the open position, tap any eligible candidate,
assign to any eligible open slot" — a different interaction model than
the one-at-a-time keep-or-pass flow these fields were built for (and
which the project README describes as the core mechanic).

> DECISION NEEDED, don't guess: was the shift to "browse and pick" an
> intentional design upgrade over the original keep-or-pass flow, or
> did the pass-limit mechanic get dropped by accident during the
> browse-list implementation? This determines the fix:
> - **If intentional:** delete `passPlayer`, `passesUsed`, `maxPasses()`
>   from `gameStore.ts`, delete `PlayerCard.tsx` (superseded by the row
>   card in `GameScreen.tsx`), and remove `MAX_PASSES_BY_MODE` — it's
>   dead weight once nothing reads it. Mode differentiation (Daily vs.
>   Classic vs. IQ) then rests entirely on Daily's determinism (P0
>   above) and IQ's hidden stats (P1 above), not pass limits.
> - **If it was meant to stay:** the browse-list UI needs either a
>   per-position pass-limit affordance added to it, or Daily/Classic/IQ
>   need a different UI-level enforcement of `maxPasses()` altogether
>   (e.g. capping how many *times* a player can change their selection
>   before committing). This is a real UX design question, not just a
>   wiring fix — don't bolt pass-counting onto the browse-list UI
>   without deciding what limiting a "browse and pick" flow should even
>   mean.

### Acceptance criteria
- [ ] Explicit decision recorded (in code comments or this doc) on
      which direction was taken, before either deleting or reconnecting
      the pass mechanic
- [ ] No orphaned dead code left in `gameStore.ts` either way — either
      it's actually used, or it's removed
