// SPA fallback for deep links under /play/* (e.g. /play/leaderboard, refreshed
// or bookmarked routes). Cloudflare's own _redirects engine rejects a
// `/play/*  /play/index.html  200` rule as a self-referential infinite loop
// (the destination matches the rule's own source pattern), so that rewrite
// can't be expressed in dist/_redirects. This Function only runs when no
// static file matched the request path, and returns the app's index.html
// as a genuine 200 so client-side routing can take over.
export async function onRequest(context) {
  const indexUrl = new URL("/play/index.html", context.request.url);
  return context.env.ASSETS.fetch(indexUrl);
}
