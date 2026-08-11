@AGENTS.md

# Project Context for Claude Code

## Hosting & Deployment

**Decision: Cloudflare Pages.** Do not use GitHub Pages, `gh api .../pages`,
or GitHub's Let's Encrypt cert flow — that was an earlier, rejected approach
and is not what's deployed. If you find `.github/workflows/deploy-pages.yml`
(GitHub Pages) in this repo, treat it as retired/disabled, not the active
deploy path.

- **Site structure (Option A, confirmed)**: marketing site and app are
  ONE Cloudflare Pages project, not two. Marketing lands at `/`, the game
  lives under `/play/`. This matches what `marketing/index.html` and
  `marketing/sitemap.xml` already assume (CTA links point at `/play`) —
  don't "fix" those links to point at a separate domain/subdomain.
- **Build command**: `bash scripts/build-pages.sh` (NOT a bare
  `npx expo export -p web` — that only builds the app and silently
  drops the marketing site from the deploy)
  - Output directory: `dist`
  - The script: exports the Expo app into `dist/play/`, copies
    `marketing/*.html` + `sitemap.xml` + `robots.txt` into `dist/` root,
    copies static marketing images into `dist/assets/` (kept separate
    from the app's own Metro-hashed assets under `dist/play/`), and
    writes a `dist/_redirects` file.
  - **`/play/*` deep-link fallback is handled by a Pages Function, not
    `_redirects`.** Cloudflare's redirects engine rejects
    `/play/*  /play/index.html  200` as a self-referential infinite loop
    (the destination matches the rule's own source pattern) and silently
    drops it — confirmed against `wrangler pages dev`, not just a local
    quirk. `functions/play/[[catchall]].js` (repo root, alongside
    `marketing/` and `scripts/`) is the actual fallback: it catches any
    `/play/*` request with no matching static file and returns
    `/play/index.html` via `env.ASSETS.fetch()` with a real 200. Without
    it, Cloudflare's nested-`404.html` behavior still serves the right
    app content, but with a 404 status instead of 200.
  - If you ever touch this script, keep the `/play/` split — removing it
    breaks the root/app collision this was built to avoid. The
    `_redirects` file's `/play` (no trailing slash) rule is still valid
    and needed; don't assume its rejected `/play/*` line does anything.
- **Hosting**: Cloudflare Pages, Git-integrated — builds and deploys
  automatically on every push to `main`; every PR gets its own preview URL
- **Domain**: registered through Cloudflare Registrar, DNS managed in the
  same Cloudflare account
- **Custom domain + SSL**: configured entirely inside the Cloudflare Pages
  project (Custom Domains tab) — auto-provisioned, no manual DNS record
  juggling and no GitHub-side cert flow involved
- **Analytics**: Cloudflare Web Analytics, enabled on the Pages project
  (cookieless, no consent banner needed)
- Both `iphone-splash.png` and `social-share.png` exist under
  `marketing/assets/` — the build script still warns rather than fails
  if either goes missing, so re-check after any asset reshuffle.

If asked to change hosting/deploy config, confirm with the user before
switching away from Cloudflare Pages — this was a deliberate choice over
GitHub Pages and Vercel.

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
