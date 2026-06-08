import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Share, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../theme/colors';
import { TIER_COLORS } from '../data/players';
import { useGameStore } from '../store/gameStore';
import { useStatsStore } from '../store/statsStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TOTAL_GAMES = 20;

function simulateSeason(avgRating: number): boolean[] {
  return Array.from({ length: TOTAL_GAMES }, (_, i) => {
    // Difficulty ramps up — later games are harder
    const difficulty = 70 + i * 1.2;
    const winChance = Math.min(0.9, Math.max(0.1, (avgRating - difficulty) / 40 + 0.6));
    return Math.random() < winChance;
  });
}

export function ResultScreen() {
  const navigation = useNavigation<Nav>();
  const { roster, resetGame } = useGameStore();
  const { incrementStreak, resetStreak, recordResult } = useStatsStore();

  const [revealedCount, setRevealedCount] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [animating, setAnimating] = useState(true);

  const rosterEntries = Object.entries(roster);
  const avgRating =
    rosterEntries.length > 0
      ? Math.round(rosterEntries.reduce((sum, [, p]) => sum + (p?.rating ?? 90), 0) / rosterEntries.length)
      : 90;

  useEffect(() => {
    const season = simulateSeason(avgRating);
    setResults(season);
  }, [avgRating]);

  useEffect(() => {
    if (results.length === 0) return;
    if (revealedCount >= TOTAL_GAMES) {
      setAnimating(false);
      const wins = results.filter(Boolean).length;
      recordResult(wins, TOTAL_GAMES);
      wins === TOTAL_GAMES ? incrementStreak() : resetStreak();
      return;
    }
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 220);
    return () => clearTimeout(t);
  }, [results, revealedCount]);

  const wins = results.slice(0, revealedCount).filter(Boolean).length;
  const losses = revealedCount - wins;
  const isPerfect = !animating && wins === TOTAL_GAMES;
  const record = `${wins}-${losses}`;

  function buildShareText() {
    const grid = results.map((w) => (w ? '🟩' : '🟥')).join('');
    return `Gridiron Legends\n${record} Season!\n\n${grid}\n\nCan you beat my roster? 🏈`;
  }

  async function handleShare() {
    try {
      await Share.share({ message: buildShareText() });
    } catch (_) {}
  }

  function handlePlayAgain() {
    resetGame();
    navigation.replace('Game');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => { resetGame(); navigation.navigate('Home'); }} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Season Results</Text>
        </View>

        {/* Record */}
        <View style={styles.recordWrap}>
          <Text style={styles.recordLabel}>{animating ? 'SIMULATING SEASON...' : 'FINAL RECORD'}</Text>
          <Text style={[styles.record, { color: isPerfect ? Colors.win : losses > 4 ? Colors.loss : Colors.textPrimary }]}>
            {record}
          </Text>
          {!animating && (
            <Text style={[styles.verdict, { color: isPerfect ? Colors.win : Colors.textSecondary }]}>
              {isPerfect
                ? '🏆 PERFECT SEASON! YOU DID IT!'
                : losses === 1
                ? 'So close! One slip-up.'
                : losses <= 3
                ? 'Strong season. Can you do better?'
                : 'Back to the draft board.'}
            </Text>
          )}
        </View>

        {/* Game grid */}
        <View style={styles.grid}>
          {Array.from({ length: TOTAL_GAMES }).map((_, i) => {
            const isDone = i < revealedCount;
            const isW = isDone && results[i];
            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  !isDone && styles.cellPending,
                  isDone && isW && styles.cellWin,
                  isDone && !isW && styles.cellLoss,
                ]}
              >
                <Text style={[
                  styles.cellText,
                  !isDone && styles.cellTextPending,
                  isDone && isW && styles.cellTextWin,
                  isDone && !isW && styles.cellTextLoss,
                ]}>
                  {!isDone ? '' : isW ? 'W' : 'L'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Roster summary */}
        {!animating && rosterEntries.length > 0 && (
          <View style={styles.rosterCard}>
            <View style={styles.rosterHeader}>
              <Text style={styles.rosterLabel}>YOUR TEAM</Text>
              <Text style={styles.ovrText}>OVR {avgRating}</Text>
            </View>
            {rosterEntries.map(([pos, player]) => (
              <View key={pos} style={styles.rosterRow}>
                <View style={styles.rosterLeft}>
                  <Text style={styles.rosterPos}>{pos}</Text>
                  <Text style={styles.rosterName}>{player?.name}</Text>
                </View>
                {player && (
                  <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[player.tier].bg }]}>
                    <Text style={[styles.tierText, { color: TIER_COLORS[player.tier].text }]}>
                      {player.tier}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {!animating && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>Share 📤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.againBtn} onPress={handlePlayAgain} activeOpacity={0.85}>
              <Text style={styles.againBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  toolbarTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textSecondary },

  recordWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  recordLabel: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  record: { fontSize: 64, fontWeight: '900', letterSpacing: -2, lineHeight: 68 },
  verdict: { fontSize: Typography.md, fontWeight: '600', marginTop: 6 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    justifyContent: 'center', paddingHorizontal: Spacing.lg, marginBottom: 16,
  },
  cell: {
    width: 32, height: 32, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  cellPending: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderMid },
  cellWin: { backgroundColor: Colors.win + '22', borderWidth: 1, borderColor: Colors.win },
  cellLoss: { backgroundColor: Colors.loss + '22', borderWidth: 1, borderColor: Colors.loss },
  cellText: { fontSize: Typography.base, fontWeight: '700' },
  cellTextPending: { color: Colors.borderMid },
  cellTextWin: { color: Colors.win },
  cellTextLoss: { color: Colors.loss },

  rosterCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: 14, marginBottom: 12,
  },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rosterLabel: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  ovrText: { fontSize: Typography.base, fontWeight: '700', color: Colors.green },
  rosterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.bgPrimary,
  },
  rosterLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rosterPos: { fontSize: 9, color: Colors.textDim, fontWeight: '700', minWidth: 36 },
  rosterName: { fontSize: Typography.base, color: Colors.textPrimary },
  tierBadge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  tierText: { fontSize: 9, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  shareBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderMid,
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  shareBtnText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textSecondary },
  againBtn: {
    flex: 1, backgroundColor: Colors.green,
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  againBtnText: { fontSize: Typography.base, fontWeight: '700', color: Colors.greenDark },
});
