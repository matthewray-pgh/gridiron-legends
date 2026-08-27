# Handoff: Expand marketing site content (AdSense low-value-content fix)

## Why this exists

AdSense flagged the site with two related policy issues:
1. "Google-served ads on screens without publisher-content" — traced to
   `/play` being a client-side-rendered SPA that Google's crawler can't
   read as content (fixed separately via `noindex` in `build-pages.sh`
   and, if needed, an Auto ads page exclusion — see CLAUDE.md).
2. **"Low value content"** — a separate, broader finding about the site
   as a whole. After excluding `/play`, what's left crawlable is one
   landing page plus four short, templated legal pages (privacy, terms,
   about, contact). That's not enough substantial original text for
   Google's network. This doc is about fixing *that* half.

**Goal:** add genuine, original, useful text content to the marketing
site — not padding for the sake of word count. Google's own guidance
explicitly penalizes thin/auto-generated content, so filler risks making
this worse, not better.

## Pages to add

Ordered by expected impact (most likely to move the needle first).

### 1. `marketing/how-to-play.html` — highest priority

A genuine explainer of the game's mechanics. This is the single best fit:
content Claude Code (or whoever's writing it) can produce accurately
since it's just documenting existing game logic, not inventing marketing
copy.

Suggested sections:
- **The core loop** — draft a roster of all-time-great players, simulate
  a 20-game season, see if you go undefeated. Explain in real paragraphs,
  not bullet fragments.
- **How the draft works** — pool of players across eras/positions/teams,
  roster construction rules, whatever constraints exist (position limits,
  overall roster size, etc.)
- **Game modes explained** — Daily Challenge, Classic, Offense Only,
  Two-Minute Drill. A real paragraph each, not just a one-line label list
  (the existing `about.html` already lists these thin — expand here with
  actual explanation of what's different about each).
- **What OVR/stats mean** — if the game surfaces an overall rating or
  stat categories to the player, explain what goes into it.
- **How the season simulation works** — at a level of detail that's
  genuinely informative (not revealing exploitable internals if that's a
  concern, just enough to be real explanatory content).
- **Dynasty mode** — since `DYNASTY_ENABLED` is live, explain what
  persists across seasons, what the mode adds.

### 2. `marketing/faq.html`

Real questions a new player would actually have, answered plainly.
Starting list (expand/replace based on actual player questions once any
exist):
- How is the season simulated — is it random, stat-based, both?
- What does OVR mean and how is it calculated?
- How often does the Daily Challenge roster change?
- Is my progress saved? (Answer honestly: client-side only right now,
  per the "Future Backend" section of CLAUDE.md — don't overstate
  persistence that doesn't exist yet.)
- Is this affiliated with the NFL? (Reinforce the disclaimer already
  used elsewhere — fine to repeat verbatim here.)
- Is it free? Are there ads?

### 3. Expand `marketing/about.html`

Current version is short. Add real paragraphs on:
- The actual origin/motivation for building this (already has a stub
  for this — flesh it out with the real story, not a placeholder)
- How the roster pool was assembled/curated
- What makes the simulation approach different from just picking winners

## What NOT to do

- Don't AI-generate filler paragraphs that restate the same three facts
  in different words to hit a word count — Google's thin-content
  detection is explicitly aimed at exactly this pattern.
- Don't duplicate content verbatim across pages (e.g. don't copy the
  same "core loop" paragraph into both `how-to-play.html` and
  `about.html` — cover the same ground from different angles instead).
- Don't invent claims about persistence, multiplayer, or features that
  don't exist yet (checked against `featureFlags.ts` current state).

## Implementation checklist

- [x] Write `marketing/how-to-play.html`, `marketing/faq.html` following
      the existing page style/theme (see `marketing/privacy.html` for the
      CSS variables and layout pattern already in use)
- [x] Expand `marketing/about.html` in place
- [x] Add both new pages to `marketing/sitemap.xml`
- [x] Add nav links to How to Play / FAQ from `marketing/index.html`'s
      header/footer, alongside the existing Privacy/Terms/About/Contact
      links
- [x] Update `scripts/build-pages.sh` to copy the two new files into
      `dist/` (same pattern as the existing `cp marketing/about.html
      dist/about.html` lines)
- [x] Update `CLAUDE.md`'s trust-page list to include the new pages
- [ ] Once live, resubmit via AdSense Policy Center (mark the "low value
      content" issue as fixed, request re-review) — don't submit until
      this content is actually deployed and crawlable
