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
import { TopNav } from '../components/TopNav';
import { HeroBand } from '../components/HeroBand';
import { ModeCard } from '../components/ModeCard';
import { LeaderboardTeaser } from '../components/LeaderboardTeaser';
import { SiteFooter } from '../components/SiteFooter';
import { useResponsive } from '../hooks/useResponsive';
import { DYNASTY_ENABLED } from '../config/featureFlags';
import { useDynastyStore } from '../store/dynastyStore';
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

  const dynastyLevel      = useDynastyStore((s) => s.dynastyLevel);
  const dynastyRings      = useDynastyStore((s) => s.rings);
  const dynastyAllTime    = useDynastyStore((s) => s.allTimeRecord);
  const dynastyHOFCount   = useDynastyStore((s) => s.hallOfFame.length);
  const dynastyPackCount  = useDynastyStore((s) => s.ownedPacks.length);

  const myRank = leaderboard.find((entry) => entry.isMe)?.rank;
  const hasInProgressRun = Object.keys(roster).length > 0 && !isComplete;
  const ringsBalance = dynastyRings;

  // Hero call panel is a single contextual slot (doc 01, rule 3): an
  // in-progress run wins over Today's Challenge when both exist. In that
  // case the challenge doesn't disappear — it surfaces as a normal pill in
  // the call sheet rail below instead of being lost.
  const heroState: 'continue' | 'daily' = hasInProgressRun ? 'continue' : 'daily';
  const showDailyPill = heroState === 'continue';
  const continueSubtitle = lockedTeam
    ? `${lockedTeam.abbr} · Round ${positionIndex + 1}/${DRAFT_POSITIONS.length}`
    : `Round ${positionIndex + 1}/${DRAFT_POSITIONS.length}`;

  // Doc 01 also lists a "players-today" stat here, but there's no real
  // backing data for it (offline single-player app, no live player count)
  // — omitted rather than fabricated, same principle as the Rank "—" rule.
  const tickerItems = [
    `${streak} DAY STREAK`,
    myRank ? `RANK #${myRank}` : 'RANK —',
    `RECORD ${bestRecord}`,
    ...(DYNASTY_ENABLED ? [`DYNASTY LVL ${dynastyLevel}`] : []),
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
        {isWide ? (
          <View style={styles.wideWrap}>
            {/* ── TOP NAV ──────────────────────────────────────────────
                 Wide-viewport-only persistent nav, scoped to HomeScreen
                 (doc 04: not a shared shell — flagged back as a DECISION
                 NEEDED for a future global shell). Replaces the reflowed
                 mobile header at this breakpoint.                      */}
            <TopNav
              dynastyLevel={dynastyLevel}
              rings={ringsBalance}
              onDynastyPress={() => navigation.navigate('DynastyHome')}
              onLeaderboardPress={() => navigation.navigate('Leaderboard')}
              onSettingsPress={() => { /* navigate to settings */ }}
            />

            {/* ── HERO BAND ────────────────────────────────────────────
                 Always "Today's Challenge" at wide — continue-run no
                 longer competes for the hero slot (doc 04 point 4), it
                 renders in the sidebar below instead.                  */}
            <HeroBand
              onPlayPress={() => startGame('daily')}
              onViewRulesPress={() => { /* no rules screen yet */ }}
            />

            <View style={styles.wideGrid}>
              {/* ── MAIN COLUMN ──────────────────────────────────────── */}
              <View style={styles.mainCol}>
                <Text style={styles.railLabel}>Call sheet</Text>
                <View style={styles.modeGrid}>
                  <ModeCard
                    icon="🏈"
                    title="Classic"
                    description="Full stat readouts as you build your roster."
                    tag="stats on"
                    onPress={() => startGame('classic')}
                  />
                  <ModeCard
                    icon="🧠"
                    title="Gridiron IQ"
                    description="Blind drafting — stats stay hidden until reveal."
                    tag="stats off"
                    onPress={() => startGame('iq')}
                  />
                  <ModeCard
                    icon="⏱"
                    title="Two-Minute Drill"
                    description="Lock-it-in skill spin, racing the clock."
                    tag="skill spin"
                    accentColor={Colors.gridironBlue}
                    onPress={() => startGame('timer')}
                  />
                  <ModeCard
                    icon="🏆"
                    title="Challenge"
                    description="Compete against friends on the leaderboard."
                    tag="vs friends"
                    onPress={() => navigation.navigate('Leaderboard')}
                  />
                </View>

                <LeaderboardTeaser
                  leaderboard={leaderboard}
                  onViewAll={() => navigation.navigate('Leaderboard')}
                />
              </View>

              {/* ── SIDEBAR ──────────────────────────────────────────── */}
              <View style={styles.sidebarCol}>
                {hasInProgressRun && (
                  <View style={styles.sidebarCard}>
                    <Text style={styles.heroLabel}>IN PROGRESS</Text>
                    <Text style={styles.heroTitle}>CONTINUE YOUR RUN</Text>
                    <Text style={styles.heroClock}>{continueSubtitle}</Text>
                    <TouchableOpacity style={styles.heroBtn} onPress={resumeRun} activeOpacity={0.85}>
                      <Text style={styles.heroBtnText}>RESUME</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {DYNASTY_ENABLED && (
                  <TouchableOpacity
                    style={[styles.dynastyBanner, styles.dynastyBannerWide]}
                    onPress={() => navigation.navigate('DynastyHome')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dynastyEyebrow}>YOUR DYNASTY</Text>
                    <Text style={styles.dynastyTitle}>Dynasty · Level {dynastyLevel}</Text>
                    <View style={styles.dynastyRow}>
                      <View style={styles.dynastyChip}>
                        <Text style={styles.dynastyChipValue}>{dynastyAllTime.wins}-{dynastyAllTime.losses}</Text>
                        <Text style={styles.dynastyChipLabel}>All-time</Text>
                      </View>
                      <View style={styles.dynastyChip}>
                        <Text style={styles.dynastyChipValue}>{dynastyHOFCount}</Text>
                        <Text style={styles.dynastyChipLabel}>HOF cards</Text>
                      </View>
                      <View style={styles.dynastyChip}>
                        <Text style={styles.dynastyChipValue}>{dynastyPackCount}</Text>
                        <Text style={styles.dynastyChipLabel}>Packs ready</Text>
                      </View>
                    </View>
                    <View style={styles.dynastyBtn}>
                      <Text style={styles.dynastyBtnText}>ENTER DYNASTY</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View style={styles.sidebarScorePanel}>
                  <ScoreBox value={String(streak).padStart(2, '0')} label="Streak" />
                  <ScoreBox value={myRank ? `#${myRank}` : '—'} label="Rank" />
                  <ScoreBox value={bestRecord} label="Best record" />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.contentWrap}>
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

            {/* ── DYNASTY BANNER ─────────────────────────────────────────────
                 Legacy mode (doc 03), renamed Dynasty — its own persistent-
                 save entry point, distinct from the one-and-done runs below.*/}
            {DYNASTY_ENABLED && (
              <TouchableOpacity
                style={styles.dynastyBanner}
                onPress={() => navigation.navigate('DynastyHome')}
                activeOpacity={0.85}
              >
                <Text style={styles.dynastyEyebrow}>YOUR DYNASTY</Text>
                <Text style={styles.dynastyTitle}>Dynasty · Level {dynastyLevel}</Text>
                <View style={styles.dynastyRow}>
                  <View style={styles.dynastyChip}>
                    <Text style={styles.dynastyChipValue}>{dynastyAllTime.wins}-{dynastyAllTime.losses}</Text>
                    <Text style={styles.dynastyChipLabel}>All-time</Text>
                  </View>
                  <View style={styles.dynastyChip}>
                    <Text style={styles.dynastyChipValue}>{dynastyHOFCount}</Text>
                    <Text style={styles.dynastyChipLabel}>HOF cards</Text>
                  </View>
                  <View style={styles.dynastyChip}>
                    <Text style={styles.dynastyChipValue}>{dynastyPackCount}</Text>
                    <Text style={styles.dynastyChipLabel}>Packs ready</Text>
                  </View>
                </View>
                <View style={styles.dynastyBtn}>
                  <Text style={styles.dynastyBtnText}>ENTER DYNASTY</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── HERO CALL PANEL + SCOREBOX ROW ────────────────────────────
                 Single contextual hero slot — continue-run beats today's-
                 challenge when both exist (see heroState above).        */}
            <View style={styles.heroRow}>
              <View style={styles.heroPanel}>
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

              <View style={styles.scoreRow}>
                <ScoreBox value={String(streak).padStart(2, '0')} label="Streak" />
                <ScoreBox value={myRank ? `#${myRank}` : '—'} label="Rank" />
                <ScoreBox value={String(ringsBalance)} label="Rings" />
              </View>
            </View>

            {/* ── CALL SHEET RAIL ───────────────────────────────────────────
                 If Today's Challenge got bumped out of the hero slot above,
                 it surfaces here as a normal (silver-accent) pill instead of
                 being lost.                                              */}
            <Text style={styles.railLabel}>Call sheet</Text>
            <View style={styles.rail}>
              {showDailyPill && (
                <CallSheetPill title="Daily Challenge" tag="today only" onPress={() => startGame('daily')} />
              )}
              <CallSheetPill title="Classic" tag="stats on" onPress={() => startGame('classic')} />
              <CallSheetPill title="Gridiron IQ" tag="stats off" onPress={() => startGame('iq')} />
              <CallSheetPill
                title="Two-Minute Drill"
                tag="skill spin"
                accentColor={Colors.gridironBlue}
                onPress={() => startGame('timer')}
              />
              <CallSheetPill title="Challenge" tag="vs friends" onPress={() => navigation.navigate('Leaderboard')} />
            </View>

            {/* ── DISCLAIMER ─────────────────────────────────────────────── */}
            <Text style={styles.disclaimer}>
              Not affiliated with or endorsed by the NFL, NFLPA, or any team.
            </Text>
          </View>
        )}

        {isWide && <SiteFooter />}
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

  // ── WIDE LAYOUT (doc 04) — genuine two-column dashboard, not a reflow
  // of the narrow stack. Superseded contentWrapWide/heroRowWide/
  // scoreRowWide/railWide/railItemWide, which are gone.
  wideWrap: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
  },
  wideGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2xl'],
  },
  mainCol: {
    flex: 2,
  },
  sidebarCol: {
    flex: 1,
    minWidth: 280,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sidebarCard: {
    backgroundColor: '#1B140A',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sharp,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dynastyBannerWide: {
    marginHorizontal: 0,
  },
  sidebarScorePanel: {
    flexDirection: 'row',
    gap: 8,
  },

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

  // ── DYNASTY BANNER
  dynastyBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.sharp,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: '#150F04',
    padding: Spacing.lg,
  },
  dynastyEyebrow: {
    fontSize: Typography.xs,
    color: Colors.gold,
    fontFamily: Font.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dynastyTitle: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: Font.monoBold,
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 10,
  },
  dynastyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dynastyChip: {
    flex: 1,
    backgroundColor: '#00000033',
    borderRadius: Radius.sharp,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  dynastyChipValue: {
    fontSize: Typography.base,
    color: Colors.gold,
    fontFamily: Font.monoBold,
  },
  dynastyChipLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  dynastyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.sharp,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dynastyBtnText: {
    color: Colors.bgDark,
    fontFamily: Font.primarySemiBold,
    fontSize: Typography.base,
    letterSpacing: 0.5,
  },

  // ── HERO CALL PANEL (narrow only — wide uses <HeroBand>)
  heroRow: {},
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

  // ── SCOREBOX ROW (narrow only — wide uses sidebarScorePanel)
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // ── CALL SHEET RAIL (narrow only — wide uses modeGrid of <ModeCard>)
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

  // ── DISCLAIMER
  disclaimer: {
    fontSize: Typography.md,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    fontFamily: Font.mono,
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
