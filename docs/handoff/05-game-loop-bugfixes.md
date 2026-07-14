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

**Fix approach — superseded by the resolved decision above; kept here
for history.** The original plan assumed a Dynasty season would route
through an actual draft/spin session (steps 1-2 below). That's not the
model that was implemented — `startNextSeason()` computes results
directly from the standing pack-built roster with no draft step. Steps
3 (write results back to `dynastyStore`) is the part that's actually
relevant and is now done.

1. ~~Add `'dynasty'` to `GameMode` in `gameStore.ts`.~~ Not needed —
   Dynasty seasons don't go through `gameStore` at all.
2. ~~`DynastyHomeScreen`'s "Start season N+1" button should... route to
   `Spin`.~~ Not needed, same reason. It correctly just calls
   `startNextSeason()` directly.
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
     standing roster.
     > **RESOLVED (confirmed with user, implemented):** persistent
     > roster is built via packs only. A Dynasty "season" has no draft
     > step of its own — `startNextSeason()` simulates games directly
     > against the current pack-built roster's average rating. This
     > matches `03-legacy-mode.md`'s original description. See
     > `dynastyStore.ts`'s `startNextSeason()` implementation and its
     > inline comment for the authoritative record of this decision.

### Acceptance criteria — updated to match the resolved model
- [x] Roster-carryover model confirmed with the user: pack-built roster
      only, no draft step for Dynasty seasons
- [x] Completing a Dynasty season (`startNextSeason()`) updates
      `allTimeRecord` and `dynastyXP`/`dynastyLevel` in `dynastyStore`
- [ ] `xpToNextLevel` scaling curve is still a flat placeholder
      (`TODO_BALANCE_DYNASTY_SEASON_XP`) — confirm a real progression
      formula when ready, not urgent

---

## P1 — Gridiron IQ mode has no gameplay effect

**Claim** (Home screen copy): *"Stats hidden"*

**Reality:** `hideStats` was implemented as a prop on the now-deleted
`PlayerCard.tsx` and never reached the live draft screen. The live
`GameScreen.tsx` always renders `candidate.rating` (OVR) as the
prominent metric in every row, regardless of mode.

> **RESOLVED — full spec (confirmed with user):** this turned out to be
> bigger than "hide OVR in IQ mode." New rule, all modes:
>
> - **OVR is no longer shown by default anywhere.** It becomes a
>   scouting tool revealed only through a perk (see below), not a
>   baseline display.
> - **Classic / Daily / Timer ("stats visible")** show real
>   **position-specific stats** instead of OVR. This data already
>   exists — `formatStats()` in `src/data/players.ts` builds a real,
>   per-position stat line from actual career numbers (completions/
>   pass yards/pass TD/INT/rush yards for QB; rush yards/TD/receptions
>   for RB; receptions/targets/rec yards/rec TD/YAC for WR/TE/FLEX;
>   tackles/sacks/TFL/QB hits for EDGE/DT; tackles/TFL/sacks/INT for
>   LB; tackles/INT/PD/FF/DEF TD/sacks for CB/S/D-FLEX). This is
>   already computed onto `Player.stats` for every candidate — it's
>   just not the *emphasized* number in the row card today (OVR is,
>   in `metricValue`/`metricLabel`). No new per-position stat design
>   work is needed; this is a display-priority swap, not new data
>   plumbing.
> - **Gridiron IQ ("stats hidden")** shows none of the above — no
>   `.stats` line, no OVR. Name, team, years, position badge only.
> - **OVR reveal mechanic:** this is the same "Scouting Report" perk
>   already proposed in `03-legacy-mode.md` (originally scoped as
>   "reveals hidden OVR in a Gridiron IQ-style Legacy run") — extend
>   its scope to apply in any mode, not just IQ. Don't design a second,
>   separate OVR-reveal mechanic; this is one feature.

**Fix approach:**

- In `GameScreen.tsx`'s row card, swap the `metricValue`/`metricLabel`
  slot: default state shows `candidate.stats` (already computed, just
  change which field renders there) instead of `candidate.rating`/`OVR`.
- Add a mode check: when `mode === 'iq'`, render neither `.stats` nor
  `.rating` in that slot — omit it entirely rather than showing an
  empty state.
- `PlayerDetailPanel.tsx` — check whether it separately surfaces
  `.rating` anywhere and apply the same default-hidden rule there too.
- OVR reveal via the Scouting Report perk is a Dynasty-mode-only
  concern for now (perks are scoped to Dynasty seasons per
  `03-legacy-mode.md`) — Classic/Daily/Timer/IQ outside of Dynasty
  simply never show OVR going forward, full stop, no reveal path. If a
  non-Dynasty OVR-reveal path is wanted later, that's a new scope, not
  assumed here.

### Acceptance criteria
- [ ] Classic/Daily/Timer show the real per-position `.stats` line
      where OVR used to be
- [ ] Gridiron IQ shows neither `.stats` nor OVR — visibly and
      functionally different from the other three modes
- [ ] OVR is not shown anywhere by default, in any mode, outside of the
      Scouting Report perk's effect during a Dynasty season
- [ ] `PlayerDetailPanel.tsx` follows the same rule, not just the list
      row card

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
