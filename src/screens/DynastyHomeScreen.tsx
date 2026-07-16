import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { DRAFT_POSITIONS, parseYear } from '../data/players';
import { PACK_CARD_COUNT } from '../data/packs';
import { BENCH_CAPACITY, useDynastyStore } from '../store/dynastyStore';
import { EraToken, TeamScope, useGameStore } from '../store/gameStore';
import { PlayerRow } from '../components/PlayerRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { GameSetupModal } from '../components/GameSetupModal';
import { BrandBackground } from '../components/BrandBackground';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'dynasty' | 'roster' | 'packs';

// Legacy mode (docs/handoff/03-legacy-mode.md), renamed Dynasty throughout
// per product direction. This screen owns its own sub-tab-bar (Dynasty /
// Roster / Packs / HOF) as internal tab state rather than a nested
// navigator — HOF is the one tab that pushes to its own route (HOF is
// scoped as a standalone list screen, not detailed for inline display).
export function DynastyHomeScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('dynasty');

  const dynastyLevel = useDynastyStore((s) => s.dynastyLevel);
  const dynastyXP = useDynastyStore((s) => s.dynastyXP);
  const xpToNextLevel = useDynastyStore((s) => s.xpToNextLevel);
  const rings = useDynastyStore((s) => s.rings);
  const allTimeRecord = useDynastyStore((s) => s.allTimeRecord);
  const currentSeason = useDynastyStore((s) => s.currentSeason);
  const roster = useDynastyStore((s) => s.roster);
  const bench = useDynastyStore((s) => s.bench);
  const hallOfFame = useDynastyStore((s) => s.hallOfFame);
  const ownedPacks = useDynastyStore((s) => s.ownedPacks);
  const retirePlayer = useDynastyStore((s) => s.retirePlayer);
  const swapStarterWithBench = useDynastyStore((s) => s.swapStarterWithBench);
  const releaseFromBench = useDynastyStore((s) => s.releaseFromBench);
  const setGameMode = useGameStore((s) => s.setMode);
  const beginDraftSession = useGameStore((s) => s.beginDraftSession);
  const earnRings = useDynastyStore((s) => s.earnRings);
  const resetDynasty = useDynastyStore((s) => s.resetDynasty);

  const [setupVisible, setSetupVisible] = useState(false);

  // Dev-only playtesting affordance: real Rings income is currently just
  // Daily Challenge completion (15/day), far below the pack cost (100) —
  // this exists to unblock testing the pack/roster/HOF loop without
  // grinding Daily for a week. __DEV__ strips it from release builds.
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
  const RESET_MESSAGE = 'This clears your roster, bench, Rings, record, and Hall of Fame back to Level 1. This cannot be undone.';
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

  const filledSlots = DRAFT_POSITIONS.filter((pos) => roster[pos]);
  const hasRoster = filledSlots.length > 0;
  const progressPct = xpToNextLevel > 0 ? Math.min(1, dynastyXP / xpToNextLevel) : 0;

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

  function handleTabPress(next: Tab | 'hof') {
    if (next === 'hof') {
      navigation.navigate('HallOfFame');
      return;
    }
    setTab(next);
  }

  const dynastyTab = (
    <>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.level}>LEVEL {dynastyLevel}</Text>
          <Text style={styles.record}>{allTimeRecord.wins}-{allTimeRecord.losses} all-time</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
        <Text style={styles.progressCaption}>{dynastyXP} / {xpToNextLevel} XP to level {dynastyLevel + 1}</Text>
      </View>

      <Text style={styles.sectionLabel}>Current roster</Text>
      {!hasRoster ? (
        <Text style={styles.emptyText}>No roster yet — start your Dynasty draft to build your first 12 starters.</Text>
      ) : (
        <View style={styles.rosterStrip}>
          {filledSlots.map((pos) => (
            <View key={pos} style={styles.rosterSlot}>
              <Text style={styles.rosterSlotPos}>{pos}</Text>
              <Text style={styles.rosterSlotOvr}>{roster[pos]?.rating}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.hofCard} onPress={() => handleTabPress('hof')} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hofTitle}>Hall of Fame</Text>
          <Text style={styles.hofSub}>{hallOfFame.length} retired legend{hallOfFame.length === 1 ? '' : 's'} · view shelf</Text>
        </View>
        <Text style={styles.hofArrow}>›</Text>
      </TouchableOpacity>

      {hasRoster ? (
        <View style={styles.ctaRow}>
          <SecondaryButton label="Open packs" badge={ownedPacks} onPress={() => navigation.navigate('PackOpening')} style={styles.ctaSecondary} />
          <PrimaryButton label={`Start season ${currentSeason}`} onPress={handleStartSeason} style={styles.ctaPrimary} />
        </View>
      ) : (
        <PrimaryButton label="Draft Team" onPress={() => setSetupVisible(true)} style={styles.startDynastyBtn} />
      )}

      <SecondaryButton
        label="Reset Dynasty & start over"
        onPress={handleResetDynasty}
        labelColor={Colors.loss}
        style={styles.resetBtn}
      />
    </>
  );

  const rosterTab = (
    <>
      <Text style={styles.sectionLabel}>Full roster</Text>
      {DRAFT_POSITIONS.map((pos) => {
        const starter = roster[pos];
        return starter ? (
          <PlayerRow
            key={pos}
            position={pos}
            name={starter.name}
            meta={`${starter.team} · ${parseYear(starter.years)}`}
            style={styles.rosterRow}
            right={
              <View style={styles.rosterRowRight}>
                <Text style={styles.rosterRowOvr}>{starter.rating} OVR</Text>
                <TouchableOpacity onPress={() => retirePlayer(pos)} activeOpacity={0.7}>
                  <Text style={styles.retireText}>Retire</Text>
                </TouchableOpacity>
              </View>
            }
          />
        ) : (
          <PlayerRow key={pos} position={pos} name="Empty" meta="No starter drafted" style={styles.rosterRow} />
        );
      })}

      <Text style={[styles.sectionLabel, styles.benchSectionLabel]}>Bench ({bench.length}/{BENCH_CAPACITY})</Text>
      {bench.length === 0 ? (
        <Text style={styles.emptyText}>Bench is empty — pack pulls can go here instead of starting.</Text>
      ) : (
        bench
          .slice()
          .sort((a, b) => b.rating - a.rating)
          .map((player) => {
            const starter = roster[player.position];
            const delta = player.rating - (starter?.rating ?? player.rating);
            return (
              <PlayerRow
                key={player.id}
                position={player.position}
                name={player.name}
                meta={`${player.team} · ${parseYear(player.years)}`}
                style={styles.rosterRow}
                right={
                  <View style={styles.rosterRowRight}>
                    {starter && (
                      <Text style={[styles.deltaText, delta >= 0 ? styles.deltaPositive : styles.deltaNegative]}>
                        {delta >= 0 ? `+${delta}` : delta}
                      </Text>
                    )}
                    <Text style={styles.rosterRowOvr}>{player.rating} OVR</Text>
                    <TouchableOpacity onPress={() => swapStarterWithBench(player.position, player.id)} activeOpacity={0.7}>
                      <Text style={styles.swapText}>Start</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => releaseFromBench(player.id)} activeOpacity={0.7}>
                      <Text style={styles.retireText}>Release</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            );
          })
      )}
    </>
  );

  const packsTab = (
    <>
      <Text style={styles.sectionLabel}>Owned packs</Text>
      <View style={styles.packsRow}>
        <View style={styles.packsCard}>
          <Text style={styles.packsCardTitle}>Packs · {PACK_CARD_COUNT} cards each</Text>
          <Text style={styles.packsCardCount}>{ownedPacks}</Text>
        </View>
      </View>
      <PrimaryButton label="Open / buy packs" onPress={() => navigation.navigate('PackOpening')} />
    </>
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
        {__DEV__ && (
          <TouchableOpacity style={styles.devBtn} onPress={handleResetDynasty} activeOpacity={0.7}>
            <Text style={styles.devBtnText}>DEV RESET</Text>
          </TouchableOpacity>
        )}
        <View style={styles.ringsChip}>
          <Text style={styles.ringsText}>{rings} 💍</Text>
        </View>
      </BrandBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'dynasty' && dynastyTab}
        {tab === 'roster' && rosterTab}
        {tab === 'packs' && packsTab}
      </ScrollView>

      <View style={styles.tabBar}>
        {(['dynasty', 'roster', 'packs'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={styles.tabItem} onPress={() => handleTabPress(t)} activeOpacity={0.7}>
            <Text style={[styles.tabItemText, tab === t && styles.tabItemTextActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('hof')} activeOpacity={0.7}>
          <Text style={styles.tabItemText}>HOF</Text>
        </TouchableOpacity>
      </View>

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

  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14, marginBottom: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  level: { fontSize: Typography.xl, color: Colors.gold, fontFamily: Font.primaryBold, letterSpacing: 1 },
  record: { fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Font.secondaryRegular },
  progressTrack: { height: 6, backgroundColor: Colors.bgCardDeep, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: Colors.gold },
  progressCaption: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.secondaryRegular },

  sectionLabel: {
    fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Font.mono,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, marginBottom: Spacing.lg, lineHeight: 20 },

  rosterStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg },
  rosterSlot: {
    minWidth: 56, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center',
  },
  rosterSlotPos: { fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 0.5 },
  rosterSlotOvr: { fontSize: Typography.md, color: Colors.textPrimary, fontFamily: Font.secondarySemiBold, marginTop: 2 },

  hofCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCardDeep,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 12, marginBottom: Spacing.lg,
  },
  hofTitle: { color: Colors.textPrimary, fontSize: Typography.base, fontFamily: Font.secondarySemiBold },
  hofSub: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 2, fontFamily: Font.secondaryRegular },
  hofArrow: { color: Colors.textMuted, fontSize: Typography.xl },

  ctaRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  ctaSecondary: { flex: 1 },
  ctaPrimary: { flex: 1.4 },
  startDynastyBtn: { marginBottom: Spacing.md },
  resetBtn: { marginTop: Spacing.sm },

  rosterRow: { marginBottom: 6 },
  benchSectionLabel: { marginTop: Spacing.md },
  deltaText: { fontSize: Typography.xs, fontFamily: Font.secondarySemiBold },
  deltaPositive: { color: Colors.win },
  deltaNegative: { color: Colors.loss },

  rosterRowRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rosterRowOvr: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },
  retireText: { color: Colors.loss, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },
  swapText: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },

  packsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  packsCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  packsCardTitle: { color: Colors.textSecondary, fontSize: Typography.sm, fontFamily: Font.secondaryRegular },
  packsCardCount: { color: Colors.textPrimary, fontSize: Typography['2xl'], fontFamily: Font.primaryBold, marginTop: 4 },

  tabBar: {
    flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 10, paddingBottom: 6, paddingHorizontal: Spacing.lg,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabItemText: { fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 0.5, fontFamily: Font.secondarySemiBold },
  tabItemTextActive: { color: Colors.gold },
});
