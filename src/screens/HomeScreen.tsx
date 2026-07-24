import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { EraToken, positionsForMode, TeamScope, useGameStore } from '../store/gameStore';
import { ScoreBox } from '../components/ScoreBox';
import { CallSheetPill } from '../components/CallSheetPill';
import { HeroBand } from '../components/HeroBand';
import { ModeCard } from '../components/ModeCard';
import { LeaderboardTeaser } from '../components/LeaderboardTeaser';
import { SiteFooter } from '../components/SiteFooter';
import { BrandBackground } from '../components/BrandBackground';
import { GameSetupModal } from '../components/GameSetupModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { useResponsive } from '../hooks/useResponsive';
import { useDailyResetCountdown } from '../hooks/useDailyResetCountdown';
import { DYNASTY_ENABLED, HALL_OF_FAME_ENABLED, LEADERBOARD_ENABLED } from '../config/featureFlags';
import { totalOwnedPacks, useDynastyStore } from '../store/dynastyStore';
import { todaySeedBase } from '../utils/seededRandom';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation        = useNavigation<Nav>();
  const { isWide }         = useResponsive();
  const dailyCountdown     = useDailyResetCountdown();
  const streak             = useStatsStore((s) => s.streak);
  const bestRecord         = useStatsStore((s) => s.bestRecord);
  const leaderboard        = useStatsStore((s) => s.leaderboard);
  const setMode             = useGameStore((s) => s.setMode);
  const beginDraftSession   = useGameStore((s) => s.beginDraftSession);
  const activeMode          = useGameStore((s) => s.mode);
  const roster              = useGameStore((s) => s.roster);
  const isComplete          = useGameStore((s) => s.isComplete);
  const positionIndex       = useGameStore((s) => s.positionIndex);
  const lockedTeam          = useGameStore((s) => s.lockedTeam);

  const dynastySeason     = useDynastyStore((s) => s.currentSeason);
  const dynastyRoster     = useDynastyStore((s) => s.roster);
  const dynastyRings      = useDynastyStore((s) => s.rings);
  const dynastyAllTime    = useDynastyStore((s) => s.allTimeRecord);
  const dynastyHOFCount   = useDynastyStore((s) => s.hallOfFame.length);
  const dynastyPackCount  = useDynastyStore((s) => totalOwnedPacks(s.ownedPacks));
  const lastDailyClaimDate = useDynastyStore((s) => s.lastDailyClaimDate);

  // claimDailyChallenge() (dynastyStore) only gates the reward — it never
  // surfaced in the UI, so a player who'd already banked today's Rings/
  // streak had no way to tell a replay wouldn't earn anything. Comparing
  // against todaySeedBase() here (not a stored boolean) so this flips back
  // to false on its own at the next local-midnight reset.
  const dailyCompletedToday = lastDailyClaimDate === todaySeedBase();

  // currentSeason starts at 1 the moment a Dynasty save exists, even before
  // a team's been drafted (or after every starter's been retired/released
  // back down to none) — the banner should read "Season 0" in that state
  // rather than implying a season is already underway.
  const hasDynastyRoster = Object.keys(dynastyRoster).length > 0;
  const dynastySeasonDisplay = hasDynastyRoster ? dynastySeason : 0;

  const hasInProgressRun = Object.keys(roster).length > 0 && !isComplete;

  // Hero call panel is a single contextual slot (doc 01, rule 3): an
  // in-progress run wins over Today's Challenge when both exist. In that
  // case the challenge doesn't disappear — it surfaces as a normal pill in
  // the call sheet rail below instead of being lost.
  const heroState: 'continue' | 'daily' = hasInProgressRun ? 'continue' : 'daily';
  const showDailyPill = heroState === 'continue';
  const inProgressRoundCount = positionsForMode(activeMode).length;
  const continueSubtitle = lockedTeam
    ? `${lockedTeam.abbr} · Round ${positionIndex + 1}/${inProgressRoundCount}`
    : `Round ${positionIndex + 1}/${inProgressRoundCount}`;

  const [setupVisible, setSetupVisible] = useState(false);
  const [pendingMode,  setPendingMode]  = useState<'daily' | 'classic' | 'offense' | 'timer'>('classic');

  function startGame(mode: 'daily' | 'classic' | 'offense' | 'timer') {
    setPendingMode(mode);
    setSetupVisible(true);
  }

  function resumeRun() {
    navigation.navigate('Game');
  }

  // Dynasty's home screen is always the landing spot now, roster or not —
  // DynastyHomeScreen itself offers the "Start Your Dynasty" draft entry
  // point when there's no roster yet, rather than HomeScreen intercepting
  // and routing straight into the Spin/Draft setup flow.
  function handleEnterDynasty() {
    navigation.navigate('DynastyHome');
  }

  function handleStartFromSetup(params: { teamScope: TeamScope; selectedEras: EraToken[] }) {
    setMode(pendingMode);
    beginDraftSession(params);
    setSetupVisible(false);
    // Two-Minute Drill carries the Lock It In mechanic and gets its own
    // screen (doc 02) — every other mode, including Daily, keeps the
    // existing blind-spin SpinScreen.
    navigation.navigate(pendingMode === 'timer' ? 'TwoMinuteDrillSpin' : 'Spin');
  }

  // 'top' edge omitted — AppShell (rendered app-wide via AppNavigator's
  // custom header) already reserves the top safe-area inset.
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isWide ? (
          <View style={styles.wideWrap}>
            {/* ── HERO BAND ────────────────────────────────────────────
                 Always "Today's Challenge" at wide — continue-run no
                 longer competes for the hero slot (doc 04 point 4), it
                 renders in the sidebar below instead.                  */}
            <HeroBand
              completedToday={dailyCompletedToday}
              onPlayPress={() => startGame('daily')}
              onViewRulesPress={() => { /* no rules screen yet */ }}
            />

            <View style={styles.wideGrid}>
              {/* ── MAIN COLUMN ──────────────────────────────────────── */}
              <View style={styles.mainCol}>
                <Text style={styles.railLabel}>Call sheet</Text>
                <View style={styles.modeGrid}>
                  <ModeCard
                    icon="football-helmet"
                    title="Classic"
                    description="Full stat readouts as you build your roster."
                    tag="stats on"
                    onPress={() => startGame('classic')}
                  />
                  <ModeCard
                    icon="run-fast"
                    title="Offense Only"
                    description="9-slot offense-heavy roster — no defense at all."
                    tag="9 rounds · no defense"
                    onPress={() => startGame('offense')}
                  />
                  <ModeCard
                    icon="timer"
                    title="Two-Minute Drill"
                    description="Lock-it-in skill spin, racing the clock."
                    tag="skill spin"
                    onPress={() => startGame('timer')}
                  />
                  {LEADERBOARD_ENABLED && (
                    <ModeCard
                      icon="trophy"
                      title="Challenge"
                      description="Compete against friends on the leaderboard."
                      tag="vs friends"
                      onPress={() => navigation.navigate('Leaderboard')}
                    />
                  )}
                </View>

                {LEADERBOARD_ENABLED && (
                  <LeaderboardTeaser
                    leaderboard={leaderboard}
                    onViewAll={() => navigation.navigate('Leaderboard')}
                  />
                )}
              </View>

              {/* ── SIDEBAR ──────────────────────────────────────────── */}
              <View style={styles.sidebarCol}>
                {hasInProgressRun && (
                  <View style={styles.sidebarCard}>
                    <Text style={styles.heroLabel}>IN PROGRESS</Text>
                    <Text style={styles.heroTitle}>CONTINUE YOUR RUN</Text>
                    <Text style={styles.heroClock}>{continueSubtitle}</Text>
                    <PrimaryButton label="RESUME" onPress={resumeRun} style={styles.heroBtn} />
                  </View>
                )}

                {DYNASTY_ENABLED && (
                  <View style={[styles.dynastyBanner, styles.dynastyBannerWide]}>
                    <Text style={styles.dynastyEyebrow}>YOUR DYNASTY</Text>
                    <Text style={styles.dynastyTitle}>Dynasty · Season {dynastySeasonDisplay}</Text>
                    <View style={styles.dynastyRow}>
                      <View style={styles.dynastyChip}>
                        <Text style={styles.dynastyChipValue}>{dynastyAllTime.wins}-{dynastyAllTime.losses}</Text>
                        <Text style={styles.dynastyChipLabel}>All-time</Text>
                      </View>
                      {HALL_OF_FAME_ENABLED && (
                        <View style={styles.dynastyChip}>
                          <Text style={styles.dynastyChipValue}>{dynastyHOFCount}</Text>
                          <Text style={styles.dynastyChipLabel}>HOF</Text>
                        </View>
                      )}
                      <View style={styles.dynastyChip}>
                        <Text style={styles.dynastyChipValue}>{dynastyPackCount}</Text>
                        <Text style={styles.dynastyChipLabel}>Packs</Text>
                      </View>
                      <View style={styles.dynastyChip}>
                        <Text style={styles.dynastyChipValue}>{dynastyRings}</Text>
                        <Text style={styles.dynastyChipLabel}>Rings</Text>
                      </View>
                    </View>
                    <PrimaryButton label="ENTER DYNASTY" onPress={handleEnterDynasty} />
                  </View>
                )}

                <View style={styles.sidebarScorePanel}>
                  <ScoreBox value={String(streak).padStart(2, '0')} label="Streak" />
                  <ScoreBox value={bestRecord} label="Best record" />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.contentWrap}>
            <View style={styles.contentBody}>
              {/* ── HERO CALL PANEL + SCOREBOX ROW ────────────────────────────
                 Single contextual hero slot — continue-run beats today's-
                 challenge when both exist (see heroState above). This is
                 the primary focal point on mobile; Dynasty is a secondary,
                 muted entry point below it rather than a second hero.
                 BrandBackground renders stadium art *behind* this content
                 (same pattern as the wide layout's <HeroBand />), not as a
                 separate block pushing the content down.                 */}
            <View style={styles.heroRow}>
              <View style={styles.scoreRow}>
                <ScoreBox value={String(streak).padStart(2, '0')} label="Streak" />
                <ScoreBox value={bestRecord} label="Best record" />
              </View>

              <BrandBackground variant="header" style={styles.heroPanel}>
                <View style={styles.heroAccentBar} />
                <View style={styles.heroContent}>
                  {heroState === 'continue' ? (
                    <>
                      <Text style={styles.heroLabel}>IN PROGRESS</Text>
                      <Text style={styles.heroTitle}>CONTINUE YOUR RUN</Text>
                      <Text style={styles.heroClock}>{continueSubtitle}</Text>
                      <PrimaryButton label="RESUME" onPress={resumeRun} style={styles.heroBtn} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.heroLabel}>
                        {dailyCompletedToday ? 'CHALLENGE COMPLETE' : "TODAY'S CHALLENGE"}
                      </Text>
                      <Text style={styles.heroTitle}>DAILY ROSTER BUILD</Text>
                      <Text style={styles.heroClock}>RESETS {dailyCountdown}</Text>
                      <PrimaryButton
                        label={dailyCompletedToday ? 'PLAY AGAIN' : 'PLAY NOW'}
                        onPress={() => startGame('daily')}
                        style={styles.heroBtn}
                      />
                    </>
                  )}
                </View>
              </BrandBackground>
            </View>

            {/* ── DYNASTY ENTRY ─────────────────────────────────────────────
                 Legacy mode (doc 03), renamed Dynasty — its own persistent-
                 save entry point, distinct from the one-and-done runs above.
                 Same gold-accent visual weight as the wide sidebar's
                 dynastyBanner (no longer a muted secondary treatment) —
                 confirmed with the user, Dynasty earned more attention here
                 given how much it's grown.                               */}
            {DYNASTY_ENABLED && (
              <View style={styles.dynastyBanner}>
                <Text style={styles.dynastyEyebrow}>YOUR DYNASTY</Text>
                <Text style={styles.dynastyTitle}>Dynasty · Season {dynastySeasonDisplay}</Text>
                <View style={styles.dynastyRow}>
                  <View style={styles.dynastyChip}>
                    <Text style={styles.dynastyChipValue}>{dynastyAllTime.wins}-{dynastyAllTime.losses}</Text>
                    <Text style={styles.dynastyChipLabel}>All-time</Text>
                  </View>
                  {HALL_OF_FAME_ENABLED && (
                    <View style={styles.dynastyChip}>
                      <Text style={styles.dynastyChipValue}>{dynastyHOFCount}</Text>
                      <Text style={styles.dynastyChipLabel}>HOF</Text>
                    </View>
                  )}
                  <View style={styles.dynastyChip}>
                    <Text style={styles.dynastyChipValue}>{dynastyPackCount}</Text>
                    <Text style={styles.dynastyChipLabel}>Packs</Text>
                  </View>
                  <View style={styles.dynastyChip}>
                    <Text style={styles.dynastyChipValue}>{dynastyRings}</Text>
                    <Text style={styles.dynastyChipLabel}>Rings</Text>
                  </View>
                </View>
                <PrimaryButton label="ENTER DYNASTY" onPress={handleEnterDynasty} />
              </View>
            )}

            {/* ── CALL SHEET RAIL ───────────────────────────────────────────
                 If Today's Challenge got bumped out of the hero slot above,
                 it surfaces here as a normal (silver-accent) pill instead of
                 being lost.                                              */}
            <Text style={[styles.railLabel, styles.railLabelMobile]}>Call sheet</Text>
            <View style={styles.rail}>
              {showDailyPill && (
                <CallSheetPill
                  title="Daily Challenge"
                  tag={dailyCompletedToday ? 'completed' : 'today only'}
                  onPress={() => startGame('daily')}
                />
              )}
              <CallSheetPill title="Classic" tag="stats on" onPress={() => startGame('classic')} />
              <CallSheetPill title="Offense Only" tag="9 rounds · no defense" onPress={() => startGame('offense')} />
              <CallSheetPill
                title="Two-Minute Drill"
                tag="skill spin"
                onPress={() => startGame('timer')}
              />
              {LEADERBOARD_ENABLED && (
                <CallSheetPill title="Challenge" tag="vs friends" onPress={() => navigation.navigate('Leaderboard')} />
              )}
            </View>
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
      <GameSetupModal
        visible={setupVisible}
        mode={pendingMode}
        onClose={() => setSetupVisible(false)}
        onStart={handleStartFromSetup}
      />
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
  scrollContent: { flexGrow: 1, paddingBottom: Spacing.xl, width: '100%' },
  contentWrap: { flex: 1, width: '100%', justifyContent: 'space-between' },
  contentBody: { paddingTop: Spacing.md },

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
    alignItems: 'stretch',
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
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sidebarCard: {
    backgroundColor: '#1B140A',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.lg,
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

  // ── DYNASTY BANNER
  dynastyBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: '#150F04',
    padding: Spacing.lg,
  },
  dynastyEyebrow: {
    fontSize: Typography.sm,
    color: Colors.gold,
    fontFamily: Font.secondarySemiBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dynastyTitle: {
    fontSize: Typography['2xl'],
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
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
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  dynastyChipValue: {
    fontSize: Typography.lg,
    color: Colors.gold,
    fontFamily: Font.primaryBold,
  },
  dynastyChipLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontFamily: Font.secondarySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // ── HERO CALL PANEL (narrow only — wide uses <HeroBand>)
  heroRow: {},
  heroPanel: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
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
    fontSize: Typography.sm,
    color: Colors.gold,
    fontFamily: Font.secondarySemiBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  heroClock: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontFamily: Font.secondaryRegular,
    marginBottom: 12,
  },
  heroBtn: {
    alignSelf: 'flex-start',
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
    fontFamily: Font.secondarySemiBold,
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
  railLabelMobile: {
    fontSize: Typography.sm,
  },

  // ── DISCLAIMER
  disclaimer: {
    fontSize: Typography.lg,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    fontFamily: Font.secondaryRegular,
  },
});
