import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../theme/colors';
import { PlayerCard } from '../components/PlayerCard';
import { useGameStore } from '../store/gameStore';
import { DRAFT_POSITIONS } from '../data/players';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function GameScreen() {
  const navigation = useNavigation<Nav>();
  const {
    positionIndex, passesUsed, roster, isComplete,
    keepPlayer, passPlayer, resetGame,
    currentPosition, currentPlayer, maxPasses, mode,
  } = useGameStore();

  const [spinning, setSpinning] = useState(false);
  const [cardOpacity] = useState(new Animated.Value(1));

  const position = currentPosition();
  const player = currentPlayer();
  const passCount = passesUsed[position] ?? 0;
  const passes = maxPasses();
  const hideStats = mode === 'iq';
  const progress = positionIndex / DRAFT_POSITIONS.length;

  useEffect(() => {
    if (isComplete) {
      navigation.replace('Result');
    }
  }, [isComplete]);

  function animateCard(callback: () => void) {
    Animated.sequence([
      Animated.timing(cardOpacity, { toValue: 0.3, duration: 180, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start(callback);
  }

  function handleKeep() {
    animateCard(() => {
      if (positionIndex + 1 < DRAFT_POSITIONS.length) {
        setSpinning(true);
        keepPlayer();
        setTimeout(() => setSpinning(false), 600);
      } else {
        keepPlayer();
      }
    });
  }

  function handlePass() {
    if (passCount >= passes) return;
    animateCard(() => passPlayer());
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => { resetGame(); navigation.goBack(); }} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>DRAFTING ROSTER</Text>
            <Text style={styles.progressCounter}>{positionIndex + 1}/{DRAFT_POSITIONS.length}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      {/* Position label */}
      <View style={styles.posRow}>
        <View style={styles.posPill}>
          <Text style={styles.posText}>Pick your </Text>
          <Text style={[styles.posText, { color: Colors.green }]}>{position}</Text>
        </View>
      </View>

      {/* Player card or spinner */}
      {spinning ? (
        <View style={styles.spinner}>
          <Text style={styles.spinnerEmoji}>🎰</Text>
          <Text style={styles.spinnerLabel}>Spinning for</Text>
          <Text style={styles.spinnerPos}>{DRAFT_POSITIONS[positionIndex]}</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: cardOpacity }}>
          <PlayerCard
            player={player}
            passCount={passCount}
            maxPasses={passes}
            hideStats={hideStats}
          />
        </Animated.View>
      )}

      {/* Action buttons */}
      {!spinning && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.passBtn, passCount >= passes && styles.passBtnDisabled]}
            onPress={handlePass}
            disabled={passCount >= passes}
            activeOpacity={0.8}
          >
            <Text style={[styles.passBtnText, passCount >= passes && styles.passBtnTextDisabled]}>
              ✕  Pass
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepBtn} onPress={handleKeep} activeOpacity={0.85}>
            <Text style={styles.keepBtnText}>✓  Draft {position}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mini roster */}
      <View style={styles.rosterWrap}>
        <Text style={styles.rosterLabel}>YOUR ROSTER</Text>
        <View style={styles.rosterChips}>
          {DRAFT_POSITIONS.map((pos, i) => (
            <View
              key={pos}
              style={[
                styles.chip,
                roster[pos] && styles.chipFilled,
                i === positionIndex && styles.chipActive,
              ]}
            >
              <Text style={[
                styles.chipText,
                roster[pos] ? styles.chipTextFilled : i === positionIndex ? styles.chipTextActive : styles.chipTextEmpty,
              ]}>
                {pos} {roster[pos] ? '✓' : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 0,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  progressWrap: { flex: 1 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '700' },
  progressCounter: { fontSize: Typography.sm, color: Colors.textSecondary },
  progressTrack: {
    height: 4, backgroundColor: Colors.bgCard, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.green, borderRadius: 2 },

  posRow: { alignItems: 'center', paddingVertical: 12 },
  posPill: {
    flexDirection: 'row', backgroundColor: Colors.bgCard,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4,
  },
  posText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textSecondary },

  spinner: {
    marginHorizontal: 20, height: 320, backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  spinnerEmoji: { fontSize: 36, marginBottom: 12 },
  spinnerLabel: { fontSize: Typography.md, color: Colors.textMuted },
  spinnerPos: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.green, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.xl, marginTop: 4 },
  passBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1,
    borderColor: Colors.borderMid, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  passBtnDisabled: { borderColor: Colors.bgCard },
  passBtnText: { fontSize: Typography.md, fontWeight: '700', color: Colors.textSecondary },
  passBtnTextDisabled: { color: Colors.borderMid },
  keepBtn: {
    flex: 2, backgroundColor: Colors.green,
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  keepBtnText: { fontSize: Typography.md, fontWeight: '800', color: Colors.greenDark },

  rosterWrap: { padding: Spacing.lg, paddingBottom: 4 },
  rosterLabel: { fontSize: Typography.xs, color: Colors.textDim, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  rosterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipFilled: { backgroundColor: Colors.bgNavy },
  chipActive: { borderColor: Colors.green },
  chipText: { fontSize: 9, fontWeight: '700' },
  chipTextFilled: { color: Colors.green },
  chipTextActive: { color: Colors.textSecondary },
  chipTextEmpty: { color: Colors.borderMid },
});
