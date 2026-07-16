import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { PackRarity } from '../data/packs';
import { PackPullResult } from '../store/dynastyStore';

const RARITY_LABEL: Record<PackRarity, string> = {
  common: 'COMMON', rare: 'RARE', elite: 'ELITE', legend: 'LEGEND',
};
const RARITY_COLOR: Record<PackRarity, string> = {
  common: Colors.rarityCommon, rare: Colors.rarityRare, elite: Colors.rarityElite, legend: Colors.rarityLegend,
};

interface PackPlayerCardProps {
  card: PackPullResult;
  // Ignored for duplicate cards — they auto-resolve to a Rings refund and
  // are never selectable.
  selected?: boolean;
  onPress?: () => void;
}

// The card revealed when opening a Dynasty pack — reused for every card in
// the pack-opening grid (data/packs.ts pulls PACK_CARD_COUNT of these per
// pack). Selecting a non-duplicate card shrinks it slightly and swaps its
// border to green with a checkmark overlay, confirmed with the user as the
// "keep this card" signal.
export function PackPlayerCard({ card, selected = false, onPress }: PackPlayerCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

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
      <View style={[styles.card, styles.cardDuplicate, { borderColor: rarityColor }]}>
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
          { borderColor: selected ? Colors.win : rarityColor, transform: [{ scale }] },
        ]}
      >
        <View style={styles.ovrBadge}>
          <Text style={styles.ovrBadgeText}>{player.rating}</Text>
        </View>

        {selected && (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check-circle" size={22} color={Colors.win} />
          </View>
        )}

        <Text style={[styles.rarity, { color: rarityColor }]}>{RARITY_LABEL[card.rarity]}</Text>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.meta}>{player.team} · {player.position}</Text>
        <Text style={styles.stats} numberOfLines={2}>{player.stats}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160, minHeight: 190, borderRadius: Radius.lg, borderWidth: 2, padding: 14,
    paddingTop: 18, alignItems: 'center', backgroundColor: Colors.bgCardDeep,
  },
  cardDuplicate: { minHeight: undefined, justifyContent: 'center', opacity: 0.75 },

  ovrBadge: {
    position: 'absolute', top: -10, right: -10, minWidth: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  ovrBadgeText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.sm },

  checkBadge: {
    position: 'absolute', top: -10, left: -10, backgroundColor: Colors.bgPrimary, borderRadius: Radius.full,
  },

  rarity: { fontSize: Typography.xs, fontFamily: Font.secondaryBold, letterSpacing: 1, marginBottom: 6, textAlign: 'center' },
  name: { color: Colors.textPrimary, fontFamily: Font.primarySemiBold, fontSize: Typography.base, textAlign: 'center' },
  meta: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 3, textAlign: 'center', fontFamily: Font.secondaryRegular },
  stats: { color: Colors.textSecondary, fontSize: Typography.xs, marginTop: 8, textAlign: 'center', fontFamily: Font.secondaryRegular, lineHeight: 15 },
  duplicateSub: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 4, textAlign: 'center', fontFamily: Font.secondaryRegular },
});
