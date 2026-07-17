import { useEffect, useState } from 'react';

// Daily Challenge seeds off local calendar date (see todaySeedBase in
// utils/seededRandom.ts), so the countdown target has to be local midnight
// too — anything else would drift out of sync with when the seed actually
// changes.
function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Ticks once a second and returns "HH:MM:SS" remaining until the Daily
// Challenge seed rolls over at local midnight.
export function useDailyResetCountdown(): string {
  const [remainingMs, setRemainingMs] = useState(msUntilNextLocalMidnight);

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(msUntilNextLocalMidnight());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return formatCountdown(remainingMs);
}
