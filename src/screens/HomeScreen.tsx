import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const streak = useStatsStore((s) => s.streak);
  const setMode = useGameStore((s) => s.setMode);
  const resetGame = useGameStore((s) => s.resetGame);

  function startGame(mode: 'daily' | 'classic' | 'iq') {
    setMode(mode);
    resetGame();
    navigation.navigate('Game');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🏈 Gridiron Legends</Text>
            <Text style={styles.subtitle}>Can you go 20-0?</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Challenge */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyTop}>
            <View>
              <Text style={styles.dailyLabel}>TODAY'S CHALLENGE</Text>
              <Text style={styles.dailyTitle}>Daily Roster Build</Text>
              <Text style={styles.dailyMeta}>Same spins for everyone • 1 attempt</Text>
            </View>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>1,247</Text>
              <Text style={styles.statLabel}>PLAYING TODAY</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={[styles.statNum, { color: Colors.green }]}>14h 22m</Text>
              <Text style={styles.statLabel}>RESETS IN</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>🔥 {streak}</Text>
              <Text style={styles.statLabel}>DAY STREAK</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.playBtn} onPress={() => startGame('daily')} activeOpacity={0.85}>
            <Text style={styles.playBtnText}>🗓️  Play Today's Challenge</Text>
          </TouchableOpacity>
        </View>

        {/* Choose Mode */}
        <Text style={styles.sectionLabel}>CHOOSE YOUR MODE</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity style={styles.modeCard} onPress={() => startGame('classic')} activeOpacity={0.8}>
            <Text style={styles.modeEmoji}>💯</Text>
            <Text style={styles.modeName}>Classic</Text>
            <Text style={styles.modeDesc}>Stats visible</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeCard, styles.modeCardIQ]} onPress={() => startGame('iq')} activeOpacity={0.8}>
            <Text style={styles.modeEmoji}>🧠</Text>
            <Text style={styles.modeName}>Gridiron IQ</Text>
            <Text style={styles.modeDesc}>Stats hidden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modeCard} onPress={() => navigation.navigate('Leaderboard')} activeOpacity={0.8}>
            <Text style={styles.modeEmoji}>⚔️</Text>
            <Text style={styles.modeName}>Challenge</Text>
            <Text style={styles.modeDesc}>vs friends</Text>
          </TouchableOpacity>
        </View>

        {/* More Games */}
        <Text style={styles.sectionLabel}>MORE GAMES</Text>
        <View style={styles.moreRow}>
          {[
            { emoji: '🏒', name: '98-0', sport: 'Hockey' },
            { emoji: '⚽', name: '8-0', sport: 'World Cup' },
          ].map((g) => (
            <View key={g.name} style={styles.moreCard}>
              <Text style={styles.moreEmoji}>{g.emoji}</Text>
              <View>
                <Text style={styles.moreName}>{g.name}</Text>
                <Text style={styles.moreSport}>{g.sport}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Not affiliated with or endorsed by the NFL, NFLPA, or any team.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsIcon: { fontSize: 16 },

  dailyCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bgNavy,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.greenMuted,
    marginBottom: Spacing.lg,
  },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  dailyLabel: { fontSize: Typography.xs, color: Colors.green, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  dailyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  dailyMeta: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: 2 },
  newBadge: { backgroundColor: Colors.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.greenDark },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill: {
    flex: 1, backgroundColor: Colors.bgCardDeep,
    borderRadius: Radius.sm, padding: 8, alignItems: 'center',
  },
  statNum: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 1 },

  playBtn: {
    backgroundColor: Colors.green, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  playBtnText: { fontSize: Typography.md, fontWeight: '800', color: Colors.greenDark },

  sectionLabel: {
    fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '700',
    letterSpacing: 1, paddingHorizontal: Spacing.lg, marginBottom: 8,
  },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  modeCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
  },
  modeCardIQ: { backgroundColor: '#2D1B69' },
  modeEmoji: { fontSize: 18, marginBottom: 6 },
  modeName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  modeDesc: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },

  moreRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  moreCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  moreEmoji: { fontSize: 20 },
  moreName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  moreSport: { fontSize: 9, color: Colors.textMuted },

  disclaimer: {
    fontSize: 9, color: Colors.textDim, textAlign: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
  },
});
