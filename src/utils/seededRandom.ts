// Deterministic PRNG (mulberry32) — not crypto-grade, just reproducible
// given a numeric seed. Used so Daily Challenge draws/sims are identical
// for every player on a given calendar day, per docs/handoff/05-game-loop-bugfixes.md.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// YYYYMMDD as a plain number — the shared base for all of today's Daily
// Challenge randomness. Changes once per calendar day.
export function todaySeedBase(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// One deterministic float in [0, 1), reproducible for a given calendar day
// + call site + salt. `key` namespaces distinct call sites (e.g. "spin" vs
// "season") so they don't end up sharing a seed just because they happen
// to use the same numeric salt (round index vs. game index).
export function dailyRandom(key: string, salt: number): number {
  const seed = (todaySeedBase() ^ hashString(key)) + salt;
  return mulberry32(seed)();
}
