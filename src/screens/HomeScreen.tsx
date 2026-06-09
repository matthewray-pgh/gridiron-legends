import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { ERA_OPTIONS, EraToken, TeamScope, useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const streak = useStatsStore((s) => s.streak);
  const setMode = useGameStore((s) => s.setMode);
  const beginDraftSession = useGameStore((s) => s.beginDraftSession);

  const [setupVisible, setSetupVisible] = useState(false);
  const [pendingMode, setPendingMode] = useState<'daily' | 'classic' | 'iq'>('classic');
  const [teamScope, setTeamScope] = useState<TeamScope>('all');
  const [selectedEras, setSelectedEras] = useState<EraToken[]>(ERA_OPTIONS);

  function startGame(mode: 'daily' | 'classic' | 'iq') {
    setPendingMode(mode);
    setSetupVisible(true);
  }

  function toggleEra(era: EraToken) {
    setSelectedEras((current) => (current.includes(era) ? current.filter((e) => e !== era) : [...current, era]));
  }

  function toggleSelectAllEras() {
    setSelectedEras((current) => (current.length === 0 ? ERA_OPTIONS : []));
  }

  function handleStartFromSetup() {
    if (selectedEras.length === 0) return;
    setMode(pendingMode);
    beginDraftSession({ teamScope, selectedEras });
    setSetupVisible(false);
    navigation.navigate('Spin');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🏈 Gridiron Legends</Text>
            <Text style={styles.subtitle}>Can you go 20-0?</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => startGame('daily')}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.playBtnText}>🗓️  Play Today's Challenge</Text>
          </TouchableOpacity>
        </View>

        {/* Choose Mode */}
        <Text style={styles.sectionLabel}>CHOOSE YOUR MODE</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => startGame('classic')}
            activeOpacity={0.8}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.modeEmoji}>💯</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeName}>Classic</Text>
              <Text style={styles.modeDesc}>Stats visible</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeCard, styles.modeCardIQ]}
            onPress={() => startGame('iq')}
            activeOpacity={0.8}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.modeEmoji}>🧠</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeName}>Gridiron IQ</Text>
              <Text style={styles.modeDesc}>Stats hidden</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.8}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.modeEmoji}>⚔️</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeName}>Challenge</Text>
              <Text style={styles.modeDesc}>vs friends</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Not affiliated with or endorsed by the NFL, NFLPA, or any team.
        </Text>
      </ScrollView>

      <Modal visible={setupVisible} transparent animationType="slide" onRequestClose={() => setSetupVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSetupVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Game Setup</Text>
            <Text style={styles.sheetHint}>Configure constraints for each round&apos;s team + era spin.</Text>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetLabel}>TEAMS</Text>
              <View style={styles.segmentWrap}>
                <TouchableOpacity
                  style={[styles.segmentBtn, teamScope === 'all' && styles.segmentBtnActive]}
                  onPress={() => setTeamScope('all')}
                >
                  <Text style={[styles.segmentText, teamScope === 'all' && styles.segmentTextActive]}>All teams</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, teamScope === 'single' && styles.segmentBtnActive]}
                  onPress={() => setTeamScope('single')}
                >
                  <Text style={[styles.segmentText, teamScope === 'single' && styles.segmentTextActive]}>One team</Text>
                </TouchableOpacity>
              </View>
              {teamScope === 'single' && (
                <Text style={styles.noteText}>A franchise will be randomly assigned on Round 1 spin.</Text>
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
                {ERA_OPTIONS.map((era) => {
                  const selected = selectedEras.includes(era);
                  return (
                    <TouchableOpacity
                      key={era}
                      style={[styles.eraChip, selected && styles.eraChipActive]}
                      onPress={() => toggleEra(era)}
                    >
                      <Text style={[styles.eraChipText, selected && styles.eraChipTextActive]}>{era}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedEras.length === 0 && (
                <Text style={styles.warningText}>Select at least one era to continue</Text>
              )}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setSetupVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startBtn, selectedEras.length === 0 && styles.startBtnDisabled]}
                onPress={handleStartFromSetup}
                disabled={selectedEras.length === 0}
              >
                <Text style={styles.startBtnText}>Start game →</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['2xl'] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  settingsBtn: {
    width: 48, height: 48, borderRadius: 24,
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
    marginBottom: Spacing.xl,
  },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  dailyLabel: { fontSize: Typography.sm, color: Colors.green, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  dailyTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary },
  dailyMeta: { fontSize: Typography.md, color: Colors.textSecondary, marginTop: 2 },
  newBadge: { backgroundColor: Colors.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  newBadgeText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.greenDark },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statPill: {
    flex: 1, backgroundColor: Colors.bgCardDeep,
    borderRadius: Radius.sm, paddingVertical: 20, paddingHorizontal: 8, alignItems: 'center',
  },
  statNum: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 1, textAlign: 'center' },

  playBtn: {
    backgroundColor: Colors.green, borderRadius: Radius.md,
    minHeight: 58, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  playBtnText: { fontSize: Typography.md, fontWeight: '800', color: Colors.greenDark },

  sectionLabel: {
    fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '700',
    letterSpacing: 1, paddingHorizontal: Spacing.lg, marginBottom: 10,
  },
  modeRow: { flexDirection: 'column', gap: 15, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  modeCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    minHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  modeCardIQ: { backgroundColor: '#2D1B69' },
  modeEmoji: { fontSize: 22, width: 32, textAlign: 'center', marginRight: 12 },
  modeTextWrap: { flex: 1 },
  modeName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  modeDesc: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },

  disclaimer: {
    fontSize: 9, color: Colors.textDim, textAlign: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetTitle: { fontSize: Typography.xl, color: Colors.textPrimary, fontWeight: '800' },
  sheetHint: { fontSize: Typography.base, color: Colors.textMuted, marginTop: 4 },
  sheetSection: { marginTop: 16 },
  sheetSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetLabel: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '700', letterSpacing: 1 },
  clearText: { color: Colors.green, fontSize: Typography.sm, fontWeight: '700' },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: Colors.bgNavy },
  segmentText: { color: Colors.textMuted, fontSize: Typography.base, fontWeight: '600' },
  segmentTextActive: { color: Colors.green, fontWeight: '700' },
  noteText: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eraChip: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.bgCard,
  },
  eraChipActive: { borderColor: Colors.green, backgroundColor: Colors.bgNavy },
  eraChipText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
  eraChipTextActive: { color: Colors.green, fontWeight: '700' },
  warningText: { color: '#F97316', fontSize: Typography.sm, marginTop: 8 },
  sheetActions: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelText: { color: Colors.textSecondary, fontSize: Typography.base, fontWeight: '700' },
  startBtn: {
    minHeight: 48,
    backgroundColor: '#F97316',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '800' },
});
