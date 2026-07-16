import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { PACK_CARD_COUNT } from '../data/packs';
import { DRAFT_POSITIONS, parseYear } from '../data/players';
import { BENCH_CAPACITY, PackPlacement, PackPullResult, PackResolution, TODO_BALANCE_PACK_COST_RINGS, useDynastyStore } from '../store/dynastyStore';
import { PackPlayerCard } from '../components/PackPlayerCard';
import { PlayerRow } from '../components/PlayerRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { BrandBackground } from '../components/BrandBackground';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// A pack opens PACK_CARD_COUNT cards at once (perk packs are retired for
// now). Confirmed with the user: cards are laid out top-half/bottom-half —
// the pulled cards up top, the current roster (starters + bench) scrollable
// underneath as reference while deciding — rather than a sequential
// reveal-then-decide chain per card. Tapping a card just toggles "keep it"
// (green border + check overlay); there's no separate Start/Bench choice —
// each kept card is auto-placed (starts if its slot is open, otherwise
// benches, same full-bench-auto-release behavior as before) once "Add
// Selected to Roster" is pressed. That button only enables once at least
// one card is checked, so it can't be pressed with nothing selected and
// silently do nothing.
export function PackOpeningScreen() {
  const navigation = useNavigation<Nav>();
  const rings = useDynastyStore((s) => s.rings);
  const ownedPacks = useDynastyStore((s) => s.ownedPacks);
  const roster = useDynastyStore((s) => s.roster);
  const bench = useDynastyStore((s) => s.bench);
  const buyPack = useDynastyStore((s) => s.buyPack);
  const openPack = useDynastyStore((s) => s.openPack);
  const resolvePackPulls = useDynastyStore((s) => s.resolvePackPulls);

  const [pulls, setPulls] = useState<PackPullResult[] | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalRingsRefund = (pulls ?? []).reduce((sum, card) => sum + (card.duplicate ? card.ringsRefund : 0), 0);

  function handleOpen() {
    const result = openPack();
    if (!result) return;
    setPulls(result);
    setChecked({});
  }

  function handleBuy() {
    buyPack();
  }

  function toggleChecked(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function closeReveal() {
    setPulls(null);
    setChecked({});
  }

  function handleAddSelected() {
    if (!pulls || checkedCount === 0) return;

    const resolutions: PackResolution[] = pulls
      .map((card, i) => ({ card, i }))
      .filter(({ card, i }) => !card.duplicate && checked[i])
      .map(({ card }) => {
        const player = (card as Extract<PackPullResult, { duplicate: false }>).player;
        const placement: PackPlacement = roster[player.position] ? 'bench' : 'start';
        return { player, placement };
      });

    resolvePackPulls(resolutions);
    closeReveal();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <BrandBackground variant="header" style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>OPEN PACKS</Text>
        <View style={styles.ringsChip}>
          <Text style={styles.ringsText}>{rings} 💍</Text>
        </View>
      </BrandBackground>

      {!pulls ? (
        <View style={styles.stage}>
          {ownedPacks > 0 ? (
            <>
              <TouchableOpacity style={styles.packVisual} onPress={handleOpen} activeOpacity={0.9}>
                <Text style={styles.packVisualText}>TAP TO{'\n'}OPEN</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>{ownedPacks} pack{ownedPacks === 1 ? '' : 's'} available · {PACK_CARD_COUNT} cards each</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>No packs owned.</Text>
              <PrimaryButton
                label={`Buy for ${TODO_BALANCE_PACK_COST_RINGS} 💍`}
                onPress={handleBuy}
                disabled={rings < TODO_BALANCE_PACK_COST_RINGS}
              />
            </>
          )}
        </View>
      ) : (
        <>
          <View style={styles.topHalf}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}
            >
              {pulls.map((card, i) => (
                <PackPlayerCard
                  key={i}
                  card={card}
                  selected={!!checked[i]}
                  onPress={card.duplicate ? undefined : () => toggleChecked(i)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.bottomHalf}>
            <Text style={styles.sectionLabel}>Current roster</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rosterRefList}>
              {DRAFT_POSITIONS.map((pos) => {
                const starter = roster[pos];
                return starter ? (
                  <PlayerRow
                    key={pos}
                    position={pos}
                    name={starter.name}
                    meta={`${starter.team} · ${parseYear(starter.years)}`}
                    style={styles.rosterRefRow}
                    right={<Text style={styles.rosterRefOvr}>{starter.rating} OVR</Text>}
                  />
                ) : (
                  <PlayerRow key={pos} position={pos} name="Empty" meta="No starter drafted" style={styles.rosterRefRow} />
                );
              })}

              <Text style={[styles.sectionLabel, styles.benchRefLabel]}>Bench ({bench.length}/{BENCH_CAPACITY})</Text>
              {bench.length === 0 ? (
                <Text style={styles.emptyText}>Bench is empty.</Text>
              ) : (
                bench.map((player) => (
                  <PlayerRow
                    key={player.id}
                    position={player.position}
                    name={player.name}
                    meta={`${player.team} · ${parseYear(player.years)}`}
                    style={styles.rosterRefRow}
                    right={<Text style={styles.rosterRefOvr}>{player.rating} OVR</Text>}
                  />
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.actionsRow}>
            {totalRingsRefund > 0 && (
              <Text style={styles.refundHint}>+{totalRingsRefund} 💍 from duplicates</Text>
            )}
            <View style={styles.actionsButtonRow}>
              <SecondaryButton label="Close" onPress={closeReveal} style={styles.ghostBtn} />
              <PrimaryButton
                label="Add Selected to Roster"
                onPress={handleAddSelected}
                disabled={checkedCount === 0}
                style={styles.primaryBtn}
              />
            </View>
            {checkedCount === 0 && (
              <Text style={styles.disabledHint}>Select at least one card</Text>
            )}
          </View>
        </>
      )}
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
  ringsChip: {
    borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ringsText: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: Spacing.lg },
  packVisual: {
    width: 150, height: 190, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B140A',
  },
  packVisualText: {
    color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography.lg,
    letterSpacing: 1, textAlign: 'center',
  },
  hint: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.secondaryRegular },
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, textAlign: 'center' },

  topHalf: { flex: 1, justifyContent: 'center', paddingTop: Spacing.md },
  cardRow: { flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.lg },

  bottomHalf: {
    flex: 1, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Font.mono,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  benchRefLabel: { marginTop: Spacing.md },
  rosterRefList: { paddingBottom: Spacing.md },
  rosterRefRow: { marginBottom: 6 },
  rosterRefOvr: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },

  actionsRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm, gap: 6 },
  actionsButtonRow: { flexDirection: 'row', gap: 10 },
  refundHint: { color: Colors.gold, fontSize: Typography.sm, textAlign: 'center', fontFamily: Font.secondarySemiBold },
  disabledHint: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', fontFamily: Font.secondaryRegular },
  ghostBtn: { flex: 1 },
  primaryBtn: { flex: 2 },
});
