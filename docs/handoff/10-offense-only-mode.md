# 10 — Replace Gridiron IQ with Offense Only mode

**Gridiron IQ is retired, not patched.** Following `09-ovr-visibility-
reversal.md`'s finding that IQ lost its differentiator (OVR visible
everywhere, identical sort order to every other mode), the user opted
to replace the mode slot entirely rather than invent a new
differentiator for it. Don't implement anything from doc 09's "possible
IQ differentiator" discussion — it's superseded by this doc.

## The mode

**Offense Only** — same core draft/spin/pick loop as every other mode,
restricted to a 9-slot offense-heavy roster instead of the standard
12-slot offense+defense roster:

| Slot | Count |
|---|---|
| QB | 2 |
| RB | 2 |
| WR | 2 |
| TE | 1 |
| FLEX | 2 |

No defensive positions at all. Confirmed via the codebase check above:
this needs no changes to `simulateSeasonResults()` in `seasonSim.ts` —
it only ever consumes a single `avgRating` number, so a 9-slot roster's
average just gets computed the same way a 12-slot one does today.

## Why this over the earlier IQ-fix ideas

Cheaper and lower-risk than the alternatives discussed
(zero-reroll IQ, decision-timer IQ, Budget Draft, Mystery Draft):
reuses the entire existing draft/spin/pick flow unchanged, and the
FLEX/FLEX2 precedent in `data/players.ts` already establishes the
pattern needed for duplicate-position slots — this isn't new
architecture, it's the same architecture with a different position
list.

## Implementation

### `data/players.ts`

- Add `'QB2' | 'RB2' | 'WR2'` to the `Position` union (or `'QB1'`/`'QB2'`
  etc. if renaming the existing singular slots feels cleaner — Claude
  Code's call, just be consistent with the FLEX/FLEX2 naming style
  already established).
- Add matching entries to the position-eligibility map, identical to
  their singular counterparts — e.g. `QB2` eligible pool = same as
  `QB`'s.
- Note `FLEX`/`FLEX2` already accept `['RB', 'WR', 'TE']` — decide
  whether Offense Only's FLEX slots should also accept the new
  `QB2`-adjacent pool or stay RB/WR/TE-only like today. Recommend
  staying RB/WR/TE-only (unchanged) unless there's a reason to widen
  it — don't expand FLEX eligibility as a side effect of this mode
  without a specific reason to.

### `gameStore.ts`

- Rename or replace the `'iq'` `GameMode` value — recommend renaming
  to something like `'offense'` rather than leaving a mode literally
  named `iq` that has nothing to do with hidden information anymore.
  Update `MAX_PASSES_BY_MODE` and any other mode-keyed maps
  accordingly (most of these should already be dead/irrelevant per
  earlier docs, but check for stragglers).
- Confirm the round counter and position-iteration logic are driven by
  the active mode's position list length, not a hardcoded `12` —
  Offense Only needs to correctly show "Round X / 9", not "X / 12".
  If round count is hardcoded anywhere, that's a pre-existing bug this
  mode will expose, not something new to build around.

### UI copy

- `HomeScreen.tsx`'s mode card: replace the Gridiron IQ
  `CallSheetPill`/`ModeCard` entry (`tag="stats off"` per
  `01-home-screen.md`) with an Offense Only entry — new icon, tag
  something like "9 rounds · no defense" instead of "stats off".
- Any other screen referencing "Gridiron IQ" by name (Game Setup,
  mode-selection copy elsewhere) needs the same swap — search the
  codebase for the literal string rather than assuming it's only in
  `HomeScreen.tsx`.

## What this doc does NOT change

- The spin mechanic itself (team/era per round) is unchanged — only
  the position slot list assigned to differs.
- Two-Minute Drill, Classic, Daily, Challenge are all unaffected.
- The universal year-then-name sort order from `09` still applies here
  too — Offense Only doesn't get its own sort rule.

## Acceptance criteria

- [ ] `Position` type extended with the new duplicate-position slots,
      following the FLEX/FLEX2 naming precedent
- [ ] `simulateSeasonResults()` requires no changes — verify a 9-slot
      average feeds it correctly, don't fork the sim function
- [ ] Round counter correctly shows out of 9, not 12, in this mode
- [ ] `'iq'` GameMode value is renamed or fully repurposed, not left
      as a confusingly-named leftover
- [ ] Every UI surface referencing "Gridiron IQ" is updated to Offense
      Only — search the full codebase, not just Home
- [ ] FLEX slot eligibility is unchanged (RB/WR/TE only) unless a
      specific reason to widen it is given
