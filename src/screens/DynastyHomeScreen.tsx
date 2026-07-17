import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { HALL_OF_FAME_ENABLED } from '../config/featureFlags';
import { totalOwnedPacks, useDynastyStore } from '../store/dynastyStore';
import { DRAFT_POSITIONS } from '../data/players';
import { EraToken, TeamScope, useGameStore } from '../store/gameStore';
import { getFullStatMetrics } from '../utils/statMetrics';
import { useResponsive } from '../hooks/useResponsive';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { GameSetupModal } from '../components/GameSetupModal';
import { BrandBackground } from '../components/BrandBackground';
import { PlayerDetailPanel } from '../components/PlayerDetailPanel';
import { RosterList, useRosterEditor } from '../components/RosterManager';
import { FieldFooterBand } from '../components/FieldFooterBand';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Season record + all-time record — shown above the roster on narrow, and
// reused inside the wide right pane's default state (docs/handoff/
// gridiron-legends-dynasty-web.html).
function SeasonCard({ season, wins, losses }: { season: number; wins: number; losses: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.seasonLabel}>SEASON {season}</Text>
        <Text style={styles.record}>{wins}-{losses} all-time</Text>
      </View>
    </View>
  );
}

function HallOfFameTeaser({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.hofCard} onPress={onPress} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <Text style={styles.hofTitle}>Hall of Fame</Text>
        <Text style={styles.hofSub}>{count} retired legend{count === 1 ? '' : 's'} · view shelf</Text>
      </View>
      <Text style={styles.hofArrow}>›</Text>
    </TouchableOpacity>
  );
}

