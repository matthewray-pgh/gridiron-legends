import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getViableTeamAbbrs } from '../data/players';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { ERA_OPTIONS, EraToken, TeamScope, useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const streak = useStatsStore((s) => s.streak);
  const setMode = useGameStore((s) => s.setMode);
  const beginDraftSession = useGameStore((s) => s.beginDraftSession);
  const homeHeaderImage = require('../../assets/undefeated-gridiron-legends-header.png');
  const fallbackHeaderImage = require('../../assets/icon.png');

  const [setupVisible, setSetupVisible] = useState(false);
  const [useFallbackHeader, setUseFallbackHeader] = useState(false);
  const [pendingMode, setPendingMode] = useState<'daily' | 'classic' | 'iq'>('classic');
  const [teamScope, setTeamScope] = useState<TeamScope>('all');
  const [selectedEras, setSelectedEras] = useState<EraToken[]>(ERA_OPTIONS);
  const viableSingleTeamCount = getViableTeamAbbrs(
    ['PIT', 'DAL', 'NE', 'SF', 'GB', 'BAL', 'MIA', 'KC', 'BUF', 'DEN', 'CHI', 'NYG'],
    selectedEras,
  ).length;
  const canStart = selectedEras.length > 0 && (teamScope === 'all' || viableSingleTeamCount > 0);

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
    if (!canStart) return;
    setMode(pendingMode);
    beginDraftSession({ teamScope, selectedEras });
    setSetupVisible(false);
    navigation.navigate('Spin');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* <Image source={require('../../assets/splash-icon.png')} style={styles.bgTexture} resizeMode="cover" /> */}
      <View style={styles.bgVignetteTop} pointerEvents="none" />
      <View style={styles.bgVignetteBottom} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBrandWrap}>
            <Image
              source={useFallbackHeader ? fallbackHeaderImage : homeHeaderImage}
              style={styles.headerBrandImage}  
              accessibilityRole="image"
              accessibilityLabel="Undefeated Gridiron Legends"
              onError={() => setUseFallbackHeader(true)}
            />
          </View>
        </View>

        {/* Daily Challenge */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyTop}>
            <View>
              <Text style={styles.dailyLabel}>TODAY'S CHALLENGE</Text>
              <Text style={styles.dailyTitle}>DAILY ROSTER BUILD</Text>
              <Text style={styles.dailyMeta}>Same spins for everyone • 1 attempt</Text>
            </View>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>--</Text>
              <Text style={styles.statLabel}>PLAYERS</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={[styles.statNum, { color: Colors.gold }]}>--h --m</Text>
              <Text style={styles.statLabel}>RESETS IN</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>🔥 {streak}</Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => startGame('daily')}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.playBtnText}>PLAY TODAY&apos;S CHALLENGE</Text>
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
            <Text style={styles.modeEmoji}>100</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeName}>CLASSIC</Text>
              <Text style={styles.modeDesc}>Stats visible</Text>
            </View>
            <Text style={styles.modeChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => startGame('iq')}
            activeOpacity={0.8}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.modeEmoji}>🧠</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeName}>GRIDIRON IQ</Text>
              <Text style={styles.modeDesc}>Stats hidden</Text>
            </View>
            <Text style={styles.modeChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.8}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.modeEmoji}>⚔️</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeName}>CHALLENGE</Text>
              <Text style={styles.modeDesc}>vs friends</Text>
            </View>
            <Text style={styles.modeChevron}>›</Text>
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
            <Text style={styles.sheetIcon}>⚔︎✕</Text>
            <Text style={styles.sheetTitle}>GAME SETUP</Text>
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
                {ERA_OPTIONS.map((era) => {
                  const selected = selectedEras.includes(era);
                  return (
                    <TouchableOpacity
                      key={era}
                      style={[styles.eraChip, selected && styles.eraChipActive]}
                      onPress={() => toggleEra(era)}
                    >
                      <Text style={[styles.eraChipText, selected && styles.eraChipTextActive]}>{era}</Text>
                      {selected && (
                        <View style={styles.eraCheckBadge}>
                          <Text style={styles.eraCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
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
                style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
                onPress={handleStartFromSetup}
                disabled={!canStart}
              >
                <Text style={styles.startBtnText}>START GAME →</Text>
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
  bgTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.22,
  },
  bgVignetteTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: 260,
    backgroundColor: '#0A1220AA',
    borderBottomLeftRadius: 160,
    borderBottomRightRadius: 160,
  },
  bgVignetteBottom: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    right: -100,
    height: 320,
    backgroundColor: '#00000099',
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['2xl'] },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  headerBrandWrap: {
    flex: 1,
  },
  headerBrandImage: {
    width: '100%',
    maxWidth: 460,
    aspectRatio: 800 / 250,
    minHeight: 72,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111A25DD',
    borderWidth: 1,
    borderColor: Colors.goldMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsIcon: { fontSize: 17, fontFamily: Font.primarySemiBold },

  dailyCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#0E1722E6',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#7A612299',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  dailyLabel: {
    fontSize: Typography.md,
    color: Colors.gold,
    fontFamily: Font.primarySemiBold,
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  dailyTitle: {
    fontSize: 34,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 1.1,
    lineHeight: 36,
  },
  dailyMeta: { 
    fontSize: Typography.sm, 
    color: Colors.textSecondary, 
    marginTop: 4, 
    fontFamily: Font.secondaryRegular, 
  },
  newBadge: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E9C35A',
  },
  newBadgeText: { fontSize: Typography.md, color: Colors.bgDark, fontFamily: Font.primarySemiBold },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statPill: {
    flex: 1,
    backgroundColor: '#0B1119EE',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B3744',
  },
  statNum: { fontSize: Typography['2xl'], color: Colors.textPrimary, fontFamily: Font.primaryBold },
  statLabel: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Font.secondaryMedium,
  },

  playBtn: {
    backgroundColor: '#D4A017',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#EDCB6D',
    minHeight: 58,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: { 
    fontSize: Typography.xl, 
    color: Colors.bgDark, 
    fontFamily: Font.primaryBold 
  },

  sectionLabel: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    fontFamily: Font.primaryMedium,
    letterSpacing: 2.2,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  modeRow: { 
    flexDirection: 'column', 
    gap: 15, 
    paddingHorizontal: Spacing.lg, 
    marginBottom: Spacing.xl 
  },
  modeCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101A25E6',
    borderWidth: 1,
    borderColor: '#2C3A49',
    borderRadius: Radius.lg,
    minHeight: 90,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modeEmoji: {
    fontSize: 32,
    width: 52,
    textAlign: 'center',
    marginRight: 12,
    color: Colors.gold,
    fontFamily: Font.primaryBold,
  },
  modeTextWrap: { flex: 1 },
  modeName: { 
    fontSize: 28, 
    color: Colors.textPrimary, 
    fontFamily: Font.primaryBold 
  },
  modeDesc: { 
    fontSize: Typography.sm, 
    color: Colors.textMuted, 
    fontFamily: Font.secondaryMedium 
  },
  modeChevron: {
    position: 'absolute',
    right: 20,
    top: 10,
    color: Colors.gold,
    fontSize: 80,
    lineHeight: 80,
    fontFamily: Font.primarySemiBold,
  },

  disclaimer: {
    fontSize: Typography.md,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    fontFamily: Font.primaryRegular,
  },

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
    marginBottom: 8 
  },
  sheetLabel: { 
    color: Colors.gold, 
    fontSize: Typography.md, 
    letterSpacing: 1.4, 
    fontFamily: Font.primaryMedium 
  },
  clearText: { 
    color: Colors.gold, 
    fontSize: Typography.md, 
    fontFamily: Font.primarySemiBold, 
    letterSpacing: 1 
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#09111B',
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#2B3A48',
  },
  segmentBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#221A08',
    borderColor: '#BD9030',
    shadowColor: Colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  segmentText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.md, 
    fontFamily: Font.primaryMedium, 
    letterSpacing: 0.8 
  },
  segmentTextActive: { 
    color: Colors.gold, 
    fontFamily: Font.primaryBold 
  },
  noteText: { 
    color: Colors.textMuted, 
    fontSize: Typography.sm, 
    marginTop: 8, 
    fontFamily: Font.secondaryRegular 
  },
  chipsWrap: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    justifyContent: 'space-between' 
  },
  eraChip: {
    borderWidth: 1,
    borderColor: '#324252',
    borderRadius: Radius.md,
    width: '48.5%',
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0E1823',
    justifyContent: 'center',
  },
  eraChipActive: { borderColor: Colors.gold, backgroundColor: '#211907' },
  eraChipText: { color: Colors.textPrimary, fontSize: Typography.lg, fontFamily: Font.primaryMedium, letterSpacing: 0.9 },
  eraChipTextActive: { color: Colors.gold, fontFamily: Font.primaryBold },
  eraCheckBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraCheckText: {
    color: Colors.bgDark,
    fontSize: 12,
    lineHeight: 14,
    fontFamily: Font.secondaryBold,
  },
  warningText: { color: Colors.gold, fontSize: Typography.sm, marginTop: 8, fontFamily: Font.secondarySemiBold },
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
    fontFamily: Font.primarySemiBold, 
    letterSpacing: 0.9 
  },
  startBtn: {
    flex: 1.5,
    minHeight: 52,
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#ECCB6A',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: { 
    color: Colors.bgDark, 
    fontSize: Typography.lg, 
    fontFamily: Font.primaryBold, 
    letterSpacing: 1 
  },
});
