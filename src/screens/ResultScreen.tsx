import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Share, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { GameMode, useGameStore } from '../store/gameStore';
import { useStatsStore } from '../store/statsStore';
import { TODO_BALANCE_RINGS_SOURCES, useDynastyStore } from '../store/dynastyStore';
import { useResponsive } from '../hooks/useResponsive';
import { dailyRandom } from '../utils/seededRandom';
import { TOTAL_SEASON_GAMES, simulateSeasonResults } from '../utils/seasonSim';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TOTAL_GAMES = TOTAL_SEASON_GAMES;

// Drafted team is shown first, then this brief beat, before the season
// simulation grid starts revealing.
const PRE_SIM_PAUSE_MS = 900;

// Daily Challenge must produce the same season result for every player on
// the same calendar day (docs/handoff/05-game-loop-bugfixes.md, P0) — every
// other mode stays genuinely random.
function simulateSeason(avgRating: number, mode: GameMode): boolean[] {
  if (mode !== 'daily') return simulateSeasonResults(avgRating);
  return simulateSeasonResults(avgRating, (gameIndex) => dailyRandom('season', gameIndex));
}

type Phase = 'roster' | 'simulating' | 'done';

export function ResultScreen() {
  const navigation = useNavigation<Nav>();
  const { isWide } = useResponsive();
  const { mode, roster, resetGame } = useGameStore();
  const { incrementStreak, resetStreak, recordResult } = useStatsStore();
  const earnRings = useDynastyStore((s) => s.earnRings);
  const claimDailyChallenge = useDynastyStore((s) => s.claimDailyChallenge);

  const [phase, setPhase] = useState<Phase>('roster');
  const [revealedCount, setRevealedCount] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const rosterEntries = Object.entries(roster);
  const avgRating =
    rosterEntries.length > 0
      ? Math.round(rosterEntries.reduce((sum, [, p]) => sum + (p?.rating ?? 90), 0) / rosterEntries.length)
      : 90;

  useEffect(() => {
    setResults(simulateSeason(avgRating, mode));
  }, [avgRating, mode]);

  // Drafted team shows first — hold on it briefly before the sim starts.
  useEffect(() => {
    const t = setTimeout(() => setPhase('simulating'), PRE_SIM_PAUSE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'simulating' || results.length === 0) return;
    if (revealedCount >= TOTAL_GAMES) {
      setPhase('done');
      const wins = results.filter(Boolean).length;

      if (mode === 'daily') {
        // The ticker's "1 attempt" claim wasn't actually enforced anywhere —
        // replaying Daily kept re-minting Rings and re-counting streak/best-
        // record for an identical (seeded) result. claimDailyChallenge()
        // only returns true the first time this fires on a given day.
        if (claimDailyChallenge()) {
          recordResult(wins, TOTAL_GAMES);
          wins === TOTAL_GAMES ? incrementStreak() : resetStreak();
          // Dynasty mode Rings: "Daily Challenge completion" is one of the
          // named earn sources in docs/handoff/03-legacy-mode.md — the
          // amount is a TODO_BALANCE placeholder, not confirmed game balance.
          earnRings(TODO_BALANCE_RINGS_SOURCES.dailyChallengeCompletion, 'daily_challenge_completion');
        }
      } else {
        recordResult(wins, TOTAL_GAMES);
        wins === TOTAL_GAMES ? incrementStreak() : resetStreak();
      }
      return;
    }
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 220);
    return () => clearTimeout(t);
  }, [phase, results, revealedCount]);

  const wins = results.slice(0, revealedCount).filter(Boolean).length;
  const losses = revealedCount - wins;
  const isPerfect = phase === 'done' && wins === TOTAL_GAMES;
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

  const teamCard = rosterEntries.length > 0 && (
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
          {player && <Text style={styles.rosterOvr}>{player.rating} OVR</Text>}
        </View>
      ))}
      {phase === 'roster' && (
        <Text style={styles.simSoonText}>Simulating season shortly…</Text>
      )}
    </View>
  );

  const recordSection = phase !== 'roster' && (
    <>
      <View style={styles.recordWrap}>
        <Text style={styles.recordLabel}>{phase === 'simulating' ? 'SIMULATING SEASON...' : 'FINAL RECORD'}</Text>
        <Text style={[styles.record, { color: isPerfect ? Colors.win : losses > 4 ? Colors.loss : Colors.textPrimary }]}>
          {record}
        </Text>
        {phase === 'done' && (
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

  const actionsRow = phase === 'done' && (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
        <Text style={styles.shareBtnText}>↗ SHARE</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.againBtnWrap} onPress={handlePlayAgain} activeOpacity={0.85} accessibilityRole="button">
        <LinearGradient
          colors={['#A86A05', '#D4A017', '#F0CC50', '#D4A017', '#A86A05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.againBtn}
        >
          <Text style={styles.againBtnText}>PLAY AGAIN →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
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
            <View style={styles.wideColLeft}>{teamCard}</View>
            <View style={styles.wideColRight}>{recordSection}</View>
          </View>
        ) : (
          <>
            {teamCard}
            {recordSection}
          </>
        )}

        {actionsRow}
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
  rosterOvr: { fontSize: Typography.sm, color: Colors.gold, fontFamily: Font.secondarySemiBold },
  simSoonText: {
    fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Font.secondaryRegular,
    textAlign: 'center', marginTop: 10,
  },

  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
  shareBtn: {
    flex: 1, minHeight: 52, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderMid,
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
  },
  shareBtnText: { fontSize: Typography.md, color: Colors.textSecondary, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
  againBtnWrap: { flex: 1 },
  againBtn: {
    minHeight: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    alignItems: 'center', justifyContent: 'center',
  },
  againBtnText: { fontSize: Typography.md, color: Colors.bgDark, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
});