// Legacy mode (docs/handoff/03-legacy-mode.md), renamed Dynasty throughout
// per product direction. Previously a sub-tab-bar (Dynasty / Roster /
// Packs / HOF); flattened to a single scrollable view — Roster is just
// shown inline via RosterList rather than switched to, Packs is a
// toolbar shortcut (PackOpeningScreen is its own full-screen flow), and
// Hall of Fame is pulled from the UI entirely for now (HALL_OF_FAME_ENABLED,
// see config/featureFlags.ts) while the roster-management flow settles.
//
// Wide layout (docs/handoff/gridiron-legends-dynasty-web.html): master-
// detail split, same isWide pattern GameScreen.tsx already uses for its
// draft candidates/detail panel — roster list in a left pane, a persistent
// right pane that shows either the season overview (default) or the
// selected player's detail (RosterList's onPress just calls
// editor.setSelected — see useRosterEditor in RosterManager.tsx). Narrow
// keeps the roster list inline and opens the same PlayerDetailPanel in a
// bottom-sheet Modal instead, exactly as RosterManager used to do on its
// own before this split needed the selection state one level up.
export function DynastyHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { isWide } = useResponsive();

  const rings = useDynastyStore((s) => s.rings);
  const allTimeRecord = useDynastyStore((s) => s.allTimeRecord);
  const currentSeason = useDynastyStore((s) => s.currentSeason);
  const roster = useDynastyStore((s) => s.roster);
  const hallOfFame = useDynastyStore((s) => s.hallOfFame);
  const ownedPacksCount = useDynastyStore((s) => totalOwnedPacks(s.ownedPacks));
  const setGameMode = useGameStore((s) => s.setMode);
  const beginDraftSession = useGameStore((s) => s.beginDraftSession);
  const earnRings = useDynastyStore((s) => s.earnRings);
  const resetDynasty = useDynastyStore((s) => s.resetDynasty);

  const editor = useRosterEditor();
  const [setupVisible, setSetupVisible] = useState(false);

  // Dev-only playtesting affordance: real Rings income is currently just
  // Daily Challenge completion (40/day, see TODO_BALANCE_RINGS_SOURCES),
  // still well below the pack costs (100/280/650) — this exists to unblock
  // testing the pack/roster/HOF loop without grinding Daily for days.
  // __DEV__ strips it from release builds.
  const DEV_RINGS_GRANT = 500;
  function handleDevGrantRings() {
    earnRings(DEV_RINGS_GRANT, 'dev_grant');
  }

  // Player-facing "start over" — also reused by the __DEV__-gated toolbar
  // shortcut below (same action, just a faster path for testing without
  // scrolling to the Dynasty tab).
  //
  // react-native-web's Alert.alert() is a hard no-op (see
  // node_modules/react-native-web/src/exports/Alert — `static alert() {}`),
  // so on web this confirmation never appeared and Reset never fired.
  // window.confirm() is the standard web-platform substitute for exactly
  // this case; native platforms keep the real Alert.
  const RESET_MESSAGE = 'This clears your roster, bench, Rings, record, and Hall of Fame back to Season 1. This cannot be undone.';
  function handleResetDynasty() {
    if (Platform.OS === 'web') {
      if (window.confirm(`Reset Dynasty?\n\n${RESET_MESSAGE}`)) resetDynasty();
      return;
    }
    Alert.alert(
      'Reset Dynasty?',
      RESET_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetDynasty },
      ],
    );
  }

  const hasRoster = Object.keys(roster).length > 0;
  // Packs are a post-draft reward (the initial draft itself grants a
  // bonus pack batch) — gating on `hasRoster` would be wrong here, since
  // retiring/releasing every player via RosterList can legitimately
  // empty the roster again post-draft. currentSeason only ever increments
  // once the initial draft (or a season) completes and never resets except
  // via a full Dynasty reset, so it's the reliable "drafted at least once"
  // signal.
  const hasCompletedInitialDraft = currentSeason > 1;
  // RosterList lets a starter be retired without an immediate
  // replacement (leaves that slot "Empty" until a bench player is
  // promoted or a pack pull fills it) — a season can't be simulated with
  // a missing starter, so Start Season is gated on every slot being filled.
  const openRosterSlots = DRAFT_POSITIONS.filter((pos) => !roster[pos]);
  const rosterComplete = openRosterSlots.length === 0;

  // "Start season" now runs the same simulate-and-reveal flow ResultScreen
  // already uses for the initial draft, instead of instantly updating the
  // record with no visual — mode must be set here since this flow never
  // touches gameStore's draft machinery, so gameStore.mode could otherwise
  // be stale from an unrelated earlier run.
  function handleStartSeason() {
    setGameMode('dynasty');
    navigation.navigate('Result', { dynastyContinuation: true });
  }

  // Entering Dynasty with no roster yet now always lands here first (rather
  // than HomeScreen routing straight into the draft) — this is the one-time
  // initial draft's real entry point, reusing the same Spin → Draft setup
  // flow every other mode uses.
  function handleStartFromSetup(params: { teamScope: TeamScope; selectedEras: EraToken[] }) {
    setGameMode('dynasty');
    beginDraftSession(params);
    setSetupVisible(false);
    navigation.navigate('Spin');
  }

  const rosterWarning = !rosterComplete && (
    <Text style={styles.warningText}>
      Fill {openRosterSlots.length} open roster {openRosterSlots.length === 1 ? 'spot' : 'spots'} before starting the season.
    </Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <BrandBackground variant="header" style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>DYNASTY</Text>
        {__DEV__ && (
          <TouchableOpacity style={styles.devBtn} onPress={handleDevGrantRings} activeOpacity={0.7}>
            <Text style={styles.devBtnText}>DEV +{DEV_RINGS_GRANT}</Text>
          </TouchableOpacity>
        )}
        {hasCompletedInitialDraft && (
          <TouchableOpacity
            style={styles.packsBtn}
            onPress={() => navigation.navigate('Shop')}
            activeOpacity={0.7}
            accessibilityLabel="Shop"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="cards" size={18} color={Colors.gold} />
            {ownedPacksCount > 0 && (
              <View style={styles.packsBadge}>
                <Text style={styles.packsBadgeText}>{ownedPacksCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View style={styles.ringsChip}>
          <Text style={styles.ringsText}>{rings} 💍</Text>
        </View>
      </BrandBackground>

      {hasRoster && isWide ? (
        <View style={styles.wideRow}>
          <ScrollView
            style={styles.widePaneLeft}
            contentContainerStyle={styles.widePaneLeftContent}
            showsVerticalScrollIndicator={false}
          >
            <RosterList editor={editor} />
            {rosterWarning}
          </ScrollView>

          <View style={styles.widePaneRight}>
            <ScrollView contentContainerStyle={styles.widePaneRightContent} showsVerticalScrollIndicator={false}>
              {editor.selected ? (
                <PlayerDetailPanel
                  player={editor.selected.player}
                  fallbackStatMetrics={getFullStatMetrics(editor.selected.player)}
                  actions={editor.selectedActions}
                  actionsNote={editor.actionsNote}
                  onClose={() => editor.setSelected(null)}
                />
              ) : (
                <>
                  <SeasonCard season={currentSeason} wins={allTimeRecord.wins} losses={allTimeRecord.losses} />
                  {HALL_OF_FAME_ENABLED && (
                    <HallOfFameTeaser count={hallOfFame.length} onPress={() => navigation.navigate('HallOfFame')} />
                  )}
                  <PrimaryButton
                    label={`Start season ${currentSeason}`}
                    onPress={handleStartSeason}
                    disabled={!rosterComplete}
                    style={styles.startSeasonBtn}
                  />
                  <Text style={styles.paneHint}>Select a roster or bench player on the left to bench, start, or retire them.</Text>
                  <SecondaryButton
                    label="Reset Dynasty & start over"
                    onPress={handleResetDynasty}
                    labelColor={Colors.loss}
                    style={styles.resetBtnWide}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SeasonCard season={hasRoster ? currentSeason : 0} wins={allTimeRecord.wins} losses={allTimeRecord.losses} />
          {HALL_OF_FAME_ENABLED && (
            <HallOfFameTeaser count={hallOfFame.length} onPress={() => navigation.navigate('HallOfFame')} />
          )}

          {hasRoster ? (
            <>
              <RosterList editor={editor} />
              {rosterWarning}
              <PrimaryButton
                label={`Start season ${currentSeason}`}
                onPress={handleStartSeason}
                disabled={!rosterComplete}
                style={styles.startSeasonBtn}
              />
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>No roster yet — start your Dynasty draft to build your first 12 starters.</Text>
              <PrimaryButton label="Draft Team" onPress={() => setSetupVisible(true)} style={styles.startDynastyBtn} />
            </>
          )}

          <SecondaryButton
            label="Reset Dynasty & start over"
            onPress={handleResetDynasty}
            labelColor={Colors.loss}
            style={styles.resetBtn}
          />

          <FieldFooterBand />
        </ScrollView>
      )}

      {/* Narrow-only detail sheet — wide shows the same PlayerDetailPanel in
          the persistent widePaneRight above instead. */}
      <Modal
        visible={!isWide && !!editor.selected}
        animationType="slide"
        transparent
        onRequestClose={() => editor.setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => editor.setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <PlayerDetailPanel
              player={editor.selected?.player ?? null}
              fallbackStatMetrics={getFullStatMetrics(editor.selected?.player ?? null)}
              actions={editor.selectedActions}
              actionsNote={editor.actionsNote}
              onClose={() => editor.setSelected(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <GameSetupModal
        visible={setupVisible}
        onClose={() => setSetupVisible(false)}
        onStart={handleStartFromSetup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  toolbarTitle: { flex: 1, fontSize: Typography.xl, color: Colors.textPrimary, letterSpacing: 1.1, fontFamily: Font.primaryBold },
  ringsChip: { borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  ringsText: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },
  devBtn: { borderWidth: 1, borderColor: Colors.loss, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 },
  devBtnText: { color: Colors.loss, fontSize: Typography.xs, fontFamily: Font.secondarySemiBold },
  packsBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  packsBadge: {
    position: 'absolute', top: -6, right: -6, backgroundColor: Colors.gold, borderRadius: Radius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  packsBadgeText: { color: Colors.bgDark, fontSize: Typography.xs, fontFamily: Font.secondaryBold },

  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14, marginBottom: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  seasonLabel: { fontSize: Typography.xl, color: Colors.gold, fontFamily: Font.primaryBold, letterSpacing: 1 },
  record: { fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Font.secondaryRegular },

  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, marginBottom: Spacing.lg, lineHeight: 20 },

  hofCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCardDeep,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 12, marginBottom: Spacing.lg,
  },
  hofTitle: { color: Colors.textPrimary, fontSize: Typography.base, fontFamily: Font.secondarySemiBold },
  hofSub: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 2, fontFamily: Font.secondaryRegular },
  hofArrow: { color: Colors.textMuted, fontSize: Typography.xl },

  warningText: { color: Colors.loss, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold, marginTop: Spacing.md },
  startSeasonBtn: { marginTop: Spacing.md, marginBottom: Spacing.md },
  startDynastyBtn: { marginBottom: Spacing.md },
  resetBtn: { marginTop: Spacing.sm },

  // ── WIDE MASTER-DETAIL (docs/handoff/gridiron-legends-dynasty-web.html)
  // — mirrors GameScreen.tsx's wideRow/widePaneLeft/widePaneRight pattern:
  // roster list stays a left column, a persistent right pane replaces the
  // narrow bottom-sheet Modal for player detail.
  wideRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
  },
  widePaneLeft: {
    flex: 1.3,
  },
  widePaneLeftContent: {
    paddingVertical: Spacing.lg,
    paddingRight: Spacing.xl,
  },
  widePaneRight: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    backgroundColor: Colors.bgCardDeep,
  },
  widePaneRightContent: {
    padding: Spacing.xl,
  },
  paneHint: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontFamily: Font.secondaryRegular,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  resetBtnWide: {
    marginTop: Spacing.xl,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#070A0ED1',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
});
