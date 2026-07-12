# Handoff: Home screen, Spin mechanic, Legacy mode

Design source: `gridiron-legends-redesign-concepts.html`,
`gridiron-legends-legacy-concepts.html`, and
`gridiron-legends-home-directions.html` (static HTML mockups, not code —
reference for layout/copy/hierarchy only, not for implementation
approach).

**Home screen note:** the first two mockup files each contain an earlier
home screen exploration using a rounded gold-card visual style. Those are
superseded — the finalized home screen direction is version C
("Broadcast scoreboard") in `gridiron-legends-home-directions.html`,
detailed in `01-home-screen.md`. Don't build from the earlier home screen
sections in the other two files; they're kept only because their Spin
and Legacy sections are still current.

This handoff is split into four docs, meant to be implemented roughly in
order since each builds on the last:

1. `01-home-screen-and-icon.md` — home screen redesign, app icon concepts
2. `02-spin-mechanic-and-two-minute-drill.md` — "Lock It In" timing mechanic,
   new Two-Minute Drill mode
3. `03-legacy-mode.md` — dynasty persistence, Rings currency, player/perk
   packs, Hall of Fame
4. Open questions are called out inline in each doc as `> DECISION NEEDED:` —
   do not invent an answer, stop and ask the user or leave a clearly marked
   TODO / feature flag instead of guessing at game-balance numbers.

## Codebase context (as of this handoff)

- Expo + React Native, TypeScript, Zustand for state, React Navigation
  (native-stack) for routing.
- Repo: `matthewray-pgh/gridiron-legends`. A web-only conversion (React,
  dropping Expo/React Native) may be in progress locally and not yet
  pushed — if so, the state shape and game logic in this handoff still
  applies, only the view layer (React Native components → DOM/CSS) and
  navigation (`@react-navigation` → e.g. React Router) change. Confirm
  which branch/stack you're actually working against before starting.
- Existing relevant files:
  - `src/store/gameStore.ts` — core draft/spin/roster state (Zustand)
  - `src/store/statsStore.ts` — streak, leaderboard, best record
  - `src/theme/colors.ts` — `Colors`, `Typography`, `Spacing`, `Radius`,
    `Font` tokens. Reuse these; do not hardcode new hex values.
  - `src/navigation/types.ts` — `RootStackParamList`
  - `src/navigation/AppNavigator.tsx`
  - `src/screens/{Home,Spin,Game,Result,Leaderboard}Screen.tsx`
  - `src/components/{PlayerCard,StatusBar}.tsx`
  - `src/data/players.ts` — player pool + spin combo helpers

Note that `GameState.mode` in `gameStore.ts` is already typed as
`'daily' | 'classic' | 'iq' | 'timer'`, and `MAX_PASSES_BY_MODE` already has
a `timer: 3` entry. That `'timer'` slot is the natural home for the new
Two-Minute Drill mode — see doc 02 for whether to rename it or add
alongside it.

## Brand tokens (already in `theme/colors.ts`, do not redefine)

| Token | Value |
|---|---|
| `Colors.bgPrimary` | `#0B0F14` |
| `Colors.gold` | `#D4A017` |
| `Colors.gridironBlue` | `#123B5D` |
| `Colors.steel` | `#A7B1BC` |
| `Colors.textPrimary` | `#F5F7FA` |

New tokens needed for this work (not yet in `colors.ts`) — add these
rather than inlining hex:

```ts
// rarity tiers for packs (doc 03)
rarityCommon: '#A7B1BC',
rarityRare: '#3E8DE0',
rarityElite: '#9B6FE3',
rarityLegend: '#F0C24B', // distinct from Colors.gold — used only for pack reveal glow
```

## General implementation rules for this handoff

- Don't invent new color tokens ad hoc inside components — add to
  `theme/colors.ts` and import.
- Don't invent game-balance numbers (currency payouts, pack odds, XP
  curves) beyond what's explicitly specified — flag as
  `> DECISION NEEDED` and stub with an obviously-fake placeholder
  (e.g. `TODO_BALANCE = 10`) rather than a plausible-looking real number,
  so it doesn't get shipped unnoticed.
- Reuse existing components (`PlayerCard`, `StatusBar`) where the new
  screens need the same visual pattern — extend props rather than forking
  a near-duplicate component.
- Every new screen needs a corresponding entry in `RootStackParamList` and
  `AppNavigator.tsx`.
