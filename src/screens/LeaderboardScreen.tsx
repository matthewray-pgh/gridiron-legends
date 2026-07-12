import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { useResponsive } from '../hooks/useResponsive';
import { SegmentedControl } from '../components/SegmentedControl';
import { RankBadge } from '../components/RankBadge';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'Daily' | 'Weekly' | 'All-Time';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'Daily', label: 'DAILY' },
  { value: 'Weekly', label: 'WEEKLY' },
  { value: 'All-Time', label: 'ALL-TIME' },
];

export function LeaderboardScreen() {
  const navigation = useNavigation<Nav>();
  const { isWide } = useResponsive();
  const leaderboard = useStatsStore((s) => s.leaderboard);
  const [activeTab, setActiveTab] = useState<Tab>('Daily');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>ALL-TIME GRIDIRON BOARD</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrap, isWide && styles.tabsWrapWide]}>
        <SegmentedControl options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
      >
        {leaderboard.map((player) => (
          <View key={player.rank} style={[styles.row, player.isMe && styles.rowMe]}>
            <RankBadge rank={player.rank} />

            {/* Username */}
            <View style={styles.userWrap}>
              <Text style={[styles.username, player.isMe && styles.usernameMe]}>
                {player.flag}  {player.username}
              </Text>
            </View>

            {/* Record */}
            <View style={styles.recordWrap}>
              <Text style={[styles.record, player.isMe && styles.recordMe]}>{player.record}</Text>
              <Text style={styles.winRate}>
                WIN RATE {Math.round((player.wins / 20) * 100)}%
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  toolbarTitle: {
    fontSize: Typography['2xl'],
    color: Colors.textPrimary,
    letterSpacing: 1.1,
    fontFamily: Font.primaryBold,
  },

  tabsWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabsWrapWide: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 32, width: '100%' },
  listWide: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, marginBottom: 8,
    backgroundColor: Colors.bgCardDeep, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  rowMe: { borderColor: Colors.gold, borderWidth: 1.5, backgroundColor: '#161006' },

  userWrap: { flex: 1 },
  username: {
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    fontFamily: Font.primarySemiBold,
    letterSpacing: 0.3,
  },
  usernameMe: { color: Colors.gold, fontFamily: Font.primaryBold },

  recordWrap: { alignItems: 'flex-end' },
  record: {
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
  },
  recordMe: { color: Colors.gold },
  winRate: {
    fontSize: Typography.xs,
    color: Colors.textDim,
    fontFamily: Font.secondaryMedium,
    marginTop: 2,
  },
});
