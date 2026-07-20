import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { parseYear } from '../data/players';
import { PackRarity } from '../data/packs';
import { PackPullResult } from '../store/dynastyStore';
import { SHOW_DEBUG_OVR } from '../config/featureFlags';

const RARITY_LABEL: Record<PackRarity, string> = {
  common: 'COMMON', rare: 'RARE', elite: 'ELITE', legend: 'LEGEND',
};
// Exported for CardStack.tsx, which tints its decorative "shuffled behind"
// ghost cards with the same rarity colors as the real upcoming cards.
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
}

// The card revealed when opening a Dynasty pack — reused for every card in
// CardStack.tsx's shuffled-deck reveal (data/packs.ts pulls PACK_CARD_COUNT
// of these per pack). Selecting a non-duplicate card shrinks it slightly
// and swaps its border to green with a checkmark overlay, confirmed with
// the user as the "keep this card" signal. name/team/year are the prominent
// identity, with a placeholder shield icon standing in for a player photo
// (no photo assets exist yet). OVR display (docs/handoff/09-ovr-visibility-
// reversal.md) reverses the earlier "no OVR on this card" decision — gold,
// inline after the name, behind SHOW_DEBUG_OVR like every other player row.
export function PackPlayerCard({ card, selected = false, onPress, width = DEFAULT_WIDTH }: PackPlayerCardProps) {
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
      <View style={[styles.card, styles.cardDuplicate, { width, height, borderColor: rarityColor }]}>
        <Text style={[styles.rarity, { color: rarityColor }]}>{RARITY_LABEL[card.rarity]} · DUPLICATE</Text>
        <Text style={styles.duplicateSub}>Converted to +{card.ringsRefund} 💍</Text>
      </View>
    );
  }

  const { player } = card;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={!onPress}>
      <Animated.View
        style={[
          styles.card,
          { width, height, borderColor: selected ? Colors.win : rarityColor, transform: [{ scale }] },
        ]}
      >
        {selected && (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check-circle" size={28} color={Colors.win} />
          </View>
        )}

        <View style={styles.imagePlaceholder}>
          <MaterialCommunityIcons name="shield-star" size={width * 0.4} color={rarityColor} />
        </View>

        <Text style={[styles.rarity, { color: rarityColor }]}>{RARITY_LABEL[card.rarity]}</Text>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
          {SHOW_DEBUG_OVR && <Text style={styles.debugOvr}>{player.rating}</Text>}
        </View>
        <Text style={styles.meta}>{player.team} · {parseYear(player.years)}</Text>
        <View style={styles.positionBadge}>
          <Text style={styles.positionBadgeText}>{player.position}</Text>
        </View>
        <Text style={styles.stats} numberOfLines={3}>{player.stats}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg, borderWidth: 2, padding: 18,
    paddingTop: 20, alignItems: 'center', backgroundColor: Colors.bgCardDeep,
  },
  cardDuplicate: { justifyContent: 'center' },

  imagePlaceholder: {
    width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },

  checkBadge: {
    position: 'absolute', top: -12, left: -12, backgroundColor: Colors.bgPrimary, borderRadius: Radius.full,
  },

  rarity: { fontSize: Typography.base, fontFamily: Font.secondaryBold, letterSpacing: 1.5, marginBottom: 8, textAlign: 'center' },
  nameLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%' },
  name: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: Typography['2xl'], textAlign: 'center', flexShrink: 1 },
  debugOvr: { color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography['3xl'] },
  meta: { color: Colors.textSecondary, fontSize: Typography.lg, marginTop: 4, textAlign: 'center', fontFamily: Font.secondaryMedium },
  positionBadge: {
    marginTop: 10, backgroundColor: Colors.bgCard, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  positionBadgeText: { color: Colors.textSecondary, fontSize: Typography.sm, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
  stats: { color: Colors.textSecondary, fontSize: Typography.base, marginTop: 14, textAlign: 'center', fontFamily: Font.secondaryRegular, lineHeight: 20 },
  duplicateSub: { color: Colors.textMuted, fontSize: Typography.base, marginTop: 6, textAlign: 'center', fontFamily: Font.secondaryRegular },
});
