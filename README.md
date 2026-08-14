# Gridiron Legends

Gridiron Legends is a mobile/web game built with Expo + React Native where players spin for era-locked players to draft all-time football rosters and simulate a 20-game season.

This repository currently includes:
- Home, Spin, Two-Minute Drill, Game, Results, Leaderboard, Dynasty, Shop, Pack Opening, and Hall of Fame screens
- Spin-to-reveal roster drafting flow, with a "Lock It In" skill-spin variant (Two-Minute Drill)
- Multiple game modes: Daily Challenge, Classic, Offense Only, Two-Minute Drill, and Dynasty (persistent-save mode with Rings currency, packs, and retirement/Hall of Fame)
- Season simulation and share output
- A marketing site (`marketing/`) served alongside the app under `/play/`
- Zustand state management and typed navigation
- Feature flags (`src/config/featureFlags.ts`) gating Dynasty, Leaderboard, Hall of Fame, and ad placements independently

## Tech Stack

- Expo SDK 54
- React Native + TypeScript
- React Navigation (native stack)
- Zustand
- React Native Reanimated
- react-native-google-mobile-ads (AdMob, rewarded ads)
- Hosted on Cloudflare Workers (see `CLAUDE.md` for deploy details)

## Getting Started

## Prerequisites

- Node.js 20+
- npm 10+
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)

## Install

```bash
npm install
```

## Run

```bash
npx expo start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web preview

## Project Structure

```text
src/
  components/
  data/
  navigation/
  screens/
  store/
  theme/
App.tsx
app.json
```

## Available Scripts

```bash
npm run start
npm run android
npm run ios
npm run web
npm run generate:data
```

## Testing

End-to-end tests cover the web build only, using [Playwright](https://playwright.dev/).

```bash
npx playwright install --with-deps chromium  # first time only
npm run test:e2e
```

`npm run test:e2e:ui` opens Playwright's UI mode for debugging. The suite
boots the app itself (`expo start --web`), so there's no need to start the
dev server separately first.

## Data Generation

Generate player-era records from nfl_data_py:

```bash
npm run generate:data
```

Output file:
- `data_generator/outputs/nfl_era_players.json`

Direct Python command (equivalent):

```bash
cd data_generator
../.venv/bin/python generator.py
```

## Deployment

Hosted on Cloudflare Workers (static assets + `src/worker.js` for `/play/*`
SPA-fallback routing), deployed automatically via Workers Builds on every
push to `main`. Build locally with:

```bash
bash scripts/build-pages.sh
```

This exports the Expo web app into `dist/play/` and copies the marketing
site (`marketing/`) into `dist/` root as one combined deploy — marketing
lands at `/`, the game at `/play/`. See `CLAUDE.md` for the full hosting
history and rationale.

## Gameplay Notes

- Draft positions: QB, RB, WR, TE, FLEX, EDGE, DT, LB, CB, S, D-FLEX (Offense Only mode drops to 9 offense-side slots)
- Each round spins a team + era; the resulting candidate pool is filtered to players eligible for a still-open slot and not already drafted into another slot
- Two-Minute Drill adds a timed "Lock It In" mechanic on top of the spin for reroll/OVR bonuses
- Daily Challenge uses a seeded RNG so every player gets the same spins/results on a given calendar day
- Dynasty mode persists a roster across seasons (AsyncStorage-backed), earning Rings currency and packs, with retired players tracked in Hall of Fame
- Final roster simulates a full 20-game run

## Product Direction

Planned milestones:
- Real backend (Supabase — Postgres + Auth + Storage, called client-side; a thin Cloudflare Workers layer if deeper server logic is ever needed)
- Cross-device sync for roster/streak/Dynasty progress (currently client-side only via AsyncStorage)
- Leaderboard and cross-device Hall of Fame, both gated behind the future backend
- Async friend challenges and matchmaking
- Push notifications and achievements

## TODO

- Reintroduce a "More Games" section on Home as a future cross-sport expansion (hidden in current MVP).

## Legal

This game is not affiliated with or endorsed by the NFL, NFLPA, or any NFL team.

Use of official NFL team logos, uniforms, helmet designs, and other protected branding is intentionally avoided.

## Repository

Private GitHub repository:
https://github.com/matthewray-pgh/gridiron-legends
