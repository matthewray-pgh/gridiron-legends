import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { DRAFT_POSITIONS, getViableTeamAbbrs } from '../data/players';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { ERA_OPTIONS, EraToken, TeamScope, useGameStore } from '../store/gameStore';
import { Ticker } from '../components/Ticker';
import { ScoreBox } from '../components/ScoreBox';
import { CallSheetPill } from '../components/CallSheetPill';
import { SegmentedControl } from '../components/SegmentedControl';
import { SelectablePill } from '../components/SelectablePill';
import { useResponsive } from '../hooks/useResponsive';
// LEGACY_ENABLED (src/config/featureFlags.ts) gates the Legacy call-sheet
// pill (doc 03). Not imported here: the pill has no code path in this
// screen yet, so there's nothing to switch on until that store exists.
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation        = useNavigation<Nav>();
  const { isWide }         = useResponsive();
  const streak             = useStatsStore((s) => s.streak);
  const bestRecord         = useStatsStore((s) => s.bestRecord);
  const leaderboard        = useStatsStore((s) => s.leaderboard);
  const setMode             = useGameStore((s) => s.setMode);
  const beginDraftSession   = useGameStore((s) => s.beginDraftSession);
  const roster              = useGameStore((s) => s.roster);
  const isComplete          = useGameStore((s) => s.isComplete);
  const positionIndex       = useGameStore((s) => s.positionIndex);
  const lockedTeam          = useGameStore((s) => s.lockedTeam);

  const myRank = leaderboard.find((entry) => entry.isMe)?.rank;
  const hasInProgressRun = Object.keys(roster).length > 0 && !isComplete;
  // Rings currency (doc 03 / Legacy store) hasn't shipped — stub at 0 rather
  // than block this screen on that store landing.
  const ringsBalance = 0;

  // Hero call panel is a single contextual slot (doc 01, rule 3): an
  // in-progress run wins over Today's Challenge when both exist. In that
  // case the challenge doesn't disappear — it surfaces as a normal pill in
  // the call sheet rail below instead of being lost.
  const heroState: 'continue' | 'daily' = hasInProgressRun ? 'continue' : 'daily';
  const showDailyPill = heroState === 'continue';
  const continueSubtitle = lockedTeam
    ? `${lockedTeam.abbr} · Round ${positionIndex + 1}/${DRAFT_POSITIONS.length}`
    : `Round ${positionIndex + 1}/${DRAFT_POSITIONS.length}`;

  const tickerItems = [
    `${streak} DAY STREAK`,
    myRank ? `RANK #${myRank}` : 'RANK —',
    `RECORD ${bestRecord}`,
  ];

  const [setupVisible, setSetupVisible] = useState(false);
  const [pendingMode,  setPendingMode]  = useState<'daily' | 'classic' | 'iq' | 'timer'>('classic');
  const [teamScope,    setTeamScope]    = useState<TeamScope>('all');
  const [selectedEras, setSelectedEras] = useState<EraToken[]>(ERA_OPTIONS);

  const viableSingleTeamCount = getViableTeamAbbrs(
    ['PIT', 'DAL', 'NE', 'SF', 'GB', 'BAL', 'MIA', 'KC', 'BUF', 'DEN', 'CHI', 'NYG'],
    selectedEras,
  ).length;
  const canStart = selectedEras.length > 0 && (teamScope === 'all' || viableSingleTeamCount > 0);

  function startGame(mode: 'daily' | 'classic' | 'iq' | 'timer') {
    setPendingMode(mode);
    setSetupVisible(true);
  }

  function resumeRun() {
    navigation.navigate('Game');
  }

  function toggleEra(era: EraToken) {
    setSelectedEras((cur) => cur.includes(era) ? cur.filter((e) => e !== era) : [...cur, era]);
  }

  function toggleSelectAllEras() {
    setSelectedEras((cur) => cur.length === 0 ? ERA_OPTIONS : []);
  }

  function handleStartFromSetup() {
    if (!canStart) return;
    setMode(pendingMode);
    beginDraftSession({ teamScope, selectedEras });
    setSetupVisible(false);
    // Two-Minute Drill carries the Lock It In mechanic and gets its own
    // screen (doc 02) — every other mode, including Daily, keeps the
    // existing blind-spin SpinScreen.
    navigation.navigate(pendingMode === 'timer' ? 'TwoMinuteDrillSpin' : 'Spin');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Ticker items={tickerItems} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentWrap, isWide && styles.contentWrapWide]}>
          {/* ── HEADER ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerWordmark}>UNDEFEATED</Text>
            <TouchableOpacity
              style={styles.gearBtn}
              onPress={() => { /* navigate to settings */ }}
              accessibilityLabel="Settings"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.gearIcon}>⚙</Text>
            </TouchableOpacity>
          </View>

          {/* ── HERO CALL PANEL + SCOREBOX ROW ────────────────────────────
               Single contextual hero slot — continue-run beats today's-
               challenge when both exist (see heroState above). On wide
               viewports the hero and scorebox sit side by side instead of
               stacked, with the scoreboxes forming a vertical column.    */}
          <View style={[styles.heroRow, isWide && styles.heroRowWide]}>
            <View style={[styles.heroPanel, isWide && styles.heroPanelWide]}>
              <View style={styles.heroAccentBar} />
              <View style={styles.heroContent}>
                {heroState === 'continue' ? (
                  <>
                    <Text style={styles.heroLabel}>IN PROGRESS</Text>
                    <Text style={styles.heroTitle}>CONTINUE YOUR RUN</Text>
                    <Text style={styles.heroClock}>{continueSubtitle}</Text>
                    <TouchableOpacity style={styles.heroBtn} onPress={resumeRun} activeOpacity={0.85}>
                      <Text style={styles.heroBtnText}>RESUME</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.heroLabel}>TODAY'S CHALLENGE</Text>
                    <Text style={styles.heroTitle}>DAILY ROSTER BUILD</Text>
                    <Text style={styles.heroClock}>RESETS --:--:--</Text>
                    <TouchableOpacity style={styles.heroBtn} onPress={() => startGame('daily')} activeOpacity={0.85}>
                      <Text style={styles.heroBtnText}>PLAY NOW</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            <View style={[styles.scoreRow, isWide && styles.scoreRowWide]}>
              <ScoreBox value={String(streak).padStart(2, '0')} label="Streak" />
              <ScoreBox value={myRank ? `#${myRank}` : '—'} label="Rank" />
              <ScoreBox value={String(ringsBalance)} label="Rings" />
            </View>
          </View>

          {/* ── CALL SHEET RAIL ───────────────────────────────────────────
               If Today's Challenge got bumped out of the hero slot above,
               it surfaces here as a normal (silver-accent) pill instead of
               being lost. On wide viewports this wraps into a grid.      */}
          <Text style={styles.railLabel}>Call sheet</Text>
          <View style={[styles.rail, isWide && styles.railWide]}>
            {showDailyPill && (
              <View style={isWide && styles.railItemWide}>
                <CallSheetPill title="Daily Challenge" tag="today only" onPress={() => startGame('daily')} />
              </View>
            )}
            <View style={isWide && styles.railItemWide}>
              <CallSheetPill title="Classic" tag="stats on" onPress={() => startGame('classic')} />
            </View>
            <View style={isWide && styles.railItemWide}>
              <CallSheetPill title="Gridiron IQ" tag="stats off" onPress={() => startGame('iq')} />
            </View>
            <View style={isWide && styles.railItemWide}>
              <CallSheetPill
                title="Two-Minute Drill"
                tag="skill spin"
                accentColor={Colors.gridironBlue}
                onPress={() => startGame('timer')}
              />
            </View>
            <View style={isWide && styles.railItemWide}>
              <CallSheetPill title="Challenge" tag="vs friends" onPress={() => navigation.navigate('Leaderboard')} />
            </View>
            {/* Legacy pill omitted — doc 03 (Legacy mode) hasn't shipped. */}
          </View>

          {/* ── DISCLAIMER ─────────────────────────────────────────────── */}
          <Text style={styles.disclaimer}>
            Not affiliated with or endorsed by the NFL, NFLPA, or any team.
          </Text>
        </View>
      </ScrollView>

      {/* ── GAME SETUP MODAL ─────────────────────────────────────────────── */}
      <Modal
        visible={setupVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSetupVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSetupVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetIcon}>⚔︎✕</Text>
            <Text style={styles.sheetTitle}>GAME SETUP</Text>
            <Text style={styles.sheetHint}>Configure constraints for each round's team + era spin.</Text>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetLabel}>TEAMS</Text>
              <SegmentedControl
                options={[{ value: 'all', label: 'All teams' }, { value: 'single', label: 'One team' }]}
                value={teamScope}
                onChange={setTeamScope}
              />
              {teamScope === 'single' && (
                <Text style={styles.noteText}>
                  {viableSingleTeamCount > 0
                    ? 'A viable franchise will be randomly assigned on Round 1 spin.'
                    : 'No supported franchise can cover every draft slot for this era mix.'}
                </Text>
              )}
            </View>

            <View style={styles.sheetSection}>
              <View style={styles.sheetSectionHeader}>
                <Text style={styles.sheetLabel}>ERAS</Text>
                <TouchableOpacity onPress={toggleSelectAllEras}>
                  <Text style={styles.clearText}>{selectedEras.length === 0 ? 'Select all' : 'Clear all'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {ERA_OPTIONS.map((era) => (
                  <SelectablePill
                    key={era}
                    label={era}
                    selected={selectedEras.includes(era)}
                    showCheck
                    onPress={() => toggleEra(era)}
                    style={styles.eraChip}
                  />
                ))}
              </View>
              {!canStart && (
                <Text style={styles.warningText}>
                  {selectedEras.length === 0
                    ? 'Select at least one era to continue'
                    : 'Switch to all teams or add more eras to start a one-team run'}
                </Text>
              )}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSetupVisible(false)} activeOpacity={0.85}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStartFromSetup}
                activeOpacity={0.85}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                disabled={!canStart}
              >
                <LinearGradient
                  colors={['#A86A05', '#D4A017', '#F0CC50', '#D4A017', '#A86A05']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startBtn}>
                  <Text style={styles.startBtnText}>Start Game</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  // ── SCROLL
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl, width: '100%' },
  contentWrap: { width: '100%' },
  contentWrapWide: { maxWidth: 1040, alignSelf: 'center' },

  // ── HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerWordmark: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 1.5,
  },
  gearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.steel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 14,
    color: Colors.steel,
  },

  // ── HERO CALL PANEL (+ scorebox row pairing on wide)
  heroRow: {},
  heroRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.lg,
  },
  heroPanel: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.sharp,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: '#1B140A',
    overflow: 'hidden',
  },
  heroPanelWide: {
    flex: 3,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  heroAccentBar: {
    width: 4,
    backgroundColor: Colors.gold,
  },
  heroContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  heroLabel: {
    fontSize: Typography.xs,
    color: Colors.gold,
    fontFamily: Font.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 26,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  heroClock: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    marginBottom: 12,
  },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gold,
    borderRadius: Radius.sharp,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  heroBtnText: {
    fontSize: Typography.md,
    color: Colors.bgDark,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
  },

  // ── SCOREBOX ROW
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  scoreRowWide: {
    flex: 2,
    flexDirection: 'column',
    paddingHorizontal: 0,
    marginBottom: 0,
  },

  // ── CALL SHEET RAIL
  railLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
  },
  rail: {
    gap: 8,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  railWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  railItemWide: {
    width: '32%',
  },

  // ── DISCLAIMER
  disclaimer: {
    fontSize: Typography.md,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    fontFamily: Font.secondaryRegular,
  },

  // ── MODAL / SHEET
  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#000000A8',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B121BDD',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: 18,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#8B6B2C',
  },
  sheetIcon: {
    fontSize: 23,
    color: Colors.gold,
    textAlign: 'center',
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
  },
  sheetTitle: {
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Font.primaryBold,
    letterSpacing: 1.1,
    lineHeight: 36,
  },
  sheetHint: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: Font.secondaryRegular,
    lineHeight: 22,
  },
  sheetSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2D3B',
    paddingTop: 12,
  },
  sheetSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetLabel: {
    color: Colors.gold,
    fontSize: Typography.md,
    letterSpacing: 1.4,
    fontFamily: Font.primaryMedium,
  },
  clearText: {
    color: Colors.gold,
    fontSize: Typography.md,
    fontFamily: Font.primarySemiBold,
    letterSpacing: 1,
  },
  noteText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    marginTop: 8,
    fontFamily: Font.secondaryRegular,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  eraChip: {
    width: '48.5%',
    minHeight: 62,
  },
  warningText: {
    color: Colors.gold,
    fontSize: Typography.sm,
    marginTop: 8,
    fontFamily: Font.secondarySemiBold,
  },
  sheetActions: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2D3B',
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: '#121A24',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#3A4754',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.lg,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
  },
  startBtn: {
    flex: 1.5,
    minHeight: 52,
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#F5DC7A',
    paddingHorizontal: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: {
    color: Colors.bgDark,
    fontSize: Typography.xl,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
  },
});
