# 11 — Reset fix, PWA icon, reward-screen layout

Three smaller items, independent of each other and of doc 09's ad
economy — grouped here only because they landed in the same request.

The undefeated-season (20-0) retirement mechanic that was originally
item 4 here has been split out into its own brainstorming conversation
— it's a real Dynasty-loop design decision (see doc 08's persistent-
roster model), not a quick spec note, so it deserves its own space
rather than being squeezed in alongside these three smaller fixes.

## 1. `resetDynasty()` should not clear Rings

**Current behavior** (`src/store/dynastyStore.ts`): `resetDynasty()`
sets state to `INITIAL_DYNASTY_STATE`, which includes `rings: 0` —
confirmed by `DynastyHomeScreen.tsx`'s own reset confirmation copy:
`RESET_MESSAGE = 'This clears your roster, bench, Rings, record, and
Hall of Fame back to Season 1.'`

**Change:** roster, bench, `allTimeRecord`, Hall of Fame, owned packs,
and `currentSeason` still reset to Season 1 as before — Rings do not.

```ts
resetDynasty: () => {
  const { rings } = get();
  set({ ...INITIAL_DYNASTY_STATE, rings });
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  // Rings aren't persisted by the removeItem above going out — re-persist
  // immediately so the preserved balance survives a reload, not just the
  // in-memory state.
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersistedState(get()))).catch(() => {});
},
```

> Note the `AsyncStorage.removeItem` immediately followed by a
> re-`setItem` is deliberate, not redundant — the wipe clears the old
> save wholesale, then the Rings balance is written back on its own so
> a crash between the two calls fails safe (empty save, not a corrupt
> partial one).

**Also update:** `RESET_MESSAGE` in `DynastyHomeScreen.tsx` — remove
"Rings" from the clears-list so the confirmation copy matches actual
behavior:

```ts
const RESET_MESSAGE = 'This clears your roster, bench, record, and Hall of Fame back to Season 1. Your Rings balance is kept. This cannot be undone.';
```

### Acceptance criteria
- [x] `resetDynasty()` preserves `rings`, resets everything else in
      `INITIAL_DYNASTY_STATE`
- [x] Preserved Rings balance survives an app reload immediately after
      reset (not just before the next `earnRings`/`buyPack` call)
- [x] `RESET_MESSAGE` copy updated to match
- [x] `__DEV__`-gated reset button (`handleDevGrantRings` neighbor in
      `DynastyHomeScreen.tsx`) exercises the same path — no separate
      dev-only reset implementation (there was only ever one
      `handleResetDynasty`, reused by the toolbar shortcut and the
      player-facing button alike; nothing to change here)

---

## 2. App icon as PWA / "Add to Home Screen" icon

Current state: `app.json`'s `web` config only sets `favicon` — there's
no web manifest, so mobile browsers' "Add to Home Screen" currently
falls back to a screenshot or a generic icon, not a real app icon.
`experiments.baseUrl` confirms this is served as a static GH-Pages-style
web build, not through `expo-router`'s newer web tooling, so this needs
a manual manifest, not just an Expo config flag.

**What's needed:**
1. A real `manifest.json` (or `manifest.webmanifest`) at the web root,
   referencing icon assets at minimum 192×192 and 512×512 (512 with a
   `"purpose": "maskable"` variant is worth including too, since
   Android's adaptive-icon masking otherwise crops a plain square
   icon oddly).
2. `<link rel="manifest">` plus `<link rel="apple-touch-icon">` (iOS
   Safari doesn't read the manifest for its home-screen icon — needs
   its own explicit tag) in the web build's HTML head. Expo web's
   `index.html` template is the place for this, or `app.json`'s `web`
   block if the Expo version being used supports manifest injection
   directly — confirm which before implementing.
3. `theme_color` / `background_color` in the manifest, matching
   `Colors.bgDark`/`Colors.gold` from `theme/colors.ts` — don't
   hardcode separate hex values here.

> RESOLVED (confirmed with user): icon art already exists and is
> final — the disagreement between doc 01's two versions is moot, this
> doesn't need a designer pass. Export the existing art at the sizes
> listed below (192, 512, 512 maskable) rather than the placeholder
> vector referenced anywhere earlier. Drop the exports into `assets/`
> alongside the existing `icon.png`/`android-icon-*.png` set, named
> consistently with that pattern (e.g. `assets/pwa-icon-192.png`,
> `assets/pwa-icon-512.png`, `assets/pwa-icon-512-maskable.png`).

