import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { DRAFT_POSITIONS } from '../data/players';
import { getPerkById } from '../data/perks';
import { useDynastyStore } from '../store/dynastyStore';
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
  const hallOfFame = useDynastyStore((s) => s.hallOfFame);
  const ownedPacks = useDynastyStore((s) => s.ownedPacks);
  const activePerks = useDynastyStore((s) => s.activePerks);
  const retirePlayer = useDynastyStore((s) => s.retirePlayer);
  const startNextSeason = useDynastyStore((s) => s.startNextSeason);
  const earnRings = useDynastyStore((s) => s.earnRings);

  // Dev-only playtesting affordance: real Rings income is currently just
  // Daily Challenge completion (15/day), far below pack costs (100/60) —
  // this exists to unblock testing the pack/roster/HOF loop without
  // grinding Daily for a week. __DEV__ strips it from release builds.
  const DEV_RINGS_GRANT = 500;
  function handleDevGrantRings() {
    earnRings(DEV_RINGS_GRANT, 'dev_grant');
  }

  const filledSlots = DRAFT_POSITIONS.filter((pos) => roster[pos]);
  const progressPct = xpToNextLevel > 0 ? Math.min(1, dynastyXP / xpToNextLevel) : 0;
  const playerPackCount = ownedPacks.filter((p) => p.type === 'player').length;
  const perkPackCount = ownedPacks.filter((p) => p.type === 'perk').length;

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

      {activePerks.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Active perks this season</Text>
          <View style={styles.perkRow}>
            {activePerks.map((perkId) => (
              <View key={perkId} style={styles.perkChip}>
                <Text style={styles.perkChipText}>{getPerkById(perkId)?.name ?? perkId}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>Current roster</Text>
      {filledSlots.length === 0 ? (
        <Text style={styles.emptyText}>No players yet — open a player pack to start building your dynasty roster.</Text>
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

      <View style={styles.ctaRow}>
        <TouchableOpacity style={styles.ctaSecondary} onPress={() => navigation.navigate('PackOpening')} activeOpacity={0.85}>
          <Text style={styles.ctaSecondaryText}>Open packs</Text>
          {ownedPacks.length > 0 && (
            <View style={styles.packCount}><Text style={styles.packCountText}>{ownedPacks.length}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaPrimary} onPress={startNextSeason} activeOpacity={0.85}>
          <Text style={styles.ctaPrimaryText}>Start season {currentSeason + 1}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const rosterTab = (
    <>
      <Text style={styles.sectionLabel}>Full roster</Text>
      {DRAFT_POSITIONS.map((pos) => {
        const player = roster[pos];
        return (
          <View key={pos} style={styles.rosterRow}>
            <View style={styles.rosterRowLeft}>
              <Text style={styles.rosterRowPos}>{pos}</Text>
              <Text style={styles.rosterRowName}>{player ? player.name : 'Empty'}</Text>
            </View>
            {player && (
              <View style={styles.rosterRowRight}>
                <Text style={styles.rosterRowOvr}>{player.rating} OVR</Text>
                <TouchableOpacity onPress={() => retirePlayer(pos)} activeOpacity={0.7}>
                  <Text style={styles.retireText}>Retire</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </>
  );

  const packsTab = (
    <>
      <Text style={styles.sectionLabel}>Owned packs</Text>
      <View style={styles.packsRow}>
        <View style={styles.packsCard}>
          <Text style={styles.packsCardTitle}>Player packs</Text>
          <Text style={styles.packsCardCount}>{playerPackCount}</Text>
        </View>
        <View style={styles.packsCard}>
          <Text style={styles.packsCardTitle}>Perk packs</Text>
          <Text style={styles.packsCardCount}>{perkPackCount}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.ctaPrimary} onPress={() => navigation.navigate('PackOpening')} activeOpacity={0.85}>
        <Text style={styles.ctaPrimaryText}>Open / buy packs</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>DYNASTY</Text>
        {__DEV__ && (
          <TouchableOpacity style={styles.devBtn} onPress={handleDevGrantRings} activeOpacity={0.7}>
            <Text style={styles.devBtnText}>DEV +{DEV_RINGS_GRANT}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.ringsChip}>
          <Text style={styles.ringsText}>{rings} 💍</Text>
        </View>
      </View>

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

  perkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg },
  perkChip: { backgroundColor: Colors.gridironBlue, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  perkChipText: { color: Colors.textPrimary, fontSize: Typography.xs, fontFamily: Font.secondarySemiBold },

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
  ctaSecondary: {
    flex: 1, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  ctaSecondaryText: { color: Colors.gold, fontFamily: Font.secondarySemiBold, fontSize: Typography.base },
  packCount: {
    position: 'absolute', top: -6, right: -6, backgroundColor: Colors.gold, borderRadius: Radius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  packCountText: { color: Colors.bgDark, fontSize: Typography.xs, fontFamily: Font.secondaryBold },
  ctaPrimary: { flex: 1.4, backgroundColor: Colors.gold, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  ctaPrimaryText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.base, letterSpacing: 0.5 },

  rosterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 10, marginBottom: 6,
  },
  rosterRowLeft: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  rosterRowPos: { color: Colors.textDim, fontSize: Typography.xs, minWidth: 36, fontFamily: Font.secondarySemiBold },
  rosterRowName: { color: Colors.textPrimary, fontSize: Typography.base, fontFamily: Font.secondaryMedium },
  rosterRowRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rosterRowOvr: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },
  retireText: { color: Colors.loss, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },

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
