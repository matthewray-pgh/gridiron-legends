# 11 — Dynasty roster management restructure

Two related fixes to `RosterManager.tsx` (`useRosterEditor` hook +
`RosterList` component): a data-model bug that's blocking correct
position tracking, and a redesigned selection interface that fixes it
properly instead of working around it.

## 1. Root cause: `.position` gets overwritten at assignment time

Confirmed in the current code (`RosterManager.tsx`, comment above
`startFromBench`): **a player's `.position` field is being set to
whatever slot they're drafted or pack-pulled into**, not their true
position. A WR drafted into a FLEX slot ends up with
`.position === 'FLEX'` permanently — the system forgets it was ever a
WR. This is why re-starting a benched player only ever offers their
original slot back: `.position` is being used as "the one correct
target slot" (per the code comment), which only works if it's never
allowed to mean anything else.

**Fix:** `.position` must always be the player's true, permanent
native position (whatever the underlying player-pool data says — e.g.
`'WR'`), set once and never overwritten by which roster slot they
happen to occupy. Audit every place currently doing
`player.position = <slot>` at draft time, pack-pull time
(`PackOpeningScreen.tsx`), or roster reassignment, and remove that
mutation. The roster's own data structure (`Record<Position, Player>`,
keyed by slot) already tracks *which slot* a player occupies — that's
sufficient, `.position` doesn't also need to encode it.

## 2. Eligibility logic — new, currently doesn't exist

With `.position` fixed to mean "true position," slot-filling needs
real eligibility logic instead of the current 1:1 assumption. Two new
helper functions, both driven by the eligibility map already defined
in `data/players.ts` (`FLEX: ['RB','WR','TE']`, etc. — generalize it
so exact-match slots like `'QB'` are just an eligibility array of one):

```ts
// Which starter slots in the current roster could this player legally fill?
function getEligibleSlots(player: Player, roster: DynastyRoster): Position[]

// Which bench players could legally fill this specific starter slot?
function getEligibleBenchCandidates(pos: Position, bench: Player[]): Player[]
```

Both must check real eligibility, not just "same position string" —
e.g. a TE is eligible for `FLEX`/`FLEX2` but not for the strict `WR`
slot; a WR sitting in `FLEX` can swap into the native `WR` slot only if
whoever's *there* is also eligible for `FLEX` (swaps must be validated
in both directions — the player moving in and the player being
displaced both need to legally fit where they're each ending up).

## 3. New interface: the detail panel becomes the move picker

Confirmed with the user: touching a player still opens the existing
detail panel (stats, etc.) — but instead of blunt `Bench`/`Start` +
`Retire` buttons, the panel now shows a **list of valid moves specific
to that player**, computed from the eligibility functions above. This
replaces `selectedActions` in `useRosterEditor` — it's no longer a
fixed 2-action array, it's dynamically built per selection.

**Bench player selected** — list one row per eligible slot:
- Slot is empty → `"Start at {SLOT}"` — tapping fills it directly, no
  displaced player.
- Slot is occupied → `"Swap with {Name} — {SLOT}"` — tapping swaps
  them: selected player takes the slot, the slot's previous occupant
  goes to the bench.

**Starter player selected** — list one row per eligible bench
candidate:
- `"Swap with {Name}"` for each bench player eligible to take this
  slot. Also include other **starter slots** this player could move
  into (per the original ask — moving between a native slot and
  FLEX/FLEX2) — same swap logic, just starter-to-starter instead of
  starter-to-bench.

Both selections keep the existing `Retire` action/eligibility logic
unchanged (`starterHasBenchReplacement`/`benchPlayerHasReplacement`
already correctly guard this — don't touch that part).

## 4. Swaps execute immediately, no intermediate confirmation

This is a **deliberate difference from `08-dynasty-gameplay-redesign
.md`'s pack-pull flow**, worth being explicit about so Claude Code
doesn't assume the same rule applies here: pack-pull displacement asks
the user to manually choose bench-vs-retire for whoever gets bumped,
because there's genuine ambiguity in that moment. A roster-editor swap
has an obvious, symmetric destination — the displaced player goes
exactly where the other player came from (bench↔slot, or
slot↔slot) — so there's no ambiguous choice to make. Execute the swap
immediately on tap. This is also consistent with the existing staged-
editor model (`dirty`/`Save`/`Discard`) — nothing commits to the real
store until Save anyway, so an immediate swap is still fully
reversible via Discard.

## Acceptance criteria

- [ ] `.position` is never overwritten after a player enters the player
      pool — verify by drafting/pulling a player into a FLEX slot, then
      confirming their `.position` still reads their true position
- [ ] `getEligibleSlots` / `getEligibleBenchCandidates` correctly
      exclude illegal swaps (e.g. a TE cannot appear as an eligible
      candidate for a strict `WR` slot)
- [ ] Starter-to-starter moves (e.g. WR native slot ↔ FLEX) work, not
      just starter-to-bench — this was the original, specific ask
- [ ] Detail panel's action list is fully dynamic per selection, not a
      fixed 2-button array
- [ ] Swaps execute on a single tap with no extra confirmation step,
      and remain fully reversible via the existing Discard flow
- [ ] Retire eligibility logic is untouched — still correctly blocks
      retiring the last available replacement for a slot
