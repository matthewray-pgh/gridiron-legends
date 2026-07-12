import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { ERA_OPTIONS, FRANCHISES, useGameStore } from '../store/gameStore';
import { DRAFT_POSITIONS } from '../data/players';
import { SpinCard, ChamferButtonBackground } from '../components/SpinOrnaments';
import { useResponsive } from '../hooks/useResponsive';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SpinScreen() {
  const navigation = useNavigation<Nav>();
  const { isWide } = useResponsive();
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

  const roundLabel = `ROUND ${positionIndex + 1}/${DRAFT_POSITIONS.length}`;
  const roundPositionType = useMemo(() => {
    return positionIndex <= 5 ? 'OFFENSE' : 'DEFENSE';
  }, [positionIndex]);

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
      <Pressable
        style={[styles.container, isWide && styles.containerWide]}
        onPress={() => (canAdvance ? handleAdvance() : triggerSpin())}
      >
        <Text style={styles.roundLabel}>{roundLabel}</Text>

        <Text style={styles.roundPositionLabel}>{roundPositionType}</Text>

        <View style={styles.dividerRow}>
          <LinearGradient
            colors={['transparent', Colors.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dividerLine}
          />
        </View>

        <View style={styles.cardsColumn}>
          <SpinCard tone="gold" label="TEAM" useTexture>
            <Animated.Text
              style={[styles.cardValue, { transform: [{ translateY: teamTranslateY }] }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {teamDisplay}
            </Animated.Text>
          </SpinCard>
          <SpinCard tone="silver" label="ERA">
            <Animated.Text
              style={[styles.cardValue, styles.cardValueSilver, { transform: [{ translateY: eraTranslateY }] }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {eraDisplay}
            </Animated.Text>
          </SpinCard>
        </View>

        {spinState !== 'revealed' ? (
          <>
            <TouchableOpacity style={styles.spinBtn} onPress={triggerSpin} activeOpacity={0.85}>
              <ChamferButtonBackground />
              <Text style={styles.spinText}>★  SPIN  ★</Text>
            </TouchableOpacity>
            <Text style={styles.helper}>Tap anywhere to spin</Text>
          </>
        ) : (
          <>
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
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 20 },
  containerWide: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  roundLabel: {
    textAlign: 'center',
    color: Colors.gold,
    fontFamily: Font.primarySemiBold,
    fontSize: Typography.md,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  roundPositionLabel: {
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    fontSize: 34,
    letterSpacing: 2,
    marginBottom: 14,
  },
  dividerRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    height: 1.5,
    width: '82%',
  },
  cardsColumn: { gap: 16 },
  cardValue: {
    fontSize: 46,
    color: Colors.gold,
    fontFamily: Font.primaryBold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  cardValueSilver: { color: Colors.textPrimary, fontSize: 32, letterSpacing: 0 },
  spinBtn: {
    marginTop: 28,
    borderRadius: Radius.md,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spinText: {
    color: Colors.bgDark,
    fontSize: Typography.xl,
    fontFamily: Font.primaryBold,
    letterSpacing: 2,
  },
  helper: { 
    marginTop: 10, 
    color: Colors.textMuted, 
    textAlign: 'center', 
    fontSize: Typography.sm,
    fontFamily: Font.secondaryRegular,
  },
  goBtn: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  goText: { 
    color: Colors.gold, 
    fontSize: Typography.xl, 
    fontFamily: Font.primaryBold 
  },
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
  rerollText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.md, 
    fontFamily: Font.primaryBold 
  },
  rerollTextDisabled: { color: Colors.textDim },
});