### Acceptance criteria
- [x] Manifest exists, referenced from the web build's HTML head
- [x] Icons present at 192×192 and 512×512 minimum, one 512 maskable
      variant included
- [x] iOS `apple-touch-icon` tag present separately from the manifest
- [ ] "Add to Home Screen" on both iOS Safari and Android Chrome shows
      the real app icon, not a screenshot fallback — **needs an on-device
      test, not done here** (verified via `curl` that the dev server
      serves `manifest.json`/the icons/the `<link>` tags correctly, and
      visually reviewed each exported PNG, but an actual iOS/Android
      "Add to Home Screen" pass needs a real device or Safari/Chrome
      remote-debug session)
- [x] `theme_color`/`background_color` values match `theme/colors.ts`
      tokens (`gold`/`bgDark`) — see the sync-reminder comment added
      next to those tokens; `manifest.json` and `app.json` can't
      `import` from TS, so they're hex-literal copies, not derived

### Implementation notes
- Files live under a new top-level `public/` folder
  (`manifest.json`, `index.html`, `pwa-icon-192.png`, `pwa-icon-512.png`,
  `pwa-icon-512-maskable.png`, `apple-touch-icon.png`), not `assets/` as
  originally proposed. `assets/` is Metro-bundled and hashed on export —
  fine for images `require()`'d from JS, but a static `manifest.json`'s
  `icons[].src` and a hand-written `<link>` tag need a literal, stable
  URL. `public/` is Expo's existing escape hatch for exactly that (it's
  also how a user-supplied `public/index.html` overrides the built-in
  template, confirmed by reading `@expo/cli`'s `webTemplate.js`/
  `publicFolder.js` directly against the installed `expo ~54.0.0`, since
  `AGENTS.md`'s pinned v56 docs don't match the installed version).
  `assets/icon.png` (the actual brand mark) is the source these were
  exported from; it's untouched.
- Icon source art (`assets/icon.png`) is 301×279, not square, and has no
  alpha channel — its own corner pixels are already effectively
  `#070A0E` (`Colors.bgDark`), so padding it to a square canvas with that
  same color before resizing is a seamless, not a visible, border.
- Separately noticed but out of scope for this doc: `assets/favicon.png`
  and all three `android-icon-*.png` files are still the stock Expo
  template placeholder art (a blue chevron), not the real brand mark —
  the browser-tab favicon and the native Android adaptive icon are still
  wrong. This doc only covers the PWA "Add to Home Screen" icon; flagged
  here rather than fixed silently or left unmentioned.

---

## 3. Reward-screen buttons — 50/50 split on mobile

`ResultScreen.tsx`'s existing action row already does this — worth
confirming it's actually the pattern in question before building
anything new:

```ts
actions: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
shareBtn: { flex: 1 },
againBtnWrap: { flex: 1 },
```

Two `flex: 1` siblings in a `flexDirection: 'row'` container is
already an even 50/50 split at any width, mobile included. If this is
what's being asked for, it's already shipped and just needs
confirming on-device.

**If instead this refers to the not-yet-built ad-reward moments from
doc 09** (Shop ad-watch confirm/skip, season-end pack-upgrade
accept/watch-ad) — those screens don't exist yet, so this is really a
spec note for when they're built: reuse this exact same
`flexDirection: 'row'` + two `flex: 1` buttons pattern rather than
inventing a new layout, so reward-decision moments look consistent
app-wide.

> DECISION NEEDED: confirm which screen this refers to — the existing
> `ResultScreen` action row, or the upcoming ad-reward screens from
> doc 09 — since the former may already be done.

**Resolved:** both. `ResultScreen.tsx`'s original `actions` row
(`shareBtn`/`againBtnWrap`, both `flex: 1` in a `flexDirection: 'row'`
container) was already this pattern, unchanged. Doc 09's ad-reward
moments have since been built (season-end pack-upgrade accept/watch-ad,
and its odds-sheet accept/watch-ad footer) and independently ended up
using the identical row + two-`flex: 1`-siblings pattern
(`seasonRewardActions`/`seasonRewardBtn`,
`seasonRewardSheetActions`/`seasonRewardSheetBtn`) — no changes needed
here, just confirming consistency held.


