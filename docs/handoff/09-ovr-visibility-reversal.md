# 09 — OVR visibility reversal + OVR-sorted candidate lists

**This reverses the "OVR hidden by default everywhere" decision from
`05-game-loop-bugfixes.md` (P1, Gridiron IQ section).** That decision —
OVR never shown by default, revealed only via a Scouting Report perk —
is no longer current. Confirmed directly with the user: OVR is visible
everywhere again. Don't implement the hide-by-default behavior if it
hasn't shipped yet; if it has, this doc supersedes it.

## 1. Inline gold OVR display — every player-name row, everywhere

> **Temporary, testing-only — wrap in a feature flag.** Confirmed with
> the user: this display will be removed before launch. Add a flag to
> `src/config/featureFlags.ts` alongside the existing
> `DYNASTY_ENABLED`/`HALL_OF_FAME_ENABLED` pattern — e.g.
> `SHOW_DEBUG_OVR = true` during development, flipped to `false` (or
> deleted along with the display code) before launch. Every render site
> listed below should check this flag, not just the top-level screen —
> don't let it leak through on some rows and not others if it's ever
> toggled off mid-testing.
>
> **Important distinction: the flag gates the *display* only, not the
> sorting behavior in section 2 below.** OVR-descending sort order for
> Classic/Daily/Timer/Challenge is a permanent design decision, not a
> testing aid — it must keep working identically whether
> `SHOW_DEBUG_OVR` is `true` or `false`. The candidate pool gets sorted
> by the real OVR value either way; the flag only controls whether that
> number is ever painted on screen. Don't gate the sort call behind the
> same flag as the display, or turning the flag off before launch will
> silently also revert Classic back to unsorted lists.

Wherever a player's name renders in a row/list context, append the OVR
number directly after the name, inline (not a separate column) —
gold (`Colors.gold`), font size **slightly larger** than the name's own
font size (e.g. if the name uses a given `Typography` step, OVR uses
the next step up — keep this relative to the existing type scale
rather than a hardcoded px value, so it stays consistent if the scale
changes).

Example: `J. Allen` `96` — where `96` is gold and visibly larger than
"J. Allen".

This applies everywhere a name row exists, confirmed as "everywhere,
including live draft candidate lists" — not scoped to just
already-owned roster players. Concretely:

- `GameScreen.tsx` — draft candidate rows
- `RosterManager.tsx` — starter and bench rows
- `PackOpeningScreen.tsx` / `PackPlayerCard.tsx` — pack pull reveals
- `PlayerDetailPanel.tsx` — wherever the name header renders
- Any Leaderboard or profile view that lists players by name

**This is additive, not a replacement.** The existing right-aligned
metric slot (currently showing real per-position stats — pass yards/TD
for QB, tackles/sacks for D-line, etc., per the earlier fix) stays
exactly as-is. Confirmed explicitly: both pieces of information show
at once — gold OVR inline after the name, position stats still in the
right-side slot. Don't remove or fork the stats display to make room;
this sits alongside it.

See the feature-flag requirement above — this isn't just "worth a
comment," it's a hard requirement to gate behind `SHOW_DEBUG_OVR`
before this ships anywhere near production.

## 2. Candidate list sort order: year, then name — never OVR

> **Correction, overrides the sort direction discussed earlier in this
> conversation.** Confirmed with the user: candidate lists must sort by
> **year ascending (oldest season first), then alphabetically by player
> name** as the tiebreaker — the same order in **every mode**, with no
> exceptions. OVR must never be used as a sort key, anywhere, in any
> mode. This replaces the earlier "Classic sorts by OVR descending,
> IQ stays unsorted" plan below — that plan is dead, don't implement it.

> **Consequence worth flagging, not resolved here:** with OVR visible
> everywhere (section 1) and now identical year-then-name ordering in
> every mode, **Gridiron IQ has no remaining gameplay differentiator**.
> Classic and Gridiron IQ will look and behave identically — same
> visible OVR, same list order — which is the exact bug this project
> originally set out to fix. This doc doesn't invent a replacement
> differentiator; that's a real design decision for the user to make
> (a different mechanic entirely, a genuinely hidden stat, a time
> pressure, something else), not something to guess at here. Flag this
> back before considering Gridiron IQ "done."

~~**Classic / Daily / Timer / Challenge**: candidate lists sort by OVR
descending, within each position group. **Gridiron IQ**: list stays
unsorted.~~ — superseded by the correction above, kept struck through
for history only, do not implement.

## 3. Scouting Report perk needs redefining

`03-legacy-mode.md`'s "Scouting Report" perk was built entirely around
revealing hidden OVR — its premise no longer holds now that OVR is
visible by default everywhere. Don't ship it as originally described.
> DECISION NEEDED: either repurpose this perk slot for something else
> (e.g. reveal a hidden future-opponent's roster strength, or reveal
> upcoming spin odds) or retire the perk concept entirely. Not urgent —
> perks aren't blocking anything else — but flag it rather than leaving
> a perk in the data that references a mechanic that no longer exists.

## Acceptance criteria

- [ ] `SHOW_DEBUG_OVR` (or similar name) added to
      `src/config/featureFlags.ts`, matching the existing flag pattern
- [ ] Gold, inline, name-appended OVR display implemented across every
      listed screen above — verify against all of them, not just the
      draft screen — all gated behind the flag
- [ ] Flipping the flag to `false` removes the display everywhere with
      no leftover visible instances
- [ ] Flipping the flag to `false` does **not** change candidate sort
      order — verify this specifically, it's an easy thing to
      accidentally couple to the same flag
- [ ] Right-side position-stats slot is unchanged and still present
      alongside the new OVR text, not replaced
- [ ] Every mode (Classic/Daily/Timer/Challenge/Gridiron IQ) sorts
      candidate lists identically: year ascending, then alphabetical by
      name — verify OVR is not used as a sort key anywhere in the
      codebase, including any leftover code from the earlier
      OVR-descending plan
- [ ] Gridiron IQ's lack of a remaining differentiator is explicitly
      flagged back to the user — not silently left as-is or silently
      "fixed" with an invented mechanic
- [ ] Gridiron IQ candidate list explicitly does NOT sort by OVR —
      verify this is actually different from Classic's ordering, not
      accidentally the same
- [ ] `03-legacy-mode.md`'s Scouting Report perk is either redefined or
      removed before Legacy/Dynasty perk packs ship it as-is
