#!/usr/bin/env bash
# Builds a single Cloudflare Pages deploy that merges two things into one
# dist/ output:
#   - the marketing landing page + legal pages, served at the domain root
#   - the Expo web app (the actual game), served under /play/
#
# Cloudflare Pages settings:
#   Build command:    bash scripts/build-pages.sh
#   Output directory: dist
set -euo pipefail

echo "==> Cleaning dist/"
rm -rf dist
mkdir -p dist

echo "==> Building the app into dist/play/"
npx expo export -p web --output-dir dist/play

# SPA fallback: any deep link under /play/... (e.g. /play/leaderboard) needs
# to still load the app's index.html so client-side routing can take over.
cp dist/play/index.html dist/play/404.html

echo "==> Copying marketing site into dist/"
cp marketing/index.html   dist/index.html
cp marketing/about.html   dist/about.html
cp marketing/privacy.html dist/privacy.html
cp marketing/contact.html dist/contact.html
cp marketing/sitemap.xml  dist/sitemap.xml
cp marketing/robots.txt   dist/robots.txt

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
copy_marketing_asset "iphone-splash.png"   # TODO: confirm this exists — referenced in the CTA band
copy_marketing_asset "social-share.png"    # TODO: known-missing per earlier OG/Twitter meta tag TODOs

echo "==> Writing _redirects for SPA routing under /play/"
cat > dist/_redirects <<'EOF'
/play    /play/index.html   200
/play/*  /play/index.html   200
EOF

echo "==> Done. dist/ is ready to deploy:"
echo "    dist/index.html        (marketing landing page)"
echo "    dist/about.html, privacy.html, contact.html"
echo "    dist/sitemap.xml, robots.txt"
echo "    dist/assets/*          (marketing images)"
echo "    dist/play/*            (the game, Expo web export)"
echo "    dist/_redirects        (SPA fallback for /play/*)"