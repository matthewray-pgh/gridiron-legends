# Gridiron Legends

Gridiron Legends is a mobile game prototype built with Expo + React Native where players draft all-time football rosters and simulate a 20-game season.

This repository currently includes:
- Home, Game, Results, and Leaderboard screens
- Keep/Pass roster drafting flow
- Multiple game modes (Daily, Classic, Gridiron IQ)
- Season simulation and share output
- Zustand state management and typed navigation

## Tech Stack

- Expo SDK 54
- React Native + TypeScript
- React Navigation (native stack)
- Zustand
- React Native Reanimated

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

## Gameplay Notes

- Draft positions: QB, RB, WR, TE, FLEX, EDGE, DT, LB, CB, S, D-FLEX
- Keep or Pass each player card
- Pass limits depend on mode
- Final roster simulates a full 20-game run

## Product Direction

Planned milestones:
- Real backend services (Supabase + Fastify)
- Daily global seed generation
- Persistent profiles and streak tracking
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
