import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { DRAFT_POSITIONS } from '../data/players';
import {
  DRILL_ERA_LOCK_OVR_BONUS,
  DRILL_TEAM_LOCK_REROLL_BONUS,
  LockResult,
  useGameStore,
} from '../store/gameStore';
import { useResponsive } from '../hooks/useResponsive';
import { BrandBackground } from '../components/BrandBackground';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Timing/zone constants mirror docs/handoff/gridiron-legends-redesign-concepts.html
// section 3's interactive demo (sweepTeam/sweepEra keyframes, .sweet-zone rule).
const TRACK_MIN_PCT = 1;
const TRACK_MAX_PCT = 93;
const SWEET_ZONE_START_PCT = 41;
const SWEET_ZONE_WIDTH_PCT = 15;
const TEAM_SWEEP_MS = 1500;
const ERA_SWEEP_MS = 1900;

function pctFromAnimValue(v: number): number {
  return TRACK_MIN_PCT + v * (TRACK_MAX_PCT - TRACK_MIN_PCT);
}

function isSweetZoneHit(pct: number): boolean {
  return pct >= SWEET_ZONE_START_PCT && pct <= SWEET_ZONE_START_PCT + SWEET_ZONE_WIDTH_PCT;
}

function loopSweep(value: Animated.Value, duration: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]),
  );
}

