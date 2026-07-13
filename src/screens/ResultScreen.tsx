import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Share, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { TIER_COLORS } from '../data/players';
import { useGameStore } from '../store/gameStore';
import { useStatsStore } from '../store/statsStore';
import { TODO_BALANCE_RINGS_SOURCES, useDynastyStore } from '../store/dynastyStore';
import { useResponsive } from '../hooks/useResponsive';
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
  const { isWide } = useResponsive();
  const { mode, roster, resetGame } = useGameStore();
  const { incrementStreak, resetStreak, recordResult } = useStatsStore();
  const earnRings = useDynastyStore((s) => s.earnRings);

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
      // Dynasty mode Rings: "Daily Challenge completion" is one of the
      // named earn sources in docs/handoff/03-legacy-mode.md — the amount
      // is a TODO_BALANCE placeholder, not confirmed game balance.
      if (mode === 'daily') {
        earnRings(TODO_BALANCE_RINGS_SOURCES.dailyChallengeCompletion, 'daily_challenge_completion');
      }
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

  const recordSection = (
    <>
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

      <View style={[styles.grid, isWide && styles.gridWide]}>
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
    </>
  );

  const rosterSection = !animating && (
    <>
      {rosterEntries.length > 0 && (
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

      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>Share 📤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.againBtn} onPress={handlePlayAgain} activeOpacity={0.85}>
          <Text style={styles.againBtnText}>Play Again</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => { resetGame(); navigation.navigate('Home'); }} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Season Results</Text>
        </View>

        {isWide ? (
          <View style={styles.wideRow}>
            <View style={styles.wideColLeft}>{recordSection}</View>
            <View style={styles.wideColRight}>{rosterSection}</View>
          </View>
        ) : (
          <>
            {recordSection}
            {rosterSection}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { width: '100%' },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  toolbarTitle: { fontSize: Typography.lg, color: Colors.textSecondary, fontFamily: Font.primaryBold, letterSpacing: 1 },

  wideRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingTop: Spacing.sm,
    alignItems: 'flex-start',
  },
  wideColLeft: { flex: 1 },
  wideColRight: { flex: 1 },

  recordWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  recordLabel: { fontSize: Typography.md, color: Colors.gold, letterSpacing: 1.4, marginBottom: 4, fontFamily: Font.primarySemiBold },
  record: { fontSize: 64, letterSpacing: -1, lineHeight: 68, fontFamily: Font.primaryBold },
  verdict: { fontSize: Typography.md, marginTop: 4, fontFamily: Font.secondarySemiBold },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    justifyContent: 'center', paddingHorizontal: Spacing.lg, marginBottom: 16,
  },
  gridWide: {
    maxWidth: 300,
    alignSelf: 'center',
  },
  cell: {
    width: 32, height: 32, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  cellPending: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderMid },
  cellWin: { backgroundColor: Colors.win + '22', borderWidth: 1, borderColor: Colors.win },
  cellLoss: { backgroundColor: Colors.loss + '22', borderWidth: 1, borderColor: Colors.loss },
  cellText: { fontSize: Typography.base, fontFamily: Font.primaryBold },
  cellTextPending: { color: Colors.borderMid },
  cellTextWin: { color: Colors.win },
  cellTextLoss: { color: Colors.loss },

  rosterCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: 14, marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rosterLabel: { fontSize: Typography.sm, color: Colors.textMuted, letterSpacing: 1, fontFamily: Font.secondarySemiBold },
  ovrText: { fontSize: Typography.md, color: Colors.gold, fontFamily: Font.primaryBold },
  rosterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.bgPrimary,
  },
  rosterLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rosterPos: { fontSize: Typography.xs, color: Colors.textDim, minWidth: 36, fontFamily: Font.secondarySemiBold },
  rosterName: { fontSize: Typography.base, color: Colors.textPrimary, fontFamily: Font.secondaryMedium },
  tierBadge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  tierText: { fontSize: Typography.xs, fontFamily: Font.secondaryBold },

  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  shareBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderMid,
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  shareBtnText: { fontSize: Typography.md, color: Colors.textSecondary, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
  againBtn: {
    flex: 1, backgroundColor: Colors.gold,
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  againBtnText: { fontSize: Typography.md, color: Colors.bgDark, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
});
