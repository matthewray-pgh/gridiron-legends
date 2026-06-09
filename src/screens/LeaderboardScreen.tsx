import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'Daily' | 'Weekly' | 'All-Time';

const RANK_COLORS = [Colors.gold, Colors.silver, Colors.bronze];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardScreen() {
  const navigation = useNavigation<Nav>();
  const leaderboard = useStatsStore((s) => s.leaderboard);
  const [activeTab, setActiveTab] = useState<Tab>('Daily');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>All-Time Gridiron Board</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['Daily', 'Weekly', 'All-Time'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {leaderboard.map((player) => (
          <View key={player.rank} style={[styles.row, player.isMe && styles.rowMe]}>
            {/* Rank */}
            <View
              style={[
                styles.rankCircle,
                { backgroundColor: player.rank <= 3 ? RANK_COLORS[player.rank - 1] + '33' : Colors.bgPrimary },
              ]}
            >
              <Text
                style={[
                  styles.rankText,
                  { color: player.rank <= 3 ? RANK_COLORS[player.rank - 1] : Colors.textDim },
                ]}
              >
                {player.rank <= 3 ? RANK_MEDALS[player.rank - 1] : player.rank}
              </Text>
            </View>

            {/* Username */}
            <View style={styles.userWrap}>
              <Text style={[styles.username, player.isMe && styles.usernameMe]}>
                {player.flag}  {player.username}
              </Text>
            </View>

            {/* Record */}
            <View style={styles.recordWrap}>
              <Text style={styles.record}>{player.record}</Text>
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
  toolbarTitle: { fontSize: Typography.lg, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 0.5 },

  tabs: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tab: {
    flex: 1, textAlign: 'center', paddingVertical: 7,
    backgroundColor: Colors.bgCard, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.bgNavy, borderColor: Colors.goldMuted },
  tabText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textDim },
  tabTextActive: { color: Colors.gold },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, marginBottom: 6,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  rowMe: { backgroundColor: Colors.bgNavy, borderColor: Colors.goldMuted },

  rankCircle: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: Typography.sm, fontWeight: '800' },

  userWrap: { flex: 1 },
  username: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  usernameMe: { fontWeight: '800', color: Colors.gold },

  recordWrap: { alignItems: 'flex-end' },
  record: { fontSize: Typography.md, fontWeight: '800', color: Colors.textPrimary },
  winRate: { fontSize: 9, color: Colors.textDim },
});
