import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { getPerkById } from '../data/perks';
import { PackRarity } from '../data/packs';
import { PackPullResult, PackType, TODO_BALANCE_PACK_COST_RINGS, useDynastyStore } from '../store/dynastyStore';
import { BrandBackground } from '../components/BrandBackground';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RARITY_LABEL: Record<PackRarity, string> = {
  common: 'COMMON', rare: 'RARE', elite: 'ELITE', legend: 'LEGEND',
};
const RARITY_COLOR: Record<PackRarity, string> = {
  common: Colors.rarityCommon, rare: Colors.rarityRare, elite: Colors.rarityElite, legend: Colors.rarityLegend,
};

export function PackOpeningScreen() {
  const navigation = useNavigation<Nav>();
  const rings = useDynastyStore((s) => s.rings);
  const ownedPacks = useDynastyStore((s) => s.ownedPacks);
  const buyPack = useDynastyStore((s) => s.buyPack);
  const openPack = useDynastyStore((s) => s.openPack);
  const addPulledPlayerToRoster = useDynastyStore((s) => s.addPulledPlayerToRoster);

  const [selectedType, setSelectedType] = useState<PackType>('player');
  const [reveal, setReveal] = useState<PackPullResult | null>(null);

  const packsOfType = ownedPacks.filter((p) => p.type === selectedType);
  const playerPackCount = ownedPacks.filter((p) => p.type === 'player').length;
  const perkPackCount = ownedPacks.filter((p) => p.type === 'perk').length;

  function handleSelectType(type: PackType) {
    setSelectedType(type);
    setReveal(null);
  }

  function handleOpen() {
    const nextPack = packsOfType[0];
    if (!nextPack) return;
    setReveal(openPack(nextPack.id));
  }

  function handleBuy() {
    buyPack(selectedType);
  }

  function handleAddToRoster() {
    if (reveal?.type === 'player' && !reveal.duplicate) {
      addPulledPlayerToRoster(reveal.player);
    }
    setReveal(null);
  }

  function handleOpenAnother() {
    setReveal(null);
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

      <View style={styles.selectRow}>
        <TouchableOpacity
          style={[styles.selectCard, selectedType === 'player' && styles.selectCardActive]}
          onPress={() => handleSelectType('player')}
          activeOpacity={0.85}
        >
          <Text style={styles.selectTitle}>Player pack</Text>
          <Text style={styles.selectCount}>{playerPackCount} owned</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectCard, selectedType === 'perk' && styles.selectCardActive]}
          onPress={() => handleSelectType('perk')}
          activeOpacity={0.85}
        >
          <Text style={styles.selectTitle}>Perk pack</Text>
          <Text style={styles.selectCount}>{perkPackCount} owned</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stage}>
        {!reveal ? (
          packsOfType.length > 0 ? (
            <>
              <TouchableOpacity style={styles.packVisual} onPress={handleOpen} activeOpacity={0.9}>
                <Text style={styles.packVisualText}>TAP TO{'\n'}OPEN</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>{selectedType === 'player' ? 'Player pack' : 'Perk pack'} · {packsOfType.length} available</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>No {selectedType} packs owned.</Text>
              <TouchableOpacity
                style={[styles.buyBtn, rings < TODO_BALANCE_PACK_COST_RINGS[selectedType] && styles.buyBtnDisabled]}
                onPress={handleBuy}
                disabled={rings < TODO_BALANCE_PACK_COST_RINGS[selectedType]}
                activeOpacity={0.85}
              >
                <Text style={styles.buyBtnText}>Buy for {TODO_BALANCE_PACK_COST_RINGS[selectedType]} 💍</Text>
              </TouchableOpacity>
            </>
          )
        ) : reveal.type === 'perk' ? (
          <View style={[styles.revealCard, { borderColor: Colors.gridironBlue }]}>
            <Text style={styles.revealRarity}>PERK</Text>
            <Text style={styles.revealName}>{reveal.perkName}</Text>
            <Text style={styles.revealSub}>{getPerkById(reveal.perkId)?.description}</Text>
          </View>
        ) : reveal.duplicate ? (
          <View style={[styles.revealCard, { borderColor: RARITY_COLOR[reveal.rarity] }]}>
            <Text style={[styles.revealRarity, { color: RARITY_COLOR[reveal.rarity] }]}>{RARITY_LABEL[reveal.rarity]} · DUPLICATE</Text>
            <Text style={styles.revealName}>Already on your roster</Text>
            <Text style={styles.revealSub}>Converted to +{reveal.ringsRefund} Rings</Text>
          </View>
        ) : (
          <View style={[styles.revealCard, { borderColor: RARITY_COLOR[reveal.rarity] }]}>
            <Text style={[styles.revealRarity, { color: RARITY_COLOR[reveal.rarity] }]}>{RARITY_LABEL[reveal.rarity]}</Text>
            <Text style={styles.revealName}>{reveal.player.name}</Text>
            <Text style={styles.revealSub}>{reveal.player.position} · {reveal.player.years} · {reveal.player.team}</Text>
            <Text style={styles.revealOvr}>{reveal.player.rating} OVR</Text>
          </View>
        )}
      </View>

      {reveal && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={handleOpenAnother} activeOpacity={0.85}>
            <Text style={styles.ghostBtnText}>{packsOfType.length > 1 ? 'Open another' : 'Done'}</Text>
          </TouchableOpacity>
          {reveal.type === 'player' && !reveal.duplicate && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddToRoster} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Add to roster</Text>
            </TouchableOpacity>
          )}
        </View>
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

  selectRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  selectCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
  },
  selectCardActive: { borderColor: Colors.gold },
  selectTitle: { color: Colors.textPrimary, fontSize: Typography.base, fontFamily: Font.secondarySemiBold },
  selectCount: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2, fontFamily: Font.secondaryRegular },

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
  buyBtn: { backgroundColor: Colors.gold, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 24 },
  buyBtnDisabled: { opacity: 0.4 },
  buyBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.md },

  revealCard: {
    width: 180, borderRadius: Radius.lg, borderWidth: 2, padding: 16, alignItems: 'center',
    backgroundColor: Colors.bgCardDeep,
  },
  revealRarity: { fontSize: Typography.sm, fontFamily: Font.secondaryBold, letterSpacing: 1, marginBottom: 8 },
  revealName: { color: Colors.textPrimary, fontFamily: Font.primarySemiBold, fontSize: Typography.lg, textAlign: 'center' },
  revealSub: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 4, textAlign: 'center', fontFamily: Font.secondaryRegular },
  revealOvr: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: 30, marginTop: 10 },

  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  ghostBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderMid,
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
  },
  ghostBtnText: { color: Colors.textSecondary, fontFamily: Font.primaryBold, fontSize: Typography.md, letterSpacing: 0.5 },
  primaryBtn: { flex: 1, backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.md, letterSpacing: 0.5 },
});
