#!/usr/bin/env bash
# Builds a single Cloudflare Workers deploy that merges two things into one
# dist/ output:
#   - the marketing landing page + legal pages, served at the domain root
#   - the Expo web app (the actual game), served under /play/
#
# Cloudflare dashboard settings (Workers Builds):
#   Build command:   bash scripts/build-pages.sh
#   Deploy command:  npx wrangler deploy   (reads wrangler.jsonc for the rest)
set -euo pipefail

echo "==> Cleaning dist/"
rm -rf dist
mkdir -p dist

echo "==> Building the app into dist/play/"
npx expo export -p web --output-dir dist/play

# The app is a client-side-rendered SPA — Google's crawlers (both regular
# search indexing and AdSense's content-quality review) don't execute JS,
# so they'd otherwise see an empty shell here and count it as thin/low-value
# content against the whole site. noindex tells them to skip evaluating
# this section as content at all, keeping review scoped to the marketing
# pages, which have real crawlable text.
echo "==> Marking dist/play/ as noindex (SPA shell, not crawlable content)"
sed -i.bak 's#<head>#<head>\n    <meta name="robots" content="noindex, follow">#' dist/play/index.html
rm -f dist/play/index.html.bak

echo "==> Copying marketing site into dist/"
cp marketing/index.html       dist/index.html
cp marketing/about.html       dist/about.html
cp marketing/how-to-play.html dist/how-to-play.html
cp marketing/faq.html         dist/faq.html
cp marketing/privacy.html     dist/privacy.html
cp marketing/terms.html       dist/terms.html
cp marketing/contact.html     dist/contact.html
cp marketing/sitemap.xml      dist/sitemap.xml
cp marketing/robots.txt       dist/robots.txt
cp marketing/ads.txt          dist/ads.txt

# Marketing's HTML references images with literal, unhashed paths
# (assets/stadium-bg.png, assets/field-bg.png, /assets/favicon.png, etc.).
# The app's own assets/ folder is Metro-bundled and gets content-hashed on
# export (see docs/handoff/14), so those hashed files under dist/play/
# won't match those literal paths. Instead, copy stable, unhashed copies
# into dist/assets/ at the root, kept separate from the app's own hashed
# asset output under dist/play/ so there's no collision.
echo "==> Copying static marketing assets into dist/assets/"
mkdir -p dist/assets

copy_marketing_asset() {
  local name="$1"
  if [ -f "marketing/assets/${name}" ]; then
    cp "marketing/assets/${name}" "dist/assets/${name}"
  elif [ -f "assets/${name}" ]; then
    cp "assets/${name}" "dist/assets/${name}"
  else
    echo "    WARNING: ${name} not found in marketing/assets/ or assets/ — marketing page will have a broken image/link until this is added." >&2
  fi
}

copy_marketing_asset "stadium-bg.png"
copy_marketing_asset "field-bg.png"
copy_marketing_asset "favicon.png"
copy_marketing_asset "icon.png"
copy_marketing_asset "iphone-splash.png"   # referenced in the CTA band
copy_marketing_asset "social-share.png"    # referenced by OG/Twitter meta tags

# NOTE: no _redirects file is written here anymore. A /play/* SPA-fallback
# rule in _redirects gets rejected by Cloudflare as a self-referential
# rule (destination matches the rule's own source pattern) and is silently
# dropped. That fallback is instead handled by src/worker.js at deploy
# time via the ASSETS binding — see wrangler.jsonc's "main" field.

echo "==> Done. dist/ is ready to deploy:"
echo "    dist/index.html        (marketing landing page)"
echo "    dist/about.html, how-to-play.html, faq.html, privacy.html, terms.html, contact.html"
echo "    dist/sitemap.xml, robots.txt"
echo "    dist/assets/*          (marketing images)"
echo "    dist/play/*            (the game, Expo web export)"
echo "    /play/* SPA fallback handled by src/worker.js, not this script"