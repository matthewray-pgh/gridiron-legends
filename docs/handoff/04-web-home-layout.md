# 04 — Home screen: desktop web layout

Reference: `gridiron-legends-web-home-layout.html`. This extends
`01-home-screen.md` (the broadcast scoreboard visual language — ticker,
scoreboxes, mono type, sharp corners all carry over unchanged) with a
genuine desktop layout, not just a wider reflow of the mobile screen.

## Why this is a separate doc from 01

`HomeScreen.tsx`'s current `isWide` behavior (see `useResponsive.ts`,
`WIDE_BREAKPOINT = 900`) reflows the same single-column mobile stack
sideways — hero and scoreboxes go side by side, the call sheet rail
wraps into a grid, but it's still fundamentally one centered column
(`contentWrapWide { maxWidth: 1040 }`). That's a wide phone screen, not
a web page. This doc replaces the wide-viewport behavior specifically;
the narrow/mobile-width behavior in `01-home-screen.md` is unchanged.

## What's structurally new

1. **Persistent shell, app-wide — not a full nav bar.**
   > **RESOLVED (confirmed with user):** don't build the mockup's full
   > text-link nav bar. Instead: a minimal persistent shell — logo
   > (always links to `Home`) plus 2 icon-only shortcuts (Leaderboard,
   > Dynasty) — applied **app-wide**, not scoped to `HomeScreen`. This
   > reflects that the underlying problem (zero persistent navigation
   > anywhere in `AppNavigator.tsx` — every screen is a stack push with
   > only a back arrow) exists at every screen, not just Home, and a
   > heavier site-style nav would fight the app's actual hub-and-spoke
   > shape (Home → mode → play → Result → back to Home) rather than
   > serve it.
   >
   > Scope note: this decision came out of the desktop-web-layout
   > discussion, but the shell should render at all viewport widths,
   > not just wide ones — the "stuck without nav" problem isn't
   > web-specific. The shell's visual treatment can adapt to width
   > (e.g. more compact on narrow screens) but its presence shouldn't
   > be conditional on `isWide`.
   >
   > Implementation note, not a product decision: React Navigation's
   > native-stack doesn't have a built-in persistent-shell concept —
   > this needs either a custom shared header via `screenOptions.header`
   > on the `Stack.Navigator`, or a wrapping layout component that every
   > screen renders inside of. Either is fine; pick whichever fits the
   > existing `SafeAreaView`-per-screen pattern more cleanly, Claude
   > Code's call.

   Icon shortcuts: only link to routes that actually exist
   (`Home`, `DynastyHome`, `Leaderboard`). The mockup's "History" link
   has no corresponding screen in `RootStackParamList` — omit it.

2. **Hero band using real background art.** `assets/stadium-bg.png`
   (plus its `@2x`/`@3x` variants) already exists in the repo and is
   currently unused anywhere in `HomeScreen.tsx` — this is the first
   place it should actually get used. Full-bleed background image
   behind the hero content, dark gradient overlay for text
   legibility (per the design system's background-imagery rule —
   never place text directly on the raw photo). Large headline
   (Bebas Neue), status line (mono), primary CTA + a secondary
   "view rules" action.

   This hero band only replaces the *narrow* hero panel's visual
   treatment at wide viewports — the underlying contextual logic
   (continue-run vs. today's-challenge) does **not** carry over
   unchanged; see point 4 below, it's intentionally different at this
   breakpoint.

3. **Real two-column dashboard**, not a reflowed stack. Below the hero,
   wide viewports get:
   - **Main column**: call-sheet mode cards as an actual 2×2 grid,
     each card with room for a real one-line description (not just
     title + tag, per the mockup's `mode-desc` — mobile stays
     title+tag only, don't force full descriptions into the narrow
     `CallSheetPill` component), plus a leaderboard teaser panel below
     (top 3 + the player's own row, pulled from
     `statsStore.leaderboard`).
   - **Sidebar** (fixed-width column, not full-width-then-stacked):
     continue-run card (only rendered if a run is in progress),
     Dynasty summary card, and a compact score panel (streak / rank /
     best record).

   This is a real CSS/Flexbox two-column grid at the wide breakpoint,
   not the existing `heroRowWide`/`scoreRowWide` flex reflow — those
   styles should be superseded for the wide case by this doc, not
   patched further.

4. **Continue-run card moves to the sidebar at wide viewports —
   it no longer competes with Today's Challenge for the hero slot.**
   This is a deliberate divergence from the mobile rule in
   `01-home-screen.md` (where continue-run *replaces* the hero content
   when in progress). At desktop width there's enough room for both to
   be visible at once without one crowding out the other, so:
   - Hero band always shows "Today's Challenge" at wide viewports.
   - The continue-run card renders in the sidebar, above the Dynasty
     card, only when a run is in progress (same underlying
     `hasInProgressRun` check already in `HomeScreen.tsx`).
   - Below `WIDE_BREAKPOINT`, keep the existing single-hero-slot
     priority logic from `01-home-screen.md` unchanged.

5. **Leaderboard teaser** — new component, main-column only (there's no
   equivalent on the narrow mobile layout, and it shouldn't be added
   there — this is a wide-viewport-only addition since mobile doesn't
   have the vertical/horizontal room to spare). Top 3 leaderboard
   entries plus the current player's row (highlighted, matching the
   existing "me" row treatment from `LeaderboardScreen.tsx` if that
   pattern already exists there — reuse rather than reinvent).

6. **Real footer** at wide viewports — disclaimer text plus utility
   links (About / Support / Terms), using a subtle field-pattern
   texture background.
   > DECISION NEEDED: About/Support/Terms have no corresponding routes
   > or content yet. Render them as visually present but disabled/
   > non-interactive until real destinations exist, rather than linking
   > to dead routes or building placeholder pages speculatively.

## Components to build

- `<AppShell />` — app-wide persistent shell (logo + Leaderboard/Dynasty
  icon shortcuts), replaces the earlier Home-scoped `<TopNav />` concept.
  Renders at every screen, all viewport widths.
- `<HeroBand />` — wide-viewport variant of the existing hero panel;
  narrow viewports keep the current `heroPanel` implementation
  unchanged
- `<ModeCard />` — richer wide-viewport card (icon, title, description,
  tag); distinct from the existing narrow `<CallSheetPill>`, not a
  replacement for it
- `<LeaderboardTeaser />`
- `<SiteFooter />`

## Acceptance criteria

- [ ] Below `WIDE_BREAKPOINT` (900px), `HomeScreen` behaves exactly as
      specified in `01-home-screen.md` — no regressions to the mobile
      layout or its hero-slot priority logic
- [ ] Nav shortcuts only point at routes that exist in
      `RootStackParamList`, at any viewport width
- [ ] The persistent shell renders on every screen, not just Home —
      confirm this by checking `GameScreen`, `SpinScreen`, etc., not
      just the screen this doc was originally scoped to
- [ ] `assets/stadium-bg.png` is actually rendered in the hero band at
      wide viewports, with a gradient overlay — never bare text on the
      raw photo
- [ ] Continue-run card and Today's Challenge are both visible
      simultaneously at wide viewports when a run is in progress
      (sidebar + hero respectively) — confirming the intentional
      divergence from the mobile single-hero-slot rule
- [ ] Leaderboard teaser data comes from `statsStore.leaderboard`, not
      hardcoded mock rows
- [ ] Footer's placeholder links are visually present but inert, not
      linked to nonexistent routes
