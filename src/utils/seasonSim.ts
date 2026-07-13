// Shared season-simulation math — used by ResultScreen.tsx (one-and-done
// modes) and dynastyStore.ts (persistent Dynasty seasons) so the win-chance
// curve only lives in one place.
export const TOTAL_SEASON_GAMES = 20;

// `random` takes the game index so callers needing determinism (Daily
// Challenge's seeded PRNG, see seededRandom.ts) can derive a distinct value
// per game; defaults to plain Math.random() for every other mode.
export function simulateSeasonResults(
  avgRating: number,
  random: (gameIndex: number) => number = Math.random,
): boolean[] {
  return Array.from({ length: TOTAL_SEASON_GAMES }, (_, i) => {
    // Difficulty ramps up — later games are harder
    const difficulty = 70 + i * 1.2;
    const winChance = Math.min(0.9, Math.max(0.1, (avgRating - difficulty) / 40 + 0.6));
    return random(i) < winChance;
  });
}
