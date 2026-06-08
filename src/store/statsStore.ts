import { create } from 'zustand';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  record: string;
  wins: number;
  flag: string;
  isMe?: boolean;
}

interface StatsState {
  streak: number;
  totalGames: number;
  bestRecord: string;
  leaderboard: LeaderboardEntry[];
  incrementStreak: () => void;
  resetStreak: () => void;
  recordResult: (wins: number, total: number) => void;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  streak: 5,
  totalGames: 42,
  bestRecord: '18-2',
  leaderboard: [
    { rank: 1, username: 'GridironKing88', record: '18-2', wins: 18, flag: '🇺🇸' },
    { rank: 2, username: 'FootballIQ_Pro', record: '17-3', wins: 17, flag: '🇨🇦' },
    { rank: 3, username: 'NFLLegend_Fan', record: '16-4', wins: 16, flag: '🇬🇧' },
    { rank: 4, username: 'RosterBuilder99', record: '15-5', wins: 15, flag: '🇺🇸' },
    { rank: 5, username: 'You', record: '14-6', wins: 14, flag: '🏈', isMe: true },
    { rank: 6, username: 'DraftDayPro', record: '13-7', wins: 13, flag: '🇦🇺' },
    { rank: 7, username: 'ProBowlPicker', record: '12-8', wins: 12, flag: '🇺🇸' },
  ],

  incrementStreak: () => set((s) => ({ streak: s.streak + 1 })),
  resetStreak: () => set({ streak: 0 }),
  recordResult: (wins, total) => {
    const record = `${wins}-${total - wins}`;
    set((s) => ({
      totalGames: s.totalGames + 1,
      bestRecord: wins > parseInt(s.bestRecord.split('-')[0]) ? record : s.bestRecord,
    }));
  },
}));
