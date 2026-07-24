import React, { useEffect, useRef } from 'react';
import { Animated, ImageBackground, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { NO_SEASON_STATS, parseYear } from '../data/players';
import { PackRarity } from '../data/packs';
import { PackPullResult } from '../store/dynastyStore';
import { cardArtFor } from '../data/cardArt';
import { SHOW_DEBUG_OVR } from '../config/featureFlags';

const RARITY_LABEL: Record<PackRarity, string> = {
  common: 'COMMON', rare: 'RARE', elite: 'ELITE', legend: 'LEGEND',
};
// Exported for the rarity-tinted UI elsewhere that mirrors this card's
// rarity colors (PackOddsSheet's odds bars, ShopScreen's tier accents).
export const RARITY_COLOR: Record<PackRarity, string> = {
  common: Colors.rarityCommon, rare: Colors.rarityRare, elite: Colors.rarityElite, legend: Colors.rarityLegend,
};

const DEFAULT_WIDTH = 220;
const HEIGHT_RATIO = 1.45;

interface PackPlayerCardProps {
  card: PackPullResult;
  // Ignored for duplicate cards — they auto-resolve to a Rings refund and
  // are never selectable.
  selected?: boolean;
  onPress?: () => void;
  // Card width in px — height is derived from it (HEIGHT_RATIO) so callers
  // just pick one number. Defaults to DEFAULT_WIDTH for any caller that
  // doesn't size it explicitly.
  width?: number;
  // Grid-cell sizing (docs/handoff/17-pack-reveal-grid-layout.md) — drops
  // the stat-chip row and the meta line's year, since there isn't room for
  // either at grid-cell width without becoming illegible. Everything else
  // about the card face is identical to the full-size reveal card.
  compact?: boolean;
}

// Player stats rendered as a row of compact value/label chips rather than
// one run-on line (docs/handoff/16-pack-card-photo-background-redesign.md
// section 2 — the first-pass single-line treatment was too small/low-
// contrast to read over a photo). `player.stats` is already priority-
// ordered by formatStats() (data/players.ts) per position, joined with
// ' • ' — split back on that same separator rather than re-deriving order.
function StatRow({ stats }: { stats: string }) {
  if (stats === NO_SEASON_STATS) return null;
  const parts = stats.split(' • ').slice(0, 3);
  return (
    <View style={styles.statRow}>
      {parts.map((part, i) => {
        const [value, ...labelWords] = part.split(' ');
        return (
          <View key={i} style={styles.statChip}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{labelWords.join(' ')}</Text>
          </View>
        );
      })}
    </View>
  );
}

// The card revealed when opening a Dynasty pack — reused for every card in
// PackPullGrid.tsx's post-reveal grid (data/packs.ts pulls PACK_CARD_COUNT
// of these per pack) at a smaller `width` via the `compact` prop, and at
// full size while PackRevealSequence.tsx flips through pulls one at a time.
// Selecting a non-duplicate card shrinks it slightly and swaps its border
// to green with a checkmark overlay, confirmed with the user as the "keep
// this card" signal.
//
// Full-bleed photo background (docs/handoff/16-pack-card-photo-background-
// redesign.md) replaces the old centered-column/shield-placeholder layout —
// mirrors BrandBackground.tsx's ImageBackground+LinearGradient-scrim
// pattern (including its react-native-web image-sizing fix) rather than
// importing BrandBackground directly, since its variant shape (single
// full-fill overlay, one children slot) doesn't fit this card's two
// separate content regions (top-corner chips directly on the photo, a
// bottom-anchored scrim carrying name/meta/stats) — flagged back to the
// user per that doc's instruction to call out which of the two reuse paths
// was taken.
export function PackPlayerCard({ card, selected = false, onPress, width = DEFAULT_WIDTH, compact = false }: PackPlayerCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const height = width * HEIGHT_RATIO;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 0.92 : 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [selected, scale]);

  const rarityColor = RARITY_COLOR[card.rarity];

  if (card.duplicate) {
    return (
      <View style={[styles.card, styles.cardDuplicate, { width, height, borderColor: rarityColor }, compact && styles.duplicateDimmed]}>
        <Text style={[styles.rarity, { color: rarityColor }]}>{RARITY_LABEL[card.rarity]} · DUPLICATE</Text>
        <Text style={styles.duplicateSub}>Converted to +{card.ringsRefund} 💍</Text>
      </View>
    );
  }

  const { player } = card;
  const cardImage = cardArtFor(player.id);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={!onPress}>
      <Animated.View
        style={[
          styles.card,
          { width, height, borderColor: selected ? Colors.win : rarityColor, transform: [{ scale }] },
        ]}
      >
        <ImageBackground source={cardImage} style={{ width, height }} imageStyle={styles.cardImage}>
          {selected && (
            <View style={styles.checkBadge}>
              <MaterialCommunityIcons name="check-circle" size={22} color={Colors.win} />
            </View>
          )}

          <View style={styles.topRow}>
            <View style={[styles.rarityPill, { borderColor: rarityColor }]}>
              <Text style={[styles.rarityPillText, { color: rarityColor }]}>{RARITY_LABEL[card.rarity]}</Text>
            </View>
            {SHOW_DEBUG_OVR && (
              <View style={[styles.ovrChip, { borderColor: rarityColor }]}>
                <Text style={[styles.ovrChipText, { color: rarityColor }]}>{player.rating}</Text>
              </View>
            )}
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(6,5,3,0.80)', 'rgba(6,5,3,0.97)']}
            locations={[0, 0.4, 1]}
            style={styles.scrim}
          >
            <View style={styles.positionBadge}>
              <Text style={styles.positionBadgeText}>{player.position}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
            <Text style={styles.meta}>{compact ? player.team : `${player.team} · ${parseYear(player.years)}`}</Text>

            {!compact && <StatRow stats={player.stats} />}
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg, borderWidth: 2, overflow: 'hidden', backgroundColor: Colors.bgCardDeep,
  },
  cardDuplicate: { justifyContent: 'center', alignItems: 'center', padding: 18, paddingTop: 20 },

  // Same react-native-web sizing fix as BrandBackground.tsx's `image` style
  // — resizeMode alone doesn't stretch the source to fill its container on
  // web without explicit 100%/100% dimensions.
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover', borderRadius: Radius.lg },

  // Right-aligned (not space-between) so the rarity pill/OVR chip never sit
  // in the same top-left corner as checkBadge below — doc 17 calls for
  // "rarity pill top-right, checkmark top-left" explicitly; space-between
  // would collapse both to top-left when OVR's debug chip is hidden (the
  // common case), since a single flex child in a space-between row sits at
  // the start.
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: 10 },
  rarityPill: {
    backgroundColor: 'rgba(11,9,6,0.72)', borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  rarityPillText: { fontFamily: Font.secondaryBold, fontSize: Typography.xs, letterSpacing: 1 },
  ovrChip: {
    backgroundColor: 'rgba(11,9,6,0.72)', borderWidth: 1, borderRadius: Radius.full,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  ovrChipText: { fontFamily: Font.primaryBold, fontSize: Typography.sm },

  checkBadge: {
    position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(11,9,6,0.72)',
    borderRadius: Radius.full, padding: 2, zIndex: 2,
  },

  rarity: { fontSize: Typography.base, fontFamily: Font.secondaryBold, letterSpacing: 1.5, marginBottom: 8, textAlign: 'center' },

  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingTop: 44 },
  name: { color: '#fff', fontFamily: Font.primaryBold, fontSize: Typography.xl },
  meta: { color: '#d8cdb8', fontSize: Typography.sm, marginTop: 1, fontFamily: Font.secondaryMedium },

  positionBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.bgCard, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6,
  },
  positionBadgeText: { color: Colors.textSecondary, fontSize: Typography.sm, fontFamily: Font.primaryBold, letterSpacing: 0.5 },

  statRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  statChip: { alignItems: 'flex-start' },
  statValue: { color: '#fff', fontFamily: Font.primaryBold, fontSize: Typography.lg, lineHeight: 20 },
  // Warm light stone, not the app's standard Colors.textMuted steel-gray —
  // that reads too low-contrast against this warm dark-photo scrim.
  statLabel: { color: '#c9bfa8', fontSize: Typography.xs, fontFamily: Font.mono, letterSpacing: 0.3, marginTop: 1 },

  duplicateSub: { color: Colors.textMuted, fontSize: Typography.base, marginTop: 6, textAlign: 'center', fontFamily: Font.secondaryRegular },
  // Grid-only (docs/handoff/17-pack-reveal-grid-layout.md) — duplicates
  // already show DUPLICATE + the Rings refund via the styles above; at
  // grid size that's dimmed further so it visually recedes next to the
  // keepable cards it's grouped with.
  duplicateDimmed: { opacity: 0.75 },
});
