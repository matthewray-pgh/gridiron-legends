import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { PACK_CARD_COUNT, PACK_TIERS } from '../data/packs';
import { PackPlacement, PackPullResult, PackResolution, useDynastyStore } from '../store/dynastyStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { BrandBackground } from '../components/BrandBackground';
import { PackPullGrid } from '../components/PackPullGrid';
import { PackRevealSequence } from '../components/PackRevealSequence';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PackOpening'>;

// A pack opens PACK_CARD_COUNT cards at once (perk packs are retired for
// now). Two stages once tapped: PackRevealSequence.tsx plays the tap→rip→
// flip-through-one-at-a-time animation (docs/handoff/gridiron-legends-pack-
// animation.html) purely for show — openPack() already committed the real
// pull the instant the pack was tapped, so nothing about the outcome is
// decided during this stage, just revealed. Once the last card's flipped,
// `pulls` gets set and the screen drops into a grid of every pulled card
// (docs/handoff/17-pack-reveal-grid-layout.md — replaces the old carousel-
// on-top/roster-list-underneath layout; the roster reference list was
// removed since every kept card is auto-placed with no manual start/bench
// choice for the player to reference it against). Tapping a card toggles
// "keep it" (green border + check overlay); there's no separate Start/
// Bench choice — each kept card is auto-placed (starts if its slot is
// open, otherwise benches, same full-bench-auto-release behavior as
// before) once "Add Selected" is pressed. That button only enables once at
// least one card is checked; a separate low-emphasis "Skip" action lets the
// player decline every pull instead (doc 17 section 3 — previously the
// only way off this screen once `pulls` was set).
export function PackOpeningScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const packId = route.params.packId;

  const rings = useDynastyStore((s) => s.rings);
  const pack = useDynastyStore((s) => s.ownedPacks.find((p) => p.id === packId));
  const currentSeason = useDynastyStore((s) => s.currentSeason);
  const roster = useDynastyStore((s) => s.roster);
  const openPack = useDynastyStore((s) => s.openPack);
  const resolvePackPulls = useDynastyStore((s) => s.resolvePackPulls);

  const tier = pack ? PACK_TIERS.find((t) => t.id === pack.tierId) : undefined;
  // Pinned once on mount so the title stays put through the reveal — openPack()
  // removes the pack from ownedPacks the moment it's opened, which would
  // otherwise flip `tier` back to undefined and the toolbar title to "PACK"
  // mid-reveal.
  const [titleTier] = useState(tier);
  const [titleSubtitle] = useState(() => (pack ? `${PACK_CARD_COUNT} cards${pack.eraLock ? ` · ${pack.eraLock}` : ''}` : ''));

  // `pack` is a live store subscription, and openPack() removes it from
  // ownedPacks the instant it's called — same disappearing-mid-reveal
  // problem `titleTier` above already works around, but this one can't be
  // solved by pinning a value: the render branch itself is gated on
  // `pack && tier`, so without this flag the screen would flip to "no
  // longer available" the moment the pack's tapped, unmounting
  // PackRevealSequence mid-animation. Once true, it keeps that branch
  // rendered until the sequence's own onDone (handleRevealDone) hands off
  // to the pulls-driven summary screen.
  const [revealStarted, setRevealStarted] = useState(false);

  const [pulls, setPulls] = useState<PackPullResult[] | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalRingsRefund = (pulls ?? []).reduce((sum, card) => sum + (card.duplicate ? card.ringsRefund : 0), 0);

  // Packs are a post-draft reward — the initial draft (DynastyHomeScreen's
  // "Draft Team") has to be completed first. currentSeason only increments
  // once the initial draft (or a season) completes and never resets except
  // via a full Dynasty reset, so `> 1` is a reliable "drafted at least
  // once" signal — unlike checking roster non-emptiness, which would
  // wrongly re-lock this if every player is later retired/released. The
  // toolbar shortcut into this screen is already hidden pre-draft
  // (DynastyHomeScreen.tsx), but this is the actual gate: guards buy/open
  // directly too, in case this screen is ever reached another way.
  const hasCompletedInitialDraft = currentSeason > 1;

  // True once the draft gate is cleared but the pack itself can't be
  // opened — packId doesn't resolve to an owned pack (already opened, bad
  // deep link, etc.) and no reveal is in flight. There's nothing actionable
  // for the player to do here, so redirect straight to Shop instead of
  // making them tap a "Back to Shop" button.
  const packUnavailable = hasCompletedInitialDraft && !((pack && tier) || revealStarted);

  useEffect(() => {
    if (packUnavailable) navigation.replace('Shop');
  }, [packUnavailable, navigation]);

  // Called by PackRevealSequence the instant the pack is tapped — this is
  // the real, order-committing pull (openPack() consumes the pack and rolls
  // the cards). The sequence just animates through the already-decided
  // result; `pulls` (and the summary/selection screen it triggers) isn't
  // set until every card's been flipped, via handleRevealDone below.
  function handleRevealOpen() {
    if (!hasCompletedInitialDraft || !pack) return null;
    const result = openPack(packId);
    if (result) setRevealStarted(true);
    return result;
  }

  function handleRevealDone(result: PackPullResult[]) {
    setPulls(result);
    setChecked({});
  }

  function toggleChecked(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function closeReveal() {
    setPulls(null);
    setChecked({});
    // Without this, closing would fall back to (pack && tier) || revealStarted
    // still being true and re-mount PackRevealSequence in its idle "tap to
    // open" state for an already-consumed pack — resetting it lets
    // `packUnavailable` correctly go true instead, which redirects to Shop.
    setRevealStarted(false);
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
        <Text style={styles.toolbarTitle}>{titleTier ? titleTier.label.toUpperCase() : 'PACK'}</Text>
        <View style={styles.ringsChip}>
          <Text style={styles.ringsText}>{rings} 💍</Text>
        </View>
      </BrandBackground>

      {!pulls ? (
        <View style={styles.stage}>
          {!hasCompletedInitialDraft ? (
            <>
              <Text style={styles.emptyText}>Draft your team before opening packs — packs build out your bench, not your starting roster.</Text>
              <PrimaryButton label="Back to Dynasty" onPress={() => navigation.goBack()} />
            </>
          ) : (pack && tier) || revealStarted ? (
            <PackRevealSequence
              onOpen={handleRevealOpen}
              onDone={handleRevealDone}
              cardCount={PACK_CARD_COUNT}
              subtitle={titleSubtitle}
            />
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.gridStage}>
            <PackPullGrid pulls={pulls} checked={checked} onToggle={toggleChecked} />
          </View>

          <View style={styles.actionBar}>
            {totalRingsRefund > 0 && (
              <Text style={styles.refundHint}>+{totalRingsRefund} 💍 from duplicates</Text>
            )}
            <TouchableOpacity onPress={closeReveal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.skipAllText}>Skip — nothing will be added to your roster</Text>
            </TouchableOpacity>
            <PrimaryButton
              label={`Add Selected (${checkedCount}) to Roster`}
              onPress={handleAddSelected}
              disabled={checkedCount === 0}
            />
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
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, textAlign: 'center' },

  // Roster reference block removed (docs/handoff/17-pack-reveal-grid-
  // layout.md section 2) — the grid now occupies the screen on its own.
  gridStage: { flex: 1, justifyContent: 'center' },

  actionBar: { padding: 14, gap: 10 },
  refundHint: { color: Colors.gold, fontSize: Typography.sm, textAlign: 'center', fontFamily: Font.secondarySemiBold },
  skipAllText: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.secondaryMedium, textAlign: 'center' },
});
