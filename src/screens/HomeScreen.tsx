import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { getViableTeamAbbrs } from '../data/players';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { useStatsStore } from '../store/statsStore';
import { ERA_OPTIONS, EraToken, TeamScope, useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Asset references ────────────────────────────────────────────────────────
// Drop your generated images into assets/ with these exact names.
// React Native auto-selects @2x / @3x variants on high-DPI devices.
//
//   assets/stadium-bg.png        (430 × 932 px baseline)
//   assets/stadium-bg@2x.png     (860 × 1864 px)
//   assets/stadium-bg@3x.png     (1290 × 2796 px)
//
//   assets/field-bottom.png      (430 × 220 px baseline, top edge transparent/faded)
//   assets/field-bottom@2x.png   (860 × 440 px)
//   assets/field-bottom@3x.png   (1290 × 660 px)
//
//   assets/undefeated-header.png        (800 × 220 px baseline, transparent bg)
//   assets/undefeated-header@2x.png     (1600 × 440 px)
//   assets/undefeated-header@3x.png     (2400 × 660 px)
//
// Until the real images are ready the LinearGradient fallbacks keep the
// screen functional and on-brand.

const STADIUM_BG    = require('../../assets/stadium-bg.png');
const FIELD_BOTTOM  = require('../../assets/field-bottom.png');
const HEADER_LOGO   = require('../../assets/undefeated-gridiron-legends-header.png');
const FALLBACK_LOGO = require('../../assets/icon.png');

export function HomeScreen() {
  const navigation             = useNavigation<Nav>();
  const streak                 = useStatsStore((s) => s.streak);
  const setMode                = useGameStore((s) => s.setMode);
  const beginDraftSession      = useGameStore((s) => s.beginDraftSession);
  const { width: screenWidth } = useWindowDimensions();

  const [setupVisible,    setSetupVisible]    = useState(false);
  const [useFallbackLogo, setUseFallbackLogo] = useState(false);
  const [stadiumError,    setStadiumError]    = useState(false);
  const [fieldError,      setFieldError]      = useState(false);
  const [pendingMode,     setPendingMode]     = useState<'daily' | 'classic' | 'iq' | 'timer'>('classic');
  const [teamScope,       setTeamScope]       = useState<TeamScope>('all');
  const [selectedEras,    setSelectedEras]    = useState<EraToken[]>(ERA_OPTIONS);

  const viableSingleTeamCount = getViableTeamAbbrs(
    ['PIT', 'DAL', 'NE', 'SF', 'GB', 'BAL', 'MIA', 'KC', 'BUF', 'DEN', 'CHI', 'NYG'],
    selectedEras,
  ).length;
  const canStart = selectedEras.length > 0 && (teamScope === 'all' || viableSingleTeamCount > 0);

  function startGame(mode: 'daily' | 'classic' | 'iq' | 'timer') {
    setPendingMode(mode);
    setSetupVisible(true);
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
    navigation.navigate('Spin');
  }

  // Header logo: scales proportionally to screen width.
  // Ratio matches the recommended export canvas (800 x 220 px).
  const logoWidth  = screenWidth * 0.72;
  const logoHeight = Math.round(logoWidth * (220 / 800));

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── STADIUM BACKGROUND ─────────────────────────────────────────────
           Full-screen image pinned behind everything. A dark LinearGradient
           scrim sits on top so UI text/cards stay readable regardless of
           how bright the source image is.
           Falls back to a plain dark gradient until the PNG is in assets.  */}
      {stadiumError ? (
        <LinearGradient
          colors={['#1C2B3A', '#0D151E', '#060A0E']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : (
        <ImageBackground
          source={STADIUM_BG}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setStadiumError(true)}
        >
          <LinearGradient
            colors={['#0B0F14CC', '#0B0F14AA', '#0B0F14F0']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </ImageBackground>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER ───────────────────────────────────────────────────────
             Logo width is 72% of screen width; height derives from the
             asset aspect ratio (800x220) so it scales on every device.
             Settings gear is wired and visible in the top-right corner.   */}
        <View style={styles.header}>
          <Image
            source={useFallbackLogo ? FALLBACK_LOGO : HEADER_LOGO}
            style={{ width: logoWidth, height: logoHeight }}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Undefeated Gridiron Legends"
            onError={() => setUseFallbackLogo(true)}
          />
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => { /* navigate to settings */ }}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* ── DAILY CHALLENGE CARD ─────────────────────────────────────── */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
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

          {/* Gold metallic gradient CTA button — matches the mockup sheen */}
          <TouchableOpacity
            onPress={() => startGame('daily')}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#A86A05', '#D4A017', '#F0CC50', '#D4A017', '#A86A05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.playBtn}
            >
              <Text style={styles.playBtnText}>PLAY TODAY'S CHALLENGE</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── CHOOSE YOUR MODE ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>CHOOSE YOUR MODE</Text>
        <View style={styles.modeRow}>
          {[
            { id: 'classic', emoji: '100', label: 'CLASSIC',     desc: 'Stats visible', onPress: () => startGame('classic') },
            { id: 'iq',      emoji: '🧠',  label: 'GRIDIRON IQ', desc: 'Stats hidden',  onPress: () => startGame('iq') },
          ].map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.modeCard}
              onPress={mode.onPress}
              activeOpacity={0.8}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.modeEmoji}>{mode.emoji}</Text>
              <View style={styles.modeTextWrap}>
                <Text style={styles.modeName}>{mode.label}</Text>
                <Text style={styles.modeDesc}>{mode.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

         <View style={styles.modeRow}>
          {[
            { id: 'timer',  emoji: '⏱',  label: 'TIMED', desc: 'Beat the clock', onPress: () => startGame('timer') },
            { id: 'chal',    emoji: '⚔️',  label: 'CHALLENGE',   desc: 'vs friends',    onPress: () => navigation.navigate('Leaderboard') },
          ].map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.modeCard}
              onPress={mode.onPress}
              activeOpacity={0.8}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.modeEmoji}>{mode.emoji}</Text>
              <View style={styles.modeTextWrap}>
                <Text style={styles.modeName}>{mode.label}</Text>
                <Text style={styles.modeDesc}>{mode.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DISCLAIMER ───────────────────────────────────────────────── */}
        <Text style={styles.disclaimer}>
          Not affiliated with or endorsed by the NFL, NFLPA, or any team.
        </Text>

        {/* ── FIELD BOTTOM IMAGE ───────────────────────────────────────────
             Always screen-width wide. aspectRatio (430/220) matches the
             export canvas so height auto-scales on any device.
             A LinearGradient fades the top edge into the background above.
             Falls back to a dark-green gradient until PNG is in assets.   */}
        {/* <View style={[styles.fieldWrap, { width: screenWidth }]}>
          {fieldError ? (
            <LinearGradient
              colors={['#00000000', '#0A1A0E', '#0D2310']}
              locations={[0, 0.4, 1]}
              style={styles.fieldFallback}
            />
          ) : (
            <Image
              source={FIELD_BOTTOM}
              style={styles.fieldImage}
              resizeMode="cover"
              onError={() => setFieldError(true)}
              accessible={false}
            />
          )}
          
          <LinearGradient
            colors={['#0B0F14FF', '#00000000']}
            locations={[0, 0.4]}
            style={styles.fieldTopFade}
            pointerEvents="none"
          />
        </View> */}

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
    backgroundColor: '#0B0F14', // Midnight Black — visible before images load
  },

  // ── SCROLL
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 }, // field image provides bottom padding

  // ── HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111A25DD',
    borderWidth: 1,
    borderColor: '#8B6B2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  settingsIcon: {
    fontSize: 18,
    color: Colors.gold,
  },

  // ── DAILY CARD
  dailyCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#0E1722E6',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#8B6B2C',
    marginBottom: Spacing.xl,
    shadowColor: '#C9930A',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dailyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
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
  newBadgeText: {
    fontSize: Typography.md,
    color: Colors.bgDark,
    fontFamily: Font.primarySemiBold,
  },

  // ── STAT PILLS
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
  statNum: {
    fontSize: Typography['2xl'],
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
  },
  statLabel: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: Font.secondaryMedium,
  },

  // ── PLAY BUTTON — LinearGradient is the container; styles apply to it.
  playBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#F5DC7A',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  playBtnText: {
    fontSize: Typography.xl,
    color: Colors.bgDark,
    fontFamily: Font.primaryBold,
    letterSpacing: 0.8,
  },

  // ── MODE CARDS
  sectionLabel: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    fontFamily: Font.primaryMedium,
    letterSpacing: 2.2,
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modeCard: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: '#111C28F0',
    borderWidth: 1,
    borderColor: '#2C3A4A',
    borderTopColor: '#3A4E62',  // subtle top highlight simulates bevel edge
    borderRadius: 12,
    minHeight: 90,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modeEmoji: {
    fontSize: 32,
    width: 52,
    textAlign: 'center',
    color: Colors.gold,
    fontFamily: Font.primaryBold,
  },
  modeTextWrap: { flex: 1 },
  modeName: {
    fontSize: 28,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    textAlign: 'center',
  },
  modeDesc: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontFamily: Font.secondaryMedium,
    textAlign: 'center',
  },

  // ── DISCLAIMER
  disclaimer: {
    fontSize: Typography.md,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    fontFamily: Font.primaryRegular,
  },

  // ── FIELD BOTTOM
  // width set dynamically to screenWidth so it always bleeds edge-to-edge.
  // aspectRatio (430/220) matches the export canvas; height auto-scales.
  fieldWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  fieldImage: {
    width: '100%',
    aspectRatio: 430 / 220,
  },
  fieldFallback: {
    width: '100%',
    height: 180,
  },
  fieldTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
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
    letterSpacing: 0.8,
  },
  segmentTextActive: {
    color: Colors.gold,
    fontFamily: Font.primaryBold,
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
  eraChipText: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontFamily: Font.primaryMedium,
    letterSpacing: 0.9,
  },
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
