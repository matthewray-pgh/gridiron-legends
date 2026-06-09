import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../theme/colors';
import { ERA_OPTIONS, FRANCHISES, useGameStore } from '../store/gameStore';
import { DRAFT_POSITIONS } from '../data/players';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SpinScreen() {
  const navigation = useNavigation<Nav>();
  const {
    positionIndex,
    currentSpin,
    rollSpin,
    rerollSpin,
    spinState,
    setSpinState,
    rerollsRemaining,
  } = useGameStore();

  const [isAnimating, setIsAnimating] = useState(false);
  const [previewTeam, setPreviewTeam] = useState('?');
  const [previewEra, setPreviewEra] = useState('?');
  const teamReel = useRef(new Animated.Value(0)).current;
  const eraReel = useRef(new Animated.Value(0)).current;

  const side = positionIndex < Math.ceil(DRAFT_POSITIONS.length / 2) ? 'OFFENSE' : 'DEFENSE';
  const roundLabel = `ROUND ${positionIndex + 1}/${DRAFT_POSITIONS.length} · ${side}`;

  const canAdvance = spinState === 'revealed' && currentSpin;
  const teamDisplay = useMemo(() => {
    if (spinState === 'spinning') return previewTeam;
    if (spinState === 'revealed' && currentSpin) return currentSpin.team.abbr;
    return '?';
  }, [spinState, currentSpin, previewTeam]);

  const eraDisplay = useMemo(() => {
    if (spinState === 'spinning') return previewEra;
    if (spinState === 'revealed' && currentSpin) return currentSpin.era;
    return '?';
  }, [spinState, currentSpin, previewEra]);

  useEffect(() => {
    if (spinState !== 'spinning') return;
    const timer = setInterval(() => {
      const team = FRANCHISES[Math.floor(Math.random() * FRANCHISES.length)];
      const era = ERA_OPTIONS[Math.floor(Math.random() * ERA_OPTIONS.length)];
      setPreviewTeam(team.abbr);
      setPreviewEra(era);
    }, 90);

    return () => clearInterval(timer);
  }, [spinState]);

  useEffect(() => {
    if (spinState !== 'spinning') {
      teamReel.stopAnimation();
      eraReel.stopAnimation();
      teamReel.setValue(0);
      eraReel.setValue(0);
      return;
    }

    const spinReel = (value: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 140,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const teamLoop = spinReel(teamReel);
    const eraLoop = spinReel(eraReel);
    teamLoop.start();
    eraLoop.start();

    return () => {
      teamLoop.stop();
      eraLoop.stop();
    };
  }, [spinState, teamReel, eraReel]);

  const teamTranslateY = teamReel.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const eraTranslateY = eraReel.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  function triggerSpin() {
    if (isAnimating || spinState === 'revealed') return;
    setIsAnimating(true);
    setSpinState('spinning');
    setPreviewTeam('?');
    setPreviewEra('?');
    setTimeout(() => {
      rollSpin();
      setIsAnimating(false);
    }, 1200);
  }

  function handleReroll() {
    if (rerollsRemaining <= 0 || isAnimating) return;
    rerollSpin();
    triggerSpin();
  }

  function handleAdvance() {
    if (!canAdvance) return;
    navigation.replace('Game');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.container} onPress={() => (canAdvance ? handleAdvance() : triggerSpin())}>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />

        <Text style={styles.roundLabel}>{roundLabel}</Text>

        <View style={styles.cardsFrame}>
          <View style={styles.cardsColumn}>
            <View style={[styles.spinCard, styles.teamCard]}>
              <Text style={[styles.cardTag, { color: Colors.gold }]}>TEAM</Text>
              <View style={styles.reelWindow}>
                <Animated.Text style={[styles.cardValue, { transform: [{ translateY: teamTranslateY }] }]}> 
                  {teamDisplay}
                </Animated.Text>
              </View>
            </View>
            <View style={[styles.spinCard, styles.eraCard]}>
              <Text style={[styles.cardTag, { color: Colors.steel }]}>ERA</Text>
              <View style={styles.reelWindow}>
                <Animated.Text style={[styles.cardValue, { transform: [{ translateY: eraTranslateY }] }]}> 
                  {eraDisplay}
                </Animated.Text>
              </View>
            </View>
          </View>
        </View>

        {spinState !== 'revealed' ? (
          <>
            <TouchableOpacity style={styles.spinBtn} onPress={triggerSpin} activeOpacity={0.85}>
              <Text style={styles.spinText}>SPIN</Text>
            </TouchableOpacity>
            <Text style={styles.helper}>Tap anywhere to spin</Text>
          </>
        ) : (
          <>
            <Text style={styles.teamName}>{currentSpin?.team.name}</Text>
            <TouchableOpacity style={styles.goBtn} onPress={handleAdvance} activeOpacity={0.85}>
              <Text style={styles.goText}>LET&apos;S GO</Text>
            </TouchableOpacity>
            <View style={styles.bottomRow}>
              <TouchableOpacity
                onPress={handleReroll}
                disabled={rerollsRemaining <= 0}
                style={[styles.rerollBtn, rerollsRemaining <= 0 && styles.rerollBtnDisabled]}
              >
                <Text style={[styles.rerollText, rerollsRemaining <= 0 && styles.rerollTextDisabled]}>
                  Reroll ({rerollsRemaining})
                </Text>
              </TouchableOpacity>
              <Text style={styles.helper}>TAP ANYWHERE TO SKIP</Text>
            </View>
          </>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 20, overflow: 'hidden' },
  bgOrbTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.gridironBlue + '33',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -140,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.goldMuted,
  },
  roundLabel: {
    textAlign: 'center',
    color: Colors.steel,
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 24,
  },
  cardsFrame: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    backgroundColor: '#0B0F14CC',
    padding: 12,
    marginTop: 4,
  },
  cardsColumn: { gap: 12 },
  spinCard: {
    minHeight: 210,
    borderRadius: Radius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  teamCard: { borderColor: Colors.gold },
  eraCard: { borderColor: Colors.gridironBlue },
  cardTag: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
  },
  reelWindow: {
    height: 64,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: { fontSize: 44, color: Colors.textPrimary, fontWeight: '900', textAlign: 'center', letterSpacing: -0.8 },
  spinBtn: {
    marginTop: 28,
    backgroundColor: Colors.gold,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#F4CA61',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinText: { color: Colors.bgDark, fontSize: Typography.lg, fontWeight: '900', letterSpacing: 0.4 },
  helper: { marginTop: 10, color: Colors.textMuted, textAlign: 'center', fontSize: Typography.sm },
  teamName: {
    marginTop: 22,
    color: Colors.steel,
    textAlign: 'center',
    fontSize: Typography.base,
    fontWeight: '600',
  },
  goBtn: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  goText: { color: Colors.gold, fontSize: Typography.lg, fontWeight: '800' },
  bottomRow: { marginTop: 18, alignItems: 'center', gap: 8 },
  rerollBtn: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rerollBtnDisabled: { opacity: 0.45 },
  rerollText: { color: Colors.textSecondary, fontSize: Typography.base, fontWeight: '700' },
  rerollTextDisabled: { color: Colors.textDim },
});
