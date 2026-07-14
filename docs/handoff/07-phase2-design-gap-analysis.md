# 07 — Phase 2: Design gap analysis

Each implemented screen compared against the approved concept mockups
(brand sheet + the five screen comps: Home, Game Setup, Draft/Player
Selection, Spin, Leaderboard) and, where no original concept art exists
(Dynasty, Packs, Hall of Fame — these were designed later in this
project, not part of the original mockup set), against their own
handoff docs (`03-legacy-mode.md`) as the baseline instead.

Gap % is a rough visual/structural fidelity estimate, not a precise
metric — treat as directional for prioritization, not a scorecard.

| Screen | Current fidelity | Priority | Primary gap |
|---|---|---|---|
| Home | ~50% | High | Diverged onto the broadcast-scoreboard direction (a deliberate, approved departure — see below), not a fidelity miss in the traditional sense |
| Game Setup | ~70% | Medium | Functionally present but folded into Home inline rather than the mockup's dedicated modal screen |
| Player Selection / Draft | ~40% | **Highest** | Row-card list replaces the mockup's player-card treatment entirely; `PlayerCard.tsx` (closest match to mockup) is dead code |
| Spin | ~75% | Low | Close structural match via `SpinOrnaments.tsx`; needs a direct visual diff to confirm, not re-derived from scratch |
| Leaderboard | ~80% | Low | Closest match of any screen; missing only the branded header and background art |
| Dynasty / Packs / HOF | N/A — no original concept art | Medium | Built from this project's own handoff docs, not the original mockup set; evaluate against `03-legacy-mode.md`, not brand-sheet fidelity |

---

## Home — ~50%, High priority (but not a simple fidelity gap)

This is the one screen where "current vs. target" isn't a
straightforward miss — the broadcast-scoreboard direction
(`01-home-screen.md`) was a deliberate, approved pivot away from the
original rounded-gold-card mockup, not a drift that needs correcting
back. Comparing it against the *original* Home mockup would produce a
misleading gap score.

What's still a genuine gap even within the new direction:
- **No background imagery anywhere** — `stadium-bg.png` sits unused in
  `assets/`, confirmed in the codebase audit (doc 06). The brand's
  signature header-stadium/footer-field system isn't implemented on any
  screen, including Home.
- Desktop layout (`04-web-home-layout.md`) hasn't been confirmed as
  built yet — worth checking before assuming this doc's spec is live.

**Recommendation:** treat Home's "target" as `01-home-screen.md` +
`04-web-home-layout.md`, not the original brand mockup. Priority here
should focus on the background-imagery gap specifically, not a general
redesign.

## Game Setup — ~70%, Medium priority

