import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { RankBadge } from './RankBadge';
import type { LeaderboardEntry } from '../store/statsStore';

interface LeaderboardTeaserProps {
  leaderboard: LeaderboardEntry[];
  onViewAll: () => void;
}

// Main-column, wide-viewport-only addition (doc 04 point 5) — top 3 plus
// the player's own row, reusing LeaderboardScreen's "me" row treatment.
export function LeaderboardTeaser({ leaderboard, onViewAll }: LeaderboardTeaserProps) {
  const topThree = leaderboard.filter((entry) => entry.rank <= 3);
  const me = leaderboard.find((entry) => entry.isMe);
  const meInTopThree = !!me && me.rank <= 3;
  const rows = meInTopThree ? topThree : [...topThree, ...(me ? [me] : [])];

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Leaderboard</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {rows.map((entry) => (
        <View key={entry.rank} style={[styles.row, entry.isMe && styles.rowMe]}>
          <RankBadge rank={entry.rank} />
          <Text style={[styles.username, entry.isMe && styles.usernameMe]} numberOfLines={1}>
            {entry.flag}  {entry.username}
          </Text>
          <Text style={[styles.record, entry.isMe && styles.recordMe]}>{entry.record}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sharp,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  header: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  viewAll: {
    fontSize: Typography.sm,
    color: Colors.gold,
    fontFamily: Font.mono,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    marginBottom: 6,
    backgroundColor: Colors.bgCardDeep,
    borderRadius: Radius.sharp,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowMe: { borderColor: Colors.gold, borderWidth: 1.5, backgroundColor: '#161006' },
  username: {
    flex: 1,
    fontSize: Typography.md,
    color: Colors.textPrimary,
    fontFamily: Font.primarySemiBold,
  },
  usernameMe: { color: Colors.gold, fontFamily: Font.primaryBold },
  record: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    fontFamily: Font.monoBold,
  },
  recordMe: { color: Colors.gold },
});
