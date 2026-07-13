# 01 — Home screen redesign + app icon concepts

Reference: section 1 and 2 of `gridiron-legends-redesign-concepts.html`,
and section 1 of `gridiron-legends-legacy-concepts.html` (home screen v2
with Legacy banner + Two-Minute Drill card — use v2 as the actual target,
v1 was superseded).

## 1. App icon

Current app icon assets live at `assets/icon.png`,
`assets/android-icon-*.png`, `assets/favicon.png`, `assets/splash-icon.png`
(referenced from `app.json`).

Direction: replace with concept **B — "Monogram medallion"** from the
mockup — a circular badge, gold ring, silver "U" football-lace monogram
centered, no fine bevel detail. Rationale: the current shield crest has
fine engraved detail that disappears at 40×40 home-screen icon scale;
a single clean silhouette reads at any size.

- This needs a real illustration/export pass (vector → PNG at all
  required sizes: 1024×1024, 512×512, 180×180, 120×120, plus Android
  adaptive icon foreground/background/monochrome layers per
  `android-icon-*.png` naming already in `assets/`). The HTML mockup's
  inline SVG is a rough proportion/shape reference only, not
  production-ready art.
- Keep the existing shield/U crest (current `assets/icon.png` treatment)
  as the in-app wordmark lockup (home header, splash screen) — don't
  discard it, just stop using it as the app icon.
- Update `app.json` icon paths only after final art is dropped into
  `assets/`; don't point config at placeholder art.

> DECISION NEEDED: final icon art needs to be produced by a
> designer/image tool pass, not hand-coded SVG. Flag this back to the
> user rather than shipping a rough vector as final.

## 2. Home screen (`src/screens/HomeScreen.tsx`)

Target layout, top to bottom:

1. **Header** — existing logo lockup + settings gear, plus new **Rings
   currency chip** (small pill, gold border, dot icon + number) next to
   the gear. Rings balance comes from the new Legacy store (see doc 03) —
   if Legacy hasn't landed yet, stub the chip at `0` behind a feature
   flag rather than blocking this screen on doc 03.
2. **Stat strip** — three chips: Streak / Rank / Record. Streak and best
   record already exist in `statsStore.ts` (`streak`, `bestRecord`).
   "Rank" is new — if there's no real leaderboard rank computation yet,
   derive it from position in `statsStore.leaderboard` where
   `isMe: true`, don't fabricate a number.
3. **Today's Challenge hero card** — this already exists in some form;
   keep current copy/behavior, just confirm it matches the tightened
   visual spacing in the mockup (eyebrow label, title, subtitle, single
   CTA button, "NEW" badge only when the daily challenge is unseen this
   session).
4. **Continue run card** — new. Only renders when there's an in-progress
   `gameStore` session (i.e. `roster` has at least one filled slot and
   `isComplete` is `false`). Tapping it navigates straight back into
   `GameScreen` at the current `positionIndex`, skipping `SpinScreen`
   setup. If no in-progress session, omit the card entirely — don't show
   an empty state for it.
5. **Legacy banner** — new, sits above "Choose your mode". Shows dynasty
   level, all-time record, HOF card count, packs-ready count, single
   "Enter legacy" CTA. Pulls from the new Legacy store (doc 03). If
   Legacy mode isn't built yet, this section should not render at all
   (don't ship a banner pointing at a dead route).
6. **Choose your mode** — existing Classic / Gridiron IQ / Challenge
   cards, plus new **Two-Minute Drill** card (see doc 02 for the mode
   itself). Visually: same card pattern as the other three, but with a
   small "SKILL SPIN" badge in the corner so players know it's a
   different interaction model before tapping in. Use
   `Colors.gridironBlue` for that badge/border accent, not a new color.
7. **Tab bar** — unchanged (Board / Roster / Spin / History / Profile).

### Acceptance criteria

- [ ] Rings chip renders `0` gracefully with no Legacy store present
      (doesn't crash, doesn't show `undefined`)
- [ ] Continue-run card only shows for a genuinely in-progress session,
      and correctly resumes `GameScreen` state on tap
- [ ] Legacy banner is feature-flagged off until doc 03 ships
- [ ] Two-Minute Drill card navigates to the same `SpinScreen` route with
      a mode param, not a duplicate screen (see doc 02)
- [ ] All new colors pulled from `theme/colors.ts`, none hardcoded