export function TwoMinuteDrillSpinScreen() {
  const navigation = useNavigation<Nav>();
  const { isWide } = useResponsive();
  const {
    positionIndex,
    teamLockResult,
    eraLockResult,
    currentSpin,
    spinState,
    beginDrillRound,
    lockDrillTrack,
  } = useGameStore();

  const teamAnim = useRef(new Animated.Value(0)).current;
  const eraAnim = useRef(new Animated.Value(0)).current;
  const teamLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const eraLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const roundLabel = `ROUND ${positionIndex + 1} / ${DRAFT_POSITIONS.length}`;
  const revealed = spinState === 'revealed' && !!currentSpin;

  // Fresh mount each round (GameScreen replaces into this screen when there's
  // no currentSpin) — start a brand-new pre-determined-but-hidden result and
  // a fresh pair of sweeps every time.
  useEffect(() => {
    beginDrillRound();
    teamAnim.setValue(0);
    eraAnim.setValue(0);

    teamLoopRef.current = loopSweep(teamAnim, TEAM_SWEEP_MS);
    eraLoopRef.current = loopSweep(eraAnim, ERA_SWEEP_MS);
    teamLoopRef.current.start();
    eraLoopRef.current.start();

    return () => {
      teamLoopRef.current?.stop();
      eraLoopRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLock(which: 'team' | 'era') {
    const lockResult = which === 'team' ? teamLockResult : eraLockResult;
    if (lockResult !== 'pending') return;

    const anim = which === 'team' ? teamAnim : eraAnim;
    const loopRef = which === 'team' ? teamLoopRef : eraLoopRef;
    loopRef.current?.stop();

    // stopAnimation's callback gives the exact value the marker was at the
    // instant of the tap — this is the RN equivalent of the mockup's
    // getComputedStyle(marker).left read (see doc 02).
    anim.stopAnimation((value) => {
      const hit = isSweetZoneHit(pctFromAnimValue(value));
      lockDrillTrack(which, hit);
    });
  }

  function handleContinue() {
    if (!revealed) return;
    navigation.replace('Game');
  }

  const teamLeft = teamAnim.interpolate({ inputRange: [0, 1], outputRange: [`${TRACK_MIN_PCT}%`, `${TRACK_MAX_PCT}%`] });
  const eraLeft = eraAnim.interpolate({ inputRange: [0, 1], outputRange: [`${TRACK_MIN_PCT}%`, `${TRACK_MAX_PCT}%`] });

  const teamBonus = teamLockResult === 'hit';
  const eraBonus = eraLockResult === 'hit';
  const bonusLine = [
    teamBonus ? `+${DRILL_TEAM_LOCK_REROLL_BONUS} reroll (team lock)` : null,
    eraBonus ? `+${DRILL_ERA_LOCK_OVR_BONUS} OVR first pick (era lock)` : null,
  ].filter(Boolean).join('   ');

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        <BrandBackground variant="header" style={styles.topLabelWrap}>
          <Text style={styles.roundLabel}>{roundLabel}</Text>
          <Text style={styles.title}>LOCK IT IN</Text>
          <Text style={styles.instructions}>
            Tap LOCK while each bar sweeps.{'\n'}Land in the gold zone for a bonus.
          </Text>
        </BrandBackground>

        <LockTrack
          label="TEAM"
          resultText={teamBonus ? 'BONUS!' : ''}
          markerLeft={teamLeft}
          lockState={teamLockResult}
          onLock={() => handleLock('team')}
          lockLabel="LOCK TEAM"
        />
        <LockTrack
          label="ERA"
          resultText={eraBonus ? 'BONUS!' : ''}
          markerLeft={eraLeft}
          lockState={eraLockResult}
          onLock={() => handleLock('era')}
          lockLabel="LOCK ERA"
        />

        <View style={styles.revealPanel}>
          <Text style={styles.revealLine}>Result</Text>
          <Text style={styles.revealValue}>
            {revealed && currentSpin ? `${currentSpin.team.abbr} · ${currentSpin.era}` : '— · —'}
          </Text>
          {revealed && bonusLine.length > 0 && (
            <Text style={styles.revealBonus}>{bonusLine}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !revealed && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!revealed}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, !revealed && styles.continueBtnTextDisabled]}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

interface LockTrackProps {
  label: string;
  resultText: string;
  markerLeft: Animated.AnimatedInterpolation<string>;
  lockState: LockResult;
  onLock: () => void;
  lockLabel: string;
}

function LockTrack({ label, resultText, markerLeft, lockState, onLock, lockLabel }: LockTrackProps) {
  const locked = lockState !== 'pending';
  const markerColor = lockState === 'hit' ? Colors.win : lockState === 'miss' ? Colors.steel : Colors.gold;

  return (
    <View style={styles.lockBlock}>
      <View style={styles.lockLabelRow}>
        <Text style={styles.lockLabel}>{label}</Text>
        <Text style={styles.lockResult}>{resultText}</Text>
      </View>
      <View style={styles.trackWrap}>
        <View style={styles.sweetZone} />
        <Animated.View style={[styles.marker, { left: markerLeft, backgroundColor: markerColor }]} />
      </View>
      <TouchableOpacity
        style={[styles.lockBtn, locked && styles.lockBtnDisabled]}
        onPress={onLock}
        disabled={locked}
        activeOpacity={0.85}
      >
        <Text style={[styles.lockBtnText, locked && styles.lockBtnTextDisabled]}>
          {locked ? (lockState === 'hit' ? 'LOCKED — BONUS' : 'LOCKED') : lockLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 20 },
  containerWide: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  topLabelWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingVertical: 10,
  },
  roundLabel: {
    textAlign: 'center',
    color: Colors.gold,
    fontFamily: Font.primarySemiBold,
    fontSize: Typography.md,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    fontSize: 34,
    letterSpacing: 2,
    marginBottom: 8,
  },
  instructions: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontFamily: Font.secondaryRegular,
    fontSize: Typography.sm,
    lineHeight: 18,
    marginBottom: 24,
  },
  lockBlock: { marginBottom: 20 },
  lockLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  lockLabel: {
    fontFamily: Font.primarySemiBold,
    fontSize: Typography.lg,
    letterSpacing: 1,
    color: Colors.textPrimary,
  },
  lockResult: {
    fontFamily: Font.secondaryBold,
    fontSize: Typography.sm,
    color: Colors.gold,
  },
  trackWrap: {
    position: 'relative',
    height: 36,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  sweetZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: `${SWEET_ZONE_START_PCT}%`,
    width: `${SWEET_ZONE_WIDTH_PCT}%`,
    backgroundColor: Colors.goldMuted,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
  },
  marker: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: 6,
    borderRadius: 3,
  },
  lockBtn: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderWidth: 1,
    borderColor: '#F4CA61',
  },
  lockBtnDisabled: { backgroundColor: Colors.bgCard, borderColor: Colors.borderMid },
  lockBtnText: {
    fontFamily: Font.primaryBold,
    fontSize: Typography.md,
    color: Colors.bgDark,
    letterSpacing: 1,
  },
  lockBtnTextDisabled: { color: Colors.textDim },
  revealPanel: {
    marginTop: 'auto',
    backgroundColor: Colors.bgCardDeep,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    minHeight: 84,
    justifyContent: 'center',
  },
  revealLine: {
    fontFamily: Font.secondaryMedium,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  revealValue: {
    fontFamily: Font.primaryBold,
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  revealBonus: {
    fontFamily: Font.secondarySemiBold,
    fontSize: Typography.sm,
    color: Colors.win,
    marginTop: 8,
    textAlign: 'center',
  },
  continueBtn: {
    marginTop: 14,
    marginBottom: Spacing.lg,
    minHeight: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderWidth: 1,
    borderColor: '#F5DC7A',
  },
  continueBtnDisabled: { backgroundColor: Colors.bgCard, borderColor: Colors.borderMid },
  continueBtnText: {
    fontFamily: Font.primaryBold,
    fontSize: Typography.lg,
    color: Colors.bgDark,
    letterSpacing: 1,
  },
  continueBtnTextDisabled: { color: Colors.textDim },
});
