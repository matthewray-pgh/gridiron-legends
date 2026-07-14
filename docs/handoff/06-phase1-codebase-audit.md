# 06 — Phase 1: Codebase audit

Grounded in a direct read of the repo as of the `feature/web-based-approach`
merge (commit `04d1d9e`) — not a generic template. Written to feed Phase 2
(design gap analysis, doc 07) and the Phase 3/4 refactor work, which
should happen in Claude Code against the live repo.

## Stack

Expo (React Native) + `react-native-web`, TypeScript, Zustand for state,
React Navigation (`@react-navigation/native-stack`) for routing. No
persistent nav shell exists — `AppNavigator.tsx` is a bare stack
navigator; there's no tab bar or app-wide layout wrapper anywhere.
`AsyncStorage` is used for `dynastyStore` persistence.

## Folder structure (actual)

```
src/
  components/     11 files, flat — no sub-grouping by type
  config/         featureFlags.ts (DYNASTY_ENABLED flag)
  data/           players.ts, packs.ts, perks.ts
  hooks/          useResponsive.ts
  navigation/     AppNavigator.tsx, types.ts
  screens/        9 screens, flat
  store/          gameStore.ts, dynastyStore.ts, statsStore.ts
  theme/          colors.ts — the entire design-token layer lives in
                  this single file
```

There is no `design-system/` directory, no `layouts/` directory, and no
sub-categorization of components by role (foundation/navigation/cards/
buttons/inputs, as proposed in the roadmap doc) — everything is a flat
list in `src/components/`.

## Component inventory

| Component | Role | Reused across how many screens |
|---|---|---|
| `InfoChip.tsx` | Label+value chip (TEAM/ERA/REROLL, stat readouts) | Multiple |
| `SegmentedControl.tsx` | Two/three-way toggle | Multiple (Game Setup pattern, slot filter) |
| `SelectablePill.tsx` | Selectable rounded pill (era select, position slots) | Multiple |
| `ScoreBox.tsx` | Broadcast-scoreboard stat box | Home only |
| `Ticker.tsx` | Scrolling marquee (Reanimated-driven) | Home only |
| `CallSheetPill.tsx` | Mode-select list row | Home only |
| `RankBadge.tsx` | Ranked-list badge (gold/silver/bronze/numbered) | Leaderboard only (confirm — see gap analysis) |
| `PlayerDetailPanel.tsx` | Player detail/stat breakdown, wide-panel + modal variants | Game screen only |
| `SpinOrnaments.tsx` | Decorative spin-screen graphics (SVG gradients, spin button) | Spin, TwoMinuteDrillSpin |
| `StatusBar.tsx` | (purpose not fully audited — flag for Claude Code to confirm usage) | — |
| **`PlayerCard.tsx`** | Player card w/ pass count, hideStats prop | **Dead — never imported anywhere** (see `05-game-loop-bugfixes.md`) |

**Finding:** `PlayerCard.tsx` is fully-built dead code. This matters for
the design-system effort specifically because it's the one component
most clearly modeled on the brand mockup's "player card" artwork
(era range, rarity badge, OVR, stat row) — and it's not rendered
anywhere. The actual draft screen (`GameScreen.tsx`) uses a plainer
inline row card that doesn't match the mockup's player card design at
all. This is probably the single highest-leverage fix for closing the
visual gap between mockups and the real app (see doc 07).

## Styling architecture

- **No design-token layer beyond `theme/colors.ts`.** That one file
  covers `Colors`, `Typography`, `Spacing`, `Radius`, `Font` — there are
  no `shadow`/`elevation` tokens, no `gradient` tokens, and no
  `animation` duration/easing tokens, despite all three being used
  ad hoc throughout the app.
- **Every screen defines its own `StyleSheet.create`** — 20 occurrences
  across the codebase. There's no shared `Card`, `Panel`, `Button`, or
  `Screen` wrapper component; each screen re-implements card/button
  styling inline. This is the core thing the roadmap doc's Phase 3/4
  is trying to fix, and it's a real, confirmed problem, not a
  hypothetical one.
