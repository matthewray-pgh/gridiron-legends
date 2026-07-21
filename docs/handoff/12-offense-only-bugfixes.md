# 12 — Offense Only mode: two bugs, one root cause

Reported: (1) after drafting one QB, QB candidates disappear entirely
instead of surfacing for the QB2 slot; (2) the draft freezes around
round 8, spin appears to do nothing no matter how many times it's
tapped. Traced both against the real code — same root cause, not two
separate bugs.

## Root cause

`getViableTeamAbbrs()` in `data/players.ts` checks each roster slot
**independently**:

```ts
return teamAbbrs.filter((teamAbbr) => positions.every((draftPosition) => {
  return eras.some((era) => hasPlayersForSpin(draftPosition, teamAbbr, era));
}));
```

`hasPlayersForSpin()` only answers "does at least one qualifying record
exist" — it has no concept of records already being spoken for by
another slot. Since `GENERATED_POSITION_MAP` maps both `QB` and `QB2`
to the same underlying generated position (`['QB']`), a team with
exactly **one** historical QB record passes the viability check for
**both** `QB` and `QB2` — the check never asks "can this team supply
two *different* QBs at once," only "does a QB exist for this team" (and
separately, redundantly, "does a QB exist for this team" again for the
second slot).

Same problem applies to `RB`/`RB2` and `WR`/`WR2`, and compounds
further once `FLEX`/`FLEX2` (which also draw from the RB/WR/TE pool)
are factored in. This is why it gets worse deeper into the draft:

- **Bug 1 (QB vanishes after round 1)**: happens under **One Team**
  mode specifically — `lockedTeam` persists across all 9 rounds. Once
  the team's one available QB is drafted into `QB`, there's nothing
  left for `QB2` — the round 2 spin combo search comes up with zero
  playable results for that team.
- **Bug 2 (freeze at round 8)**: same mechanism, just later — by the
  time `FLEX` comes up (position index 7, the 8th slot), a locked
  team's real RB/WR/TE depth across `RB`+`RB2`+`WR`+`WR2`+`TE` has
  likely been fully drained by the earlier rounds.

The freeze itself is a second, compounding bug: `rollSpin()` in
`gameStore.ts` handles a failed combo search by silently resetting to
the idle state:

```ts
const picked = pickSpinResult({ ... });
if (!picked) {
  set({ currentSpin: null, spinState: 'pre' });
  return;
}
```

There's no error surfaced and no way out — the player taps Spin, it
silently resets, they tap again, same result, forever. That reads
exactly as "frozen."

## Fixes needed

### 1. Viability check must account for combined demand, not per-slot

`getViableTeamAbbrs()` needs to check whether a team has enough
**distinct** records to satisfy the *combined* demand across all slots
that share a generated position — e.g. for Offense Only, does this team
have ≥2 distinct QB-eligible records (not "a QB, checked twice"), ≥3
distinct RB/WR/TE-pool-eligible records to cover `RB`+`RB2`+`FLEX`, and
so on. This is a real logic change, not a tweak — it needs to group
`positions` by their underlying `GENERATED_POSITION_MAP` value first,
count demand per group, then verify distinct supply meets that demand,
rather than checking each `Position` slot in isolation.

Apply this specifically where Offense Only's One Team viability is
computed (`gameStore.ts` / `GameSetupModal.tsx`, per the existing
comment referencing `OFFENSE_ONLY_POSITIONS`).

### 2. Never let a mid-draft spin failure go silent

Even with a better upfront check, don't leave `rollSpin()`'s failure
path as a silent reset — if `pickSpinResult` returns `null` mid-draft
(not just at setup), that's a real dead end the player needs visible
feedback on and a way out of. At minimum:

- Surface a clear message ("No eligible players remain for this team
  at this position") instead of quietly returning to the idle spin
  state indistinguishable from normal.
- Give a way forward — e.g. an option to release the team lock for the
  rest of the draft and pull from all teams for the remaining slots,
  rather than a dead end with no recovery path.

### 3. Open question: should One Team even be offered for Offense Only?

> DECISION NEEDED: given how demanding 9 offense-heavy slots
> (doubled QB/RB/WR) are on a single real team's historical roster
> depth, a better upfront viability check (fix #1) may still leave very
> few or zero teams actually qualifying for One Team mode in Offense
> Only. Worth deciding whether One Team should be disabled entirely for
> this mode, or kept but expected to rarely be selectable — don't
> silently decide this in code; flag it back once fix #1 is in and it's
> clear how many teams actually pass the corrected check.

## Acceptance criteria

- [ ] `getViableTeamAbbrs` (or a new function) correctly evaluates
      combined distinct-player demand per generated-position group, not
      per-slot independently
- [ ] Reproduce the original bug case (One Team, Offense Only, team
      with only one real historical QB) and confirm that team is now
      correctly excluded from the One Team picker rather than silently
      breaking mid-draft
- [ ] A mid-draft spin failure (`pickSpinResult` returns `null` after
      `spinState` was already past `'pre'` at least once) shows a real
      message and a recovery path, not a silent reset
- [ ] All Teams mode in Offense Only is verified unaffected — this bug
      is specific to the locked-team constraint, don't regress the
      unconstrained path while fixing this
