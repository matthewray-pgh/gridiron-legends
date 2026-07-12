# 01 — Home screen: broadcast scoreboard direction

Reference: `gridiron-legends-home-directions.html`, **version C — "Broadcast
scoreboard"** only. This supersedes the home screen sections of
`gridiron-legends-redesign-concepts.html` and
`gridiron-legends-legacy-concepts.html` — those had a different visual
system (rounded gold cards) that is no longer the target; ignore their
home screen sections. Versions A ("Command center") and B ("Trophy case")
in the directions file were alternates that were not selected — ignore
those too.

App icon is already finalized separately and out of scope for this
handoff — do not touch `assets/icon.png`, `assets/android-icon-*.png`,
`assets/favicon.png`, `assets/splash-icon.png`, or the icon paths in
`app.json`.

## Visual system

This direction is a distinct language from the rest of the app's current
rounded-card style — it's intentionally sharper and more literal about
the "you're watching a broadcast" framing. New pieces that need to exist
before the screen can be built:

### Typography

Add **Space Mono** alongside the existing Bebas Neue / Inter setup (same
pattern as `@expo-google-fonts/bebas-neue` and `@expo-google-fonts/inter`
already in `package.json` — add `@expo-google-fonts/space-mono`). Used
for all numeric/data readouts: ticker text, scorebox digits, the
call-sheet mode tags, tab bar labels. Bebas Neue stays for the big hero
title; Inter is no longer used on this screen except where explicitly
noted below — everything else is Space Mono.

Add to `theme/colors.ts`:

```ts
// Font object
mono: 'SpaceMono_400Regular',
monoBold: 'SpaceMono_700Bold',
```

### New color tokens

The ticker is solid gold with dark text — existing `Colors.gold` works
for the background, but there's no existing dark-on-gold text token.
Add:

```ts
tickerText: '#3A2600', // dark warm brown, for text on solid gold backgrounds
```

Don't reuse `Colors.bgPrimary` or plain black for this — the mockup
specifically uses a warm dark brown so it doesn't read as pure
grayscale against the gold.

### Corner radius

This screen uses sharp/near-sharp corners throughout (hero panel,
scoreboxes, call-sheet pills), not the app's existing rounded-card
radius scale. Don't force `Radius.md`/`Radius.lg` onto these components.
Either add a new `Radius.sharp: 2` token, or set `borderRadius` inline
at 2-4px directly on this screen's components — either is fine, but
be consistent within the screen.

## Layout (top to bottom)

1. **Ticker** — full-bleed solid-gold marquee bar above the header,
   continuously auto-scrolling. Content: live-ish stats separated by a
   bullet character — players-today count, streak, rank, record, dynasty
   level. This needs a real looping-marquee implementation, not CSS
   `animation` (React Native has no native marquee) — use
   `react-native-reanimated` (already a dependency) driving a
   `translateX` loop, or a scrolling `Animated.View` inside a fixed-width
   clipped container. Duplicate the content string once so the loop has
   no visible seam when it wraps.
2. **Header** — condensed wordmark (Bebas Neue, small) + gear icon only.
   No Rings chip here — Rings now live in the scorebox row (see below),
   don't duplicate it in the header.
3. **Hero call panel** — sharp-cornered panel, gold left-edge accent bar,
   dark warm gradient background. Contains: small mono eyebrow label,
   large Bebas Neue title, mono-styled countdown/status line, single
   solid-gold CTA button (sharp corners, not pill-shaped).
   - This panel is **contextual**, not fixed to "Today's Challenge":
     - If there's an in-progress `gameStore` session (roster has at
       least one filled slot, `isComplete` is `false`) -> show a
       "CONTINUE RUN" state here instead (title = team/era from the
       session, CTA resumes `GameScreen` at the current
       `positionIndex`, skipping spin setup).
     - Otherwise -> show "TODAY'S CHALLENGE" as in the mockup.
     - Don't show both stacked — this panel is the single hero slot,
       pick one state. If both a challenge and an in-progress run exist,
       prioritize showing the in-progress run in the hero slot (players
       are more likely to want to resume than start something new), and
       surface "Today's Challenge" as a normal entry in the call sheet
       rail instead (see below) so it isn't lost.
4. **Scorebox row** — three (not four) sharp-cornered boxes, mono bold
   digits, mono caption below. Mockup uses Streak / Rank / Rings.
   Data sources:
   - Streak -> `statsStore.streak`
   - Rank -> derive from `statsStore.leaderboard` position where
     `isMe: true`; don't fabricate if no real ranking exists yet, show
     `—` instead of a fake number
   - Rings -> new Legacy store (doc 03). If Legacy hasn't shipped yet,
     render `0` here rather than omitting the box (unlike the Legacy
     entry below, this box's absence would break the 3-box grid layout,
     so keep the box and zero the value).
5. **Call sheet rail** — label "CALL SHEET" (mono, letter-spaced), then a
   vertical stack of left-border-accented pills, one per mode:
   - Classic, Gridiron IQ, Challenge — silver left border (default)
   - Two-Minute Drill — blue left border (`Colors.gridironBlue`), tag
     text "skill spin" (see doc 02)
   - **Legacy** — gold left border (same gold as the hero panel accent,
     to visually mark it as the featured/premium entry, distinct from
     the blue-bordered skill variant), tag text showing dynasty level
     e.g. "lvl 7". Tapping navigates into `LegacyHomeScreen` (doc 03).
     If Legacy hasn't shipped yet, omit this pill entirely rather than
     linking to a dead route.
   - If "Today's Challenge" got bumped out of the hero panel per rule 3
     above, add it here too as a normal pill.
6. **Tab bar** — underline-active-state variant, not the dot-indicator
   style used elsewhere in the app currently. Mono labels. This is a
   deliberate visual differentiation for this screen — confirm whether
   the tab bar style should actually change app-wide to match (would
   affect every other screen's tab bar too) or stay unique to Home.
   > DECISION NEEDED: rolling the underline tab bar out app-wide is a
   > bigger visual-consistency change than this handoff covers — don't
   > do it unprompted, ask first.

## Components to build

Reusable pieces worth extracting rather than writing inline once each,
since the ticker and scorebox patterns will likely reappear on other
screens if this direction expands (see note at end of this doc):

- `<Ticker items={string[]} />` — handles the loop/duplication/animation
  internally, takes plain text segments as props
- `<ScoreBox value={string} label={string} />`
- `<CallSheetPill title, tag?, accentColor, onPress />`

### Acceptance criteria

- [ ] Ticker loops seamlessly with no visible jump or blank gap
- [ ] Hero panel correctly prioritizes continue-run over today's-challenge
      when both exist, and today's-challenge still surfaces in the call
      sheet rail in that case
- [ ] Rank shows `—` rather than a fabricated number when no real ranking
      data exists
- [ ] Legacy pill is omitted (not shown-but-broken) until doc 03 ships
- [ ] `Colors.tickerText`, mono font tokens, and sharp-radius values are
      added to `theme/colors.ts` rather than inlined per-component
- [ ] Two-Minute Drill pill uses `Colors.gridironBlue`; Legacy pill uses
      `Colors.gold` — these two must remain visually distinct from each
      other and from the default silver pills

## Note on scope

This visual language (ticker, scoreboxes, sharp corners, mono type) was
only designed against the Home screen. Before extending it to Spin,
Legacy, or Roster screens, treat that as a separate design pass, not an
assumed continuation — confirm the direction still holds up once it's
carrying gameplay UI (draft cards, pack reveals) and not just dashboard
stats, rather than mechanically reskinning every screen to match.
