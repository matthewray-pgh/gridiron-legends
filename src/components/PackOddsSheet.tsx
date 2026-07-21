import React, { ReactNode } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { PACK_CARD_COUNT, PACK_RARITIES, PackRarity, PackTier } from '../data/packs';
import { RARITY_COLOR } from './PackPlayerCard';

export function oddsPercents(weights: Record<PackRarity, number>): Record<PackRarity, number> {
  const total = PACK_RARITIES.reduce((sum, r) => sum + weights[r], 0);
  const result = {} as Record<PackRarity, number>;
  PACK_RARITIES.forEach((r) => { result[r] = Math.round((weights[r] / total) * 100); });
  return result;
}

export function guaranteeBoxText(tier: PackTier): string {
  if (!tier.guaranteedMinRarity) {
    return 'No guarantee on this pack — every card rolls independently at the odds above.';
  }
  return `${tier.description}. If all ${PACK_CARD_COUNT} cards roll below that, the lowest-rarity card is upgraded automatically.`;
}

interface PackOddsSheetProps {
  visible: boolean;
  tier: PackTier | null;
  accentColor: string;
  isWide: boolean;
  onClose: () => void;
  subtitle?: string;
  priceLine?: string;
  note?: ReactNode;
  footer: ReactNode;
}

// Odds-disclosure ("View Odds") sheet — originally Shop-only, now shared
// with the season-end ad-upgrade choice too (docs/handoff/13-ad-
// monetization-economy.md acceptance criteria: that upgrade is a
// chance-based reward — pack tier decides the odds — so it gets the same
// disclosure before the ad plays, not just at purchase time). Same odds
// table/guarantee box either way; each caller supplies its own footer (Buy
// vs. Accept/Watch-ad) and optional price/era-lock note.
export function PackOddsSheet({ visible, tier, accentColor, isWide, onClose, subtitle, priceLine, note, footer }: PackOddsSheetProps) {
  return (
    <Modal visible={visible && tier !== null} transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, isWide && styles.overlayWide]} onPress={onClose}>
        <Pressable style={[styles.sheet, isWide && styles.sheetWide]} onPress={(e) => e.stopPropagation()}>
          {tier && (
            <>
              {!isWide && <View style={styles.handle} />}
              <Text style={[styles.title, { color: accentColor }]}>{tier.label.toUpperCase()} ODDS</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              {priceLine && <Text style={styles.priceLine}>{priceLine}</Text>}

              <View style={styles.oddsTable}>
                {PACK_RARITIES.map((rarity) => {
                  const pct = oddsPercents(tier.weights)[rarity];
                  return (
                    <View key={rarity} style={styles.oddsRow}>
                      <View style={[styles.oddsDot, { backgroundColor: RARITY_COLOR[rarity] }]} />
                      <Text style={styles.oddsRowLabel}>{rarity[0].toUpperCase() + rarity.slice(1)}</Text>
                      <View style={styles.oddsRowBarWrap}>
                        <View style={[styles.oddsRowBarFill, { width: `${pct}%`, backgroundColor: RARITY_COLOR[rarity] }]} />
                      </View>
                      <Text style={styles.oddsRowPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.guaranteeBox}>
                <Text style={styles.guaranteeBoxTitle}>Guarantee</Text>
                <Text style={styles.guaranteeBoxText}>{guaranteeBoxText(tier)}</Text>
              </View>

              {note}
              {footer}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000A8', justifyContent: 'flex-end' },
  overlayWide: { justifyContent: 'center', alignItems: 'center' },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 24, borderTopWidth: 1.5, borderTopColor: Colors.rarityLegend,
  },
  sheetWide: {
    maxWidth: 420, width: '100%', alignSelf: 'center',
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.rarityLegend,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontFamily: Font.primaryBold, fontSize: Typography.xl, letterSpacing: 0.5, textAlign: 'center' },
  subtitle: { textAlign: 'center', fontFamily: Font.mono, color: Colors.gold, fontSize: Typography.sm, marginTop: 4 },
  priceLine: { textAlign: 'center', fontFamily: Font.mono, color: Colors.textSecondary, fontSize: Typography.sm, marginTop: 2, marginBottom: 18 },

  oddsTable: { gap: 10, marginBottom: 16 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  oddsDot: { width: 10, height: 10, borderRadius: 5 },
  oddsRowLabel: { width: 64, fontFamily: Font.primaryBold, fontSize: Typography.base, color: Colors.textPrimary },
  oddsRowBarWrap: { flex: 1, height: 6, backgroundColor: Colors.bgCardDeep, borderRadius: 3, overflow: 'hidden' },
  oddsRowBarFill: { height: '100%', borderRadius: 3 },
  oddsRowPct: { width: 34, textAlign: 'right', fontFamily: Font.mono, fontSize: Typography.sm, color: Colors.textSecondary },

  guaranteeBox: { backgroundColor: Colors.goldMuted, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.md, padding: 14, marginBottom: 12 },
  guaranteeBoxTitle: {
    fontSize: Typography.xs, color: Colors.gold, letterSpacing: 1, textTransform: 'uppercase', fontFamily: Font.mono, marginBottom: 4,
  },
  guaranteeBoxText: { fontSize: Typography.sm, color: Colors.textPrimary, fontFamily: Font.secondaryRegular, lineHeight: 20 },
});
