// Workers entry point for this project's static site + SPA fallback.
//
// How this fits together:
//   - wrangler.jsonc's "assets.directory" (./dist) is served automatically
//     for any request that matches a real file — index.html, about.html,
//     /play/index.html, /play/_expo/static/js/..., etc. This script is
//     NOT invoked for those; Cloudflare serves them directly.
//   - This script only runs when NO static asset matched the request path.
//     That happens for deep links into the app's client-side routes, e.g.
//     /play/leaderboard or /play/roster/123 — real files don't exist at
//     those paths, only /play/index.html does, and the app's own router
//     (React Navigation) is what actually resolves them once loaded.
//
// This replaces the earlier functions/play/[[catchall]].js Pages Function,
// which relied on Cloudflare Pages' auto-discovered `functions/` folder
// convention — that convention is NOT honored by `wrangler deploy` (the
// Workers deploy path this project actually uses), so that file was being
// silently ignored. Delete functions/play/[[catchall]].js once this is in
// place; it's dead code under the current deploy command.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/play" || url.pathname.startsWith("/play/")) {
      // Fetch "/play/" (trailing slash), not "/play/index.html" directly —
      // Cloudflare's default html_handling 307-redirects explicit
      // "index.html" requests to their directory path. env.ASSETS.fetch()
      // would hand back that redirect response instead of the page, and a
      // client following it loses the original /play/<route> path before
      // React Navigation ever sees it. "/play/" hits the same file via
      // implicit directory-index resolution with no redirect involved.
      const indexUrl = new URL("/play/", url.origin);
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    // No static asset matched and it's not a /play/* path — a genuine 404.
    return new Response("Not found", { status: 404 });
  },
};