- **32 hardcoded hex color literals** exist outside `theme/colors.ts`
  (e.g. `SpinOrnaments.tsx`'s gradient stops, `SegmentedControl.tsx`'s
  `'#09111B'`/`'#2B3A48'`, `HomeScreen.tsx`'s several inline
  backgrounds). Some of these are legitimately one-off (a specific
  gradient midpoint), but several — `'#2A210F'` appears identically in
  both `PlayerDetailPanel.tsx` and `SelectablePill.tsx` — are clearly
  the same design decision made twice in two places instead of once as
  a token. That's exactly the drift the roadmap doc is trying to
  prevent.
- **Gradients are defined per-component**, not tokenized — 3 separate
  `LinearGradient` usages with their own inline color-stop arrays
  (`HomeScreen.tsx`'s ticker, `SpinOrnaments.tsx`'s spin button, at
  least one more). The roadmap's proposed `--color-gold-glow` /
  gradient tokens don't exist yet.
- **Animation timings are inconsistent and inline** — durations found:
  `140`, `0` (`SpinScreen.tsx`), a Reanimated-driven ticker with a
  computed duration (`Ticker.tsx`), and a custom `loopSweep` helper
  (`TwoMinuteDrillSpinScreen.tsx`). No shared `Fast`/`Medium`/`Slow`
  timing constants exist, matching the roadmap's stated gap exactly.

## Assets inventory

```
assets/
  icon.png, splash-icon.png, favicon.png
  android-icon-background.png, android-icon-foreground.png,
    android-icon-monochrome.png
  stadium-bg.png                    — unused in code (confirmed in
                                       04-web-home-layout.md's audit)
  home-header.png                   — usage not yet confirmed, check
                                       against HomeScreen.tsx imports
  field-bottom.png (+@2x/@3x)       — unused in code
  undefeated-gridiron-legends-header.png — usage not yet confirmed
```

The background-imagery system described in the brand asset sheet
(header stadium / footer field, pre-exported per device size class) is
**not implemented anywhere in the current UI** — this is the single
biggest visual gap between the mockups and the live app, independent of
any specific screen (see doc 07).

## Technical debt list

1. `PlayerCard.tsx` — fully-built, never rendered (dead code)
2. `passPlayer` / `passesUsed` / `maxPasses()` in `gameStore.ts` — dead
   code, not called from any screen (already flagged in
   `05-game-loop-bugfixes.md`, repeated here since it's also a
   component/architecture debt item, not just a gameplay bug)
3. No shared `Card`/`Panel`/`Button`/`Screen` primitives — every screen
   reimplements card and button styling from scratch
4. No shadow/elevation/gradient/animation token layer
5. 32 hardcoded hex values outside the token file, at least 2 confirmed
   duplicate values that should be a single token
6. Background-image system (stadium/field art) built as assets but
   wired into zero screens
7. No persistent nav shell — `01-home-screen.md`'s top-nav and
   `04-web-home-layout.md`'s desktop nav were scoped screen-local
   specifically because no shared layout exists to put them in

## Recommendation on the roadmap doc's proposed folder structure

> **RESOLVED (confirmed with user):** split into the roadmap's full
> multi-file token structure —
> `design-system/tokens/{typography,colors,spacing,elevation,borders,
> shadows,gradients,animations}/` — rather than keeping the single
> `theme/colors.ts` file. This is a larger migration than it might
> look: every file currently importing `{ Colors, Typography, Spacing,
> Radius, Font }` from `'../theme/colors.ts'` (confirmed via this
> audit: every screen and most components) needs its import paths
> updated. Recommend doing this as its own dedicated Claude Code
> session/PR before Phase 4's screen-by-screen refactor starts, not
> concurrently with it — mixing a wholesale import-path migration with
> visual changes in the same diffs will make both harder to review.
>
> New token categories to actually populate (not just create empty
> files for) per the audit's findings above: shadow/elevation tokens
> (currently nonexistent), gradient tokens (currently 3 inline
> `LinearGradient` color-stop arrays that should become 1 each), and
> animation timing tokens (currently inconsistent inline durations:
> `140`, `0`, plus two custom Reanimated helpers with their own
> hardcoded values).
