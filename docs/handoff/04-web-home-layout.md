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

1. **Persistent top nav, replacing the reflowed header.** Currently
   there's no persistent navigation at all — `AppNavigator.tsx` is a
   bare `createNativeStackNavigator` with no tab bar or shell, so every
   screen is just a stack push. At wide viewports, Home should render a
   sticky top nav: logo, page links (Home / Dynasty / Leaderboard),
   Rings chip, settings, and a profile avatar placeholder.

   > DECISION NEEDED: should this nav be scoped to just `HomeScreen`
   > (simplest, matches this doc's stated scope), or does it belong in
   > a shared layout wrapping every screen at wide viewports (a proper
   > web app shell)? The mockup implies the latter eventually, but
   > that's a bigger architectural change than "redesign the home
   > page" — don't build a global nav shell unprompted. Implement it
   > local to `HomeScreen` for now and flag the shell question back.

   Nav links: only link to routes that actually exist
   (`Home`, `DynastyHome`, `Leaderboard`). The mockup shows a
   "History" link with no corresponding screen in
   `RootStackParamList` — omit it, don't link to a route that doesn't
   exist yet.

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

- `<TopNav />` — wide-viewport only, scoped to `HomeScreen` per the
  decision above
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
- [ ] At/above `WIDE_BREAKPOINT`, nav links only point at routes that
      exist in `RootStackParamList`
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
