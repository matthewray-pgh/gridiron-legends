import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Share, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { GameMode, useGameStore } from '../store/gameStore';
import { useStatsStore } from '../store/statsStore';
import { TODO_BALANCE_RINGS_SOURCES, useDynastyStore } from '../store/dynastyStore';
import { SHOW_DEBUG_OVR } from '../config/featureFlags';
import { useResponsive } from '../hooks/useResponsive';
import { dailyRandom } from '../utils/seededRandom';
import { TOTAL_SEASON_GAMES, simulateSeasonResults } from '../utils/seasonSim';
import { BrandBackground } from '../components/BrandBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ResultRouteProp = RouteProp<RootStackParamList, 'Result'>;

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
  const route = useRoute<ResultRouteProp>();
  const { isWide } = useResponsive();
  const { mode, roster: gameRoster, resetGame } = useGameStore();
  const { incrementStreak, resetStreak, recordResult } = useStatsStore();
  const earnRings = useDynastyStore((s) => s.earnRings);
  const claimDailyChallenge = useDynastyStore((s) => s.claimDailyChallenge);
  const completeInitialDraft = useDynastyStore((s) => s.completeInitialDraft);
  const applyNextSeasonResults = useDynastyStore((s) => s.applyNextSeasonResults);
  const dynastyRoster = useDynastyStore((s) => s.roster);

  // Two different Dynasty flows land here (docs/handoff/08, point 1 + the
  // ongoing-season follow-up): the one-time initial draft (roster comes
  // from gameStore, completing the reveal writes it into dynastyStore) vs.
  // every season after that, triggered by DynastyHomeScreen's "Start
  // season" button with no draft involved (roster already lives in
  // dynastyStore). `dynastyContinuation` is a route param rather than
  // inferred from roster emptiness, which would be ambiguous once a
  // Dynasty roster can go back to empty (e.g. every starter retired).
  const isDynastyContinuation = mode === 'dynasty' && !!route.params?.dynastyContinuation;
  const roster = isDynastyContinuation ? dynastyRoster : gameRoster;

  const [phase, setPhase] = useState<Phase>('roster');
  const [revealedCount, setRevealedCount] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  // claimDailyChallenge()/earnRings() fire inside the reveal effect below
  // with no UI feedback — this just remembers what happened so the reward
  // banner can report it once the reveal finishes.
  const [dailyRewardEarned, setDailyRewardEarned] = useState(false);

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

      if (mode === 'dynasty') {
        // docs/handoff/08-dynasty-gameplay-redesign.md, point 1: completing
        // the initial draft *is* playing season 1 — write the drafted 12
        // into dynastyStore's persistent roster and apply this same
        // already-simulated `results` array as its outcome (award XP/packs,
        // advance the season counter). Every season after that reuses the
        // same simulate-and-reveal flow but skips the roster write (it's
        // already in dynastyStore, untouched since the last season). Either
        // way this is a persistent-save event, not a per-run stat, so it
        // doesn't touch statsStore's streak/bestRecord.
        if (isDynastyContinuation) {
          applyNextSeasonResults(results);
        } else {
          completeInitialDraft(roster, results);
        }
      } else if (mode === 'daily') {
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
          setDailyRewardEarned(true);
        } else {
          setDailyRewardEarned(false);
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
    if (mode === 'dynasty') {
      // No "play again" for the one-time initial draft — the roster is now
      // persistent, so the natural next step is the Dynasty home screen.
      navigation.replace('DynastyHome');
      return;
    }
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
            {SHOW_DEBUG_OVR && player && <Text style={styles.debugOvr}>{player.rating}</Text>}
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

  const dailyRewardBanner = phase === 'done' && mode === 'daily' && (
    <View style={styles.rewardBanner}>
      <Text style={styles.rewardText}>
        {dailyRewardEarned
          ? `🪙 +${TODO_BALANCE_RINGS_SOURCES.dailyChallengeCompletion} RINGS EARNED`
          : 'Already completed today — replay earns no Rings'}
      </Text>
    </View>
  );

  const actionsRow = phase === 'done' && (
    <View style={styles.actions}>
      <SecondaryButton label="↗ SHARE" onPress={handleShare} style={styles.shareBtn} />
      <PrimaryButton
        label={mode === 'dynasty' ? 'ENTER DYNASTY →' : 'PLAY AGAIN →'}
        onPress={handlePlayAgain}
        style={styles.againBtnWrap}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Toolbar */}
        <BrandBackground variant="header" style={styles.toolbar}>
          <TouchableOpacity onPress={() => { resetGame(); navigation.navigate('Home'); }} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Season Results</Text>
        </BrandBackground>

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

        {dailyRewardBanner}
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
  debugOvr: { fontSize: Typography.md, color: Colors.gold, fontFamily: Font.primaryBold },
  rosterOvr: { fontSize: Typography.sm, color: Colors.gold, fontFamily: Font.secondarySemiBold },
  simSoonText: {
    fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Font.secondaryRegular,
    textAlign: 'center', marginTop: 10,
  },

  rewardBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '1A',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: Typography.md,
    color: Colors.gold,
    fontFamily: Font.primaryBold,
    letterSpacing: 0.5,
  },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
  shareBtn: { flex: 1 },
  againBtnWrap: { flex: 1 },
});
