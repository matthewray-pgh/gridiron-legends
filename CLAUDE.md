@AGENTS.md

# Project Context for Claude Code

## Hosting & Deployment

**Decision: Cloudflare Workers (Static Assets).** Not classic Cloudflare
Pages, not GitHub Pages. Do not use `gh api .../pages`, GitHub's Let's
Encrypt cert flow, or Pages-specific conventions like a `pages_build_output_dir`
key or an auto-discovered `functions/` folder — none of those are honored
by this project's actual deploy command (`npx wrangler deploy`, the
Workers path). If you find `.github/workflows/deploy-pages.yml` (GitHub
Pages) in this repo, treat it as retired/disabled, not the active deploy
path.

> Earlier versions of this doc said "Decision: Cloudflare Pages." That was
> wrong — the Cloudflare dashboard flow this project actually goes through
> is Workers Builds (Project Name / Build command / Deploy command / API
> token screen), which deploys via `wrangler deploy`, not `wrangler pages
> deploy`. If you're about to write anything assuming classic Pages
> semantics (a `functions/` folder, `_redirects` wildcard rewrites,
> `pages_build_output_dir`), stop — it silently won't work under this
> deploy command. This has already caused two real bugs; see below.

- **Site structure (Option A, confirmed)**: marketing site and app are
  ONE Worker project, not two. Marketing lands at `/`, the game lives
  under `/play/`. This matches what `marketing/index.html` and
  `marketing/sitemap.xml` already assume (CTA links point at `/play`) —
  don't "fix" those links to point at a separate domain/subdomain.
- **Build command**: `bash scripts/build-pages.sh` (NOT a bare
  `npx expo export -p web` — that only builds the app and silently
  drops the marketing site from the deploy)
  - The script exports the Expo app into `dist/play/`, copies
    `marketing/*.html` + `sitemap.xml` + `robots.txt` into `dist/` root,
    and copies static marketing images into `dist/assets/` (kept separate
    from the app's own Metro-hashed assets under `dist/play/`).
  - It does NOT write a `dist/_redirects` file. A `/play/*` SPA-fallback
    rule in `_redirects` is rejected by Cloudflare as a self-referential
    rule (the destination matches the rule's own source pattern) and is
    silently dropped — confirmed against real deploy behavior, not a
    local quirk. Don't re-add it.
- **Deploy command**: `npx wrangler deploy`, configured via `wrangler.jsonc`
  at the repo root (`name`, `compatibility_date`, `main`, `assets.directory`,
  `assets.binding`).
- **`/play/*` SPA fallback**: handled by `src/worker.js`, the Worker's
  `main` entry point. Static asset requests (files that actually exist in
  `dist/`) are served automatically and never reach this script. Only
  requests with no matching static file — e.g. `/play/leaderboard`,
  `/play/roster/123` — fall through to `src/worker.js`, which returns
  `/play/index.html` via the `ASSETS` binding so the app's client-side
  router can take over.
  - `functions/play/[[catchall]].js` is DEAD CODE and should be deleted.
    It was written as a Cloudflare Pages Function, relying on the
    `functions/` auto-discovery convention that classic Pages has and
    Workers does not. Under `wrangler deploy`, that file is never
    invoked. `src/worker.js` is its replacement, wired in via
    `wrangler.jsonc`'s `main` field instead of folder-based discovery.
  - If you ever touch this routing, keep the `/play/` split — collapsing
    marketing and the app into one path breaks the root/app separation
    this was built to avoid.
- **Domain**: registered through Cloudflare Registrar, DNS managed in the
  same Cloudflare account.
- **Custom domain + SSL**: configured on the Worker (Custom Domains) —
  auto-provisioned, no manual DNS record juggling.
- **Analytics**: Cloudflare Web Analytics, enabled on the project
  (cookieless, no consent banner needed).
- Both `iphone-splash.png` and `social-share.png` exist under
  `marketing/assets/` — the build script still warns rather than fails
  if either goes missing, so re-check after any asset reshuffle.

If asked to change hosting/deploy config, confirm with the user before
switching away from Cloudflare Workers — this was a deliberate choice
over GitHub Pages, classic Cloudflare Pages, and Vercel.

## AdSense & SEO

- **`/play` is intentionally indexable — do NOT add `noindex` to it.**
  This was tried (as of a build script version around 2026-08-27) and
  reversed on 2026-09-05. Reasoning: `/play` is a client-side-rendered
  SPA shell that Google's crawlers can't execute JS on regardless of
  indexing settings, but `noindex` additionally told Google to disregard
  it entirely during content evaluation — which meant AdSense's "low
  value content" review saw only marketing copy *about* a product it was
  explicitly told to ignore, not the product itself. That's suspected to
  have made the low-value-content flag worse, not better. If this comes
  up again, don't re-add `noindex` as the fix without discussing it with
  the user first — check whether the actual cause is something else
  (page discoverability, nav links, sitemap entries) before touching this
  again.
- `/play` should still stay excluded from **ad serving** specifically —
  that's a separate, still-valid concern (no ad script is added to
  `dist/play/index.html`; AdSense's Page Exclusions tool can also be used
  once available for the account). Indexing and ad-placement exclusion
  are two different levers — don't conflate them again.
- `marketing/how-to-play.html` and `marketing/faq.html` were added
  (see `docs/handoff/15-marketing-content-expansion.md`) specifically to
  address an AdSense "low value content" flag. Keep these linked from
  `index.html`'s nav/footer and listed in `sitemap.xml` — an unlinked,
  un-sitemapped page doesn't help the content-quality evaluation even if
  it's technically live at a URL.

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
+ Storage), called client-side from the existing Cloudflare Workers
frontend — not a switch to a different hosting platform. If deeper custom
server logic is ever needed beyond what Supabase covers, extend
`src/worker.js` directly rather than standing up a separate server.