Functionally equivalent to the mockup — `HomeScreen.tsx` has real
`teamScope`/`selectedEras` state, an "All Teams / One Team" toggle, and
era selection driving `beginDraftSession()`. Nothing is missing
*functionally*. The gap is structural: the mockup presents this as a
dedicated full-screen modal (branded header, tic-tac-toe icon, "GAME
SETUP" title, Cancel/Start Game footer buttons) with its own visual
moment, while the live app folds this into an inline section of Home.

**Recommendation:** lower priority than it might first appear — this is
a presentation/componentization choice (extract into a proper `<Modal>`
or dedicated screen using the mockup's framing) rather than a missing
feature. Don't let this compete for attention with the Draft screen gap
below, which is a real fidelity and dead-code problem.

## Player Selection / Draft — ~40%, highest priority

The largest real gap in the app, and the one most worth fixing first:

- The mockup's player card format (position badge, name, team·year·tier
  meta line, large right-aligned OVR) is reasonably close to what
  `GameScreen.tsx`'s row cards actually do — **but** the richer
  brand-sheet player card (era range, rarity badge, helmet/photo
  treatment, 5-stat row) was clearly the intended target for anything
  showing an individual player in more depth, and that component
  (`PlayerCard.tsx`) exists, fully built, and is never rendered
  anywhere (confirmed in doc 06).
- The mockup shows a highlighted top-ranked player card with a gold
  border; confirm whether `GameScreen.tsx`'s `rowCardSelected` style
  (gold border, but tied to *selection* state, not *rank*) is meant to
  double as this, or whether a separate "top pick" visual treatment is
  needed.
- No use of the background/imagery system here either (same gap as
  Home).

**Recommendation:** this is the highest-value place to spend Phase 4
effort. Specifically: either (a) retire `PlayerCard.tsx` and formally
adopt the current row-card pattern as the real design target (update
the design system doc to match reality), or (b) actually build
`PlayerCard.tsx` into the player detail view (`PlayerDetailPanel.tsx`
or a tap-to-expand state) so the richer mockup treatment shows up
somewhere real. Don't leave it as dead code either way — pick one.
> DECISION NEEDED: (a) vs (b) above, before Phase 4 touches this screen.

## Spin — ~75%, low priority

`SpinOrnaments.tsx` is purpose-built for this screen (SVG gradients,
custom spin button, gold/silver treatments matching the mockup's
TEAM/ERA card distinction) and `SpinScreen.tsx` uses `InfoChip` for the
round/reroll readout, consistent with the draft screen's chip pattern.
This looks like the most faithful screen to its mockup by component
inventory alone. A direct visual comparison (screenshot vs. mockup) is
still worth doing before Phase 4 to confirm, since this audit is based
on code structure, not a rendered screenshot — but this is not where
Phase 4 effort should start.

## Leaderboard — ~80%, low priority

Closest match in the app. Rank badges (gold/silver/bronze via
`RankBadge.tsx`), the highlighted "me" row, win-rate line, and
segmented Daily/Weekly/All-Time tabs are all present and match the
mockup's structure closely. Two real gaps:
- No branded header (logo + gear) — uses a plain back-arrow + title
  toolbar instead of the mockup's full lockup treatment
  - Note this is consistent with the "contextual header" pattern
    documented in `DESIGN-SYSTEM.md` §9 — confirm whether that's
    actually the intended pattern for this screen or whether
    Leaderboard should use the "branded header" pattern instead (the
    design system doc suggests branded headers are for top-level/entry
    screens, which Leaderboard arguably is).
- No background art (same recurring gap as every other screen).

## Dynasty / Packs / Hall of Fame — evaluate against handoff docs, not brand mockup

No original concept art exists for these screens — they were designed
during this project (`03-legacy-mode.md`, plus the later
broadcast-scoreboard-consistent mockups) rather than being part of the
approved mockup set the roadmap doc references. Grading these against
"fidelity to the original mockups" doesn't make sense; grade them
against their own spec docs instead. Two things worth flagging from
this audit specifically:
- `DynastyHomeScreen.tsx` has no responsive/wide-viewport handling at
  all (confirmed — no `useResponsive` usage), unlike every other screen
  in the app. This is a real inconsistency independent of visual
  fidelity.
- Per `05-game-loop-bugfixes.md`, Dynasty's actual gameplay wiring is
  incomplete — worth sequencing that fix before investing further
  design polish here, since polishing a screen that doesn't yet do what
  it claims is lower-value than fixing the wiring first.

---

## Cross-screen pattern: the background-imagery gap

Every screen in this analysis has the same gap: the brand's signature
background system (stadium header art, field footer art, dark gradient
overlays) exists as exported assets and appears in zero screens. This
is arguably the single highest-leverage, lowest-effort fix across the
whole app — one shared background component, correctly implemented
once, would move the needle on every screen's fidelity score
simultaneously, rather than fixing screens one at a time.

**Recommendation for Phase 4 sequencing:** build the shared background
component first (per `DESIGN-SYSTEM.md` §6), apply it globally, *then*
do the Draft-screen player-card fix, then everything else. That order
gets the most visible improvement for the least effort before tackling
the harder, screen-specific work.
