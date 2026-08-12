@AGENTS.md

# Project Context for Claude Code

## Hosting & Deployment

**Decision: Cloudflare Workers (static assets + a custom worker script),
via Workers Builds.** Originally deployed as Cloudflare Pages (Git-integrated);
migrated to Workers on 2026-08-12 to get a real worker script for `/play/*`
SPA-fallback routing (Pages' `_redirects` couldn't express that rule — see
below). Do not use GitHub Pages, `gh api .../pages`, or GitHub's Let's
Encrypt cert flow — that was an earlier, rejected approach and is not what's
deployed. If you find `.github/workflows/deploy-pages.yml` (GitHub Pages) in
this repo, treat it as retired/disabled, not the active deploy path.

- **Site structure (Option A, confirmed)**: marketing site and app are
  ONE Cloudflare project, not two. Marketing lands at `/`, the game
  lives under `/play/`. This matches what `marketing/index.html` and
  `marketing/sitemap.xml` already assume (CTA links point at `/play`) —
  don't "fix" those links to point at a separate domain/subdomain.
- **Build command**: `bash scripts/build-pages.sh` (NOT a bare
  `npx expo export -p web` — that only builds the app and silently
  drops the marketing site from the deploy)
  - Output directory: `dist`
  - The script: exports the Expo app into `dist/play/`, copies
    `marketing/*.html` + `sitemap.xml` + `robots.txt` into `dist/` root,
    and copies static marketing images into `dist/assets/` (kept
    separate from the app's own Metro-hashed assets under `dist/play/`).
  - It no longer writes a `dist/_redirects` file — `/play/*` fallback is
    handled by `src/worker.js` instead (see below). If you ever touch
    this script, keep the `/play/` split — removing it breaks the
    root/app collision this was built to avoid.
- **`/play/*` SPA fallback is `src/worker.js`, not `_redirects`.**
  Cloudflare's redirects engine rejects `/play/*  /play/index.html  200`
  as a self-referential infinite loop (the destination matches the
  rule's own source pattern) and silently drops it — confirmed against
  `wrangler pages dev`'s actual redirects engine, not a local quirk. An
  earlier fix used a Pages Function (`functions/play/[[catchall]].js`),
  but Pages Functions' auto-discovered `functions/` folder convention is
  not honored by `wrangler deploy` (the Workers deploy path this project
  now uses) — that file was deleted as dead code once `src/worker.js`
  took over the same job via `wrangler.jsonc`'s `main` field and the
  `assets.binding: "ASSETS"` binding.
- **Hosting**: Cloudflare Workers, via Workers Builds (Git-integrated) —
  builds and deploys automatically on every push to `main`. The
  Cloudflare dashboard project must be configured for Workers Builds,
  not classic Pages Git integration, with deploy command
  `npx wrangler deploy` (reads the rest from `wrangler.jsonc`).
- **Domain**: registered through Cloudflare Registrar, DNS managed in the
  same Cloudflare account
- **Custom domain + SSL**: configured entirely inside the Cloudflare
  Workers project (Custom Domains / Triggers) — auto-provisioned, no
  manual DNS record juggling and no GitHub-side cert flow involved
- **Analytics**: Cloudflare Web Analytics, enabled on the project
  (cookieless, no consent banner needed)
- Both `iphone-splash.png` and `social-share.png` exist under
  `marketing/assets/` — the build script still warns rather than fails
  if either goes missing, so re-check after any asset reshuffle.

If asked to change hosting/deploy config again, confirm with the user
before switching away from Cloudflare Workers — this migration from Pages
was itself a deliberate, confirmed choice, not an accident to revert.

## Monetization & Legal

- Google AdSense is the target ad provider. AdSense requires a live,
  fully-functional site on the real domain before applying — do not treat
  "add ads" as a pre-launch blocker; it comes after the site is live.
- `marketing/privacy.html`, `marketing/about.html`, `marketing/contact.html`,
  `marketing/terms.html` exist to satisfy AdSense's trust-page requirements
  (Terms of Use isn't an AdSense requirement itself, but was added for
  liability coverage and to reinforce the NFL non-affiliation language).
  They contain `TODO` comments for the real domain and contact email —
  check these are filled in before treating the site as launch-ready.
- Legal disclaimer (NFL non-affiliation) must remain visible; this project
  is not affiliated with or endorsed by the NFL, NFLPA, or any NFL team.

## Feature Flags (`src/config/featureFlags.ts`)

- `SHOW_DEBUG_OVR` — testing-only, **must be `false`** before any
  production deploy. Flag it if you ever see this set to `true` on a
  branch heading toward `main`.
- `LEADERBOARD_ENABLED`, `HALL_OF_FAME_ENABLED` — currently off; these are
  gated on a future backend (see below), not just a flag flip.
- `DYNASTY_ENABLED` — currently on, live in production.

## Future Backend

No backend currently exists — all gameplay data (roster, streaks, dynasty
progress) is stored client-side via AsyncStorage and does not sync across
devices. When a backend is needed (for leaderboards, Hall of Fame, or
cross-device saves), the planned direction is **Supabase** (Postgres + Auth
+ Storage), called client-side from the existing Cloudflare Pages frontend
— not a switch to a different hosting platform. If deeper custom server
logic is ever needed beyond what Supabase covers, add it as a thin
Cloudflare Workers layer alongside Pages rather than standing up a
separate server.