import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StyleProp, ViewStyle, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import {
  PACK_CARD_COUNT, PACK_RARITIES, PACK_TIERS,
  PackRarity, PackTier, PackTierId, TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS,
} from '../data/packs';
import { GENERATED_ERA_OPTIONS, GeneratedEra } from '../data/players';
import {
  computeShopAdPreview, OwnedPack, PackSource, TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY, totalOwnedPacks, useDynastyStore,
} from '../store/dynastyStore';
import { SHOP_AD_RINGS_ENABLED } from '../config/featureFlags';
import { RARITY_COLOR } from '../components/PackPlayerCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { SelectablePill } from '../components/SelectablePill';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { BrandBackground } from '../components/BrandBackground';
import { FieldFooterBand } from '../components/FieldFooterBand';
import { PackOddsSheet } from '../components/PackOddsSheet';
import { RewardedAdModal } from '../components/RewardedAdModal';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { useResponsive } from '../hooks/useResponsive';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ShopTab = 'store' | 'mine';

const TIER_ACCENT: Record<PackTierId, string> = {
  rookie: Colors.steel,
  pro: RARITY_COLOR.rare,
  legend: RARITY_COLOR.legend,
};

const SOURCE_LABEL: Record<PackSource, string> = {
  purchase: 'Purchased',
  season_reward: 'Season reward',
  draft_bonus: 'Draft bonus',
};

function totalCost(tier: PackTier, eraLock: GeneratedEra | null): number {
  return tier.cost + (eraLock ? TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS : 0);
}

function eraNoteText(tier: PackTier, era: GeneratedEra): string {
  const guaranteeClause = tier.guaranteedMinRarity ? `Same ${tier.badge} guarantee, just` : 'Just';
  return `Era lock doesn't change these odds — only which players are eligible to be pulled. ${guaranteeClause} every card comes from ${era}.`;
}

function OddsBar({ weights }: { weights: Record<PackRarity, number> }) {
  return (
    <View style={styles.oddsBar}>
      {PACK_RARITIES.map((rarity) => (
        <View key={rarity} style={{ flex: weights[rarity], backgroundColor: RARITY_COLOR[rarity] }} />
      ))}
    </View>
  );
}

// Shop's always-available "Watch an ad for Rings" placement
// (docs/handoff/13-ad-monetization-economy.md, section 1) — reward scales
// on the daily watch streak rather than a flat per-watch amount. Shared by
// both layouts like TierCard/PendingPackRow above.
function ShopAdCard({ preview, onWatch, disabled, justEarned, style }: {
  preview: { watchesRemainingToday: number; nextStreakDay: number; nextReward: number };
  onWatch: () => void;
  disabled: boolean;
  justEarned: number | null;
  style?: StyleProp<ViewStyle>;
}) {
  const dayLabel = preview.nextStreakDay >= 7 ? 'DAY 7+' : `DAY ${preview.nextStreakDay}`;
  return (
    <View style={[styles.adCard, style]}>
      <View style={styles.adCardTop}>
        <Text style={styles.adCardTitle}>Watch an ad for Rings</Text>
        <View style={styles.adCardStreakBadge}>
          <Text style={styles.adCardStreakText}>{dayLabel} STREAK</Text>
        </View>
      </View>
      <Text style={styles.adCardSub}>
        {preview.watchesRemainingToday > 0
          ? `${preview.watchesRemainingToday}/${TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY} watches left today`
          : 'Come back tomorrow for more'}
      </Text>
      {justEarned !== null && <Text style={styles.adCardEarned}>+{justEarned} 💍 EARNED</Text>}
      <TouchableOpacity
        style={[styles.adWatchBtn, disabled && styles.adWatchBtnDisabled]}
        onPress={onWatch}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={styles.adWatchBtnText}>
          {preview.watchesRemainingToday > 0 ? `▶ WATCH AD · +${preview.nextReward} 💍` : 'NO WATCHES LEFT TODAY'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Compact trigger for the ad-for-Rings card (item 5, docs/handoff/15-shop-
// pack-flow-streamlining.md) — the full ShopAdCard now only renders inside
// the bottom sheet this opens, so it stops competing with the tier list's
// Buy buttons for scroll priority and visual weight.
function ShopAdPill({ preview, onPress, justEarned }: {
  preview: { watchesRemainingToday: number; nextReward: number };
  onPress: () => void;
  justEarned: number | null;
}) {
  return (
    <TouchableOpacity style={styles.adPill} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.adPillText}>
        {justEarned !== null
          ? `+${justEarned} 💍 earned`
          : preview.watchesRemainingToday > 0
            ? `▶ Watch an ad · +${preview.nextReward} 💍`
            : 'No ad watches left today'}
      </Text>
    </TouchableOpacity>
  );
}

// Nudge to open a pack right after buying it (item 1) and a standing
// reminder that packs are waiting whenever the player returns to the Store
// (item 4) — same banner, same docs/handoff/15-shop-pack-flow-streamlining.md.
function PendingPacksBanner({ count, latestPackId, onOpen }: {
  count: number;
  latestPackId: string | null;
  onOpen: (packId: string) => void;
}) {
  if (count === 0) return null;
  return (
    <TouchableOpacity
      style={styles.pendingBanner}
      onPress={() => onOpen(latestPackId ?? '')}
      activeOpacity={0.85}
    >
      <Text style={styles.pendingBannerText}>
        {count === 1 ? '1 pack waiting' : `${count} packs waiting`} — Open now
      </Text>
      <Text style={styles.pendingBannerArrow}>›</Text>
    </TouchableOpacity>
  );
}

// One tier's buy card — shared by the narrow stacked list and the wide
// 3-up grid (gridiron-legends-shop-web.html) so both stay pixel-identical
// instead of forking the markup per layout.
function TierCard({ tier, cost, affordable, accent, onBuy, onViewOdds, style }: {
  tier: PackTier;
  cost: number;
  affordable: boolean;
  accent: string;
  onBuy: () => void;
  onViewOdds: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tierCard, { borderColor: accent }, style]}>
      <View style={styles.tierTop}>
        <View>
          <Text style={styles.tierName}>{tier.label}</Text>
          <Text style={styles.tierCardsCount}>{PACK_CARD_COUNT} cards</Text>
        </View>
        <View style={[styles.tierBadge, { borderColor: accent }]}>
          <Text style={[styles.tierBadgeText, { color: accent }]}>{tier.badge}</Text>
        </View>
      </View>

      <OddsBar weights={tier.weights} />

      <Text style={[styles.guaranteeText, !tier.guaranteedMinRarity && styles.guaranteeTextNone]}>
        {tier.description}
      </Text>

      {/* marginTop:'auto' keeps price/buy pinned to the card bottom when the
          wide grid's row stretches every card to the tallest sibling's
          height — inert on the narrow stack, which never has spare room. */}
      <View style={styles.tierBottom}>
        <View style={styles.tierFooter}>
          <Text style={styles.tierPrice}>{cost} 💍</Text>
          <TouchableOpacity onPress={onViewOdds}>
            <Text style={styles.viewOddsLink}>View odds</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, !affordable && styles.buyBtnDisabled]}
          onPress={onBuy}
          disabled={!affordable}
          activeOpacity={0.85}
        >
          <Text style={styles.buyBtnText}>{affordable ? `BUY ${tier.label.toUpperCase()}` : 'NOT ENOUGH RINGS'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// One pending-pack row — shared by the narrow "My Packs" tab and the wide
// always-visible sidebar.
function PendingPackRow({ pack, tier, accent, onPress, style }: {
  pack: OwnedPack;
  tier: PackTier;
  accent: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity style={[styles.pendingRow, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.pendingIcon, { borderColor: accent }]}>
        <Text style={[styles.pendingIconText, { color: accent }]}>{tier.shortCode}</Text>
      </View>
      <View style={styles.pendingInfo}>
        <Text style={styles.pendingName}>{tier.label}</Text>
        <Text style={styles.pendingSub}>{SOURCE_LABEL[pack.source]} · Season {pack.acquiredSeason}</Text>
        {pack.eraLock && (
          <View style={styles.pendingEraTag}>
            <Text style={styles.pendingEraTagText}>{pack.eraLock}</Text>
          </View>
        )}
      </View>
      <View style={styles.pendingOpenBtn}>
        <Text style={styles.pendingOpenBtnText}>OPEN</Text>
      </View>
    </TouchableOpacity>
  );
}

// Shop is Dynasty's pack economy hub (docs/handoff/gridiron-legends-shop-
// mockups.html for narrow, gridiron-legends-shop-web.html for wide): Pack
// Store (buy tiers, each with its own odds + optional guarantee floor, plus
// an era-lock price modifier that narrows the pull pool without touching
// odds) and My Packs (pending pack instances waiting to be opened — each
// tracked individually since an era lock makes two packs of the same tier
// not interchangeable).
//
// Narrow keeps Store/My Packs as tabs since there's only room for one at a
// time. Wide has room for both at once (docs' persistent sidebar), so My
// Packs stops being a tab there and just sits beside the tier grid — the
// reference mockup's tabRow is vestigial (its own JS comment admits both
// panes stay visible "for the mockup's sake"); this makes that real.
export function ShopScreen() {
  const navigation = useNavigation<Nav>();
  const { isWide } = useResponsive();
  const rings = useDynastyStore((s) => s.rings);
  const ownedPacks = useDynastyStore((s) => s.ownedPacks);
  const currentSeason = useDynastyStore((s) => s.currentSeason);
  const buyPack = useDynastyStore((s) => s.buyPack);
  const shopAdStreakDay = useDynastyStore((s) => s.shopAdStreakDay);
  const lastShopAdWatchDate = useDynastyStore((s) => s.lastShopAdWatchDate);
  const shopAdWatchesToday = useDynastyStore((s) => s.shopAdWatchesToday);
  const watchShopAdForRings = useDynastyStore((s) => s.watchShopAdForRings);

  const [tab, setTab] = useState<ShopTab>('store');
  const [selectedEra, setSelectedEra] = useState<GeneratedEra | null>(null);
  const [oddsSheetTierId, setOddsSheetTierId] = useState<PackTierId | null>(null);
  const [adRingsJustEarned, setAdRingsJustEarned] = useState<number | null>(null);
  const [adSheetOpen, setAdSheetOpen] = useState(false);
  const [justBoughtPackId, setJustBoughtPackId] = useState<string | null>(null);
  const { requestAd, adModalProps } = useRewardedAd(SHOP_AD_RINGS_ENABLED);

  // Same "drafted at least once" gate PackOpeningScreen uses (see its
  // hasCompletedInitialDraft comment) — packs build out the bench, which
  // doesn't exist until the initial draft lands the starting 12.
  const hasCompletedInitialDraft = currentSeason > 1;
  const pendingCount = totalOwnedPacks(ownedPacks);
  const oddsSheetTier = oddsSheetTierId ? PACK_TIERS.find((t) => t.id === oddsSheetTierId) ?? null : null;
  const adPreview = computeShopAdPreview({ lastShopAdWatchDate, shopAdStreakDay, shopAdWatchesToday });

  function handleBuy(tierId: PackTierId) {
    if (!hasCompletedInitialDraft) return;
    const newPackId = buyPack(tierId, selectedEra ?? undefined);
    setOddsSheetTierId(null);
    if (newPackId) setJustBoughtPackId(newPackId);
  }

  async function handleWatchShopAd() {
    if (adPreview.watchesRemainingToday <= 0) return;
    setAdSheetOpen(false);
    const watched = await requestAd();
    if (!watched) return;
    const earned = watchShopAdForRings();
    if (earned > 0) {
      setAdRingsJustEarned(earned);
      setTimeout(() => setAdRingsJustEarned(null), 2500);
    }
  }

  const shopAdPill = SHOP_AD_RINGS_ENABLED && (
    <ShopAdPill preview={adPreview} justEarned={adRingsJustEarned} onPress={() => setAdSheetOpen(true)} />
  );

  function openPendingPack(packId: string) {
    setJustBoughtPackId(null);
    navigation.navigate('PackOpening', { packId });
  }

  const pendingPacksBanner = (
    <PendingPacksBanner
      count={pendingCount}
      latestPackId={justBoughtPackId ?? ownedPacks[0]?.id ?? null}
      onOpen={openPendingPack}
    />
  );

  const eraChips = (
    <>
      <SelectablePill label="ALL ERAS" selected={selectedEra === null} onPress={() => setSelectedEra(null)} style={styles.eraChip} />
      {GENERATED_ERA_OPTIONS.map((era) => (
        <SelectablePill
          key={era}
          label={era}
          selected={selectedEra === era}
          onPress={() => setSelectedEra(era)}
          style={styles.eraChip}
        />
      ))}
    </>
  );

  const eraNote = (
    <Text style={styles.eraNote}>
      Lock a specific era for <Text style={styles.eraNoteGold}>+{TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS} 💍</Text> — same tier odds, narrowed pool.
    </Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <BrandBackground variant="header" style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        {isWide ? (
          <View style={styles.toolbarTitleWideWrap}>
            <Text style={styles.breadcrumb}>DYNASTY / SHOP</Text>
            <Text style={styles.toolbarTitleWide}>SHOP</Text>
          </View>
        ) : (
          <Text style={styles.toolbarTitle}>SHOP</Text>
        )}
        <View style={styles.ringsChip}>
          <Text style={styles.ringsText}>{rings} 💍</Text>
        </View>
      </BrandBackground>

      {!hasCompletedInitialDraft ? (
        <View style={styles.stage}>
          <Text style={styles.emptyText}>Draft your team before visiting the Shop — packs build out your bench, not your starting roster.</Text>
          <PrimaryButton label="Back to Dynasty" onPress={() => navigation.goBack()} />
        </View>
      ) : isWide ? (
        <ScrollView contentContainerStyle={styles.scrollContentWide} showsVerticalScrollIndicator={false}>
          <View style={styles.wideWrap}>
            {pendingPacksBanner}
            {shopAdPill}

            <View style={styles.eraBarWide}>
              <Text style={styles.eraBarLabel}>ERA FILTER</Text>
              <View style={styles.eraChipsWide}>{eraChips}</View>
              {eraNote}
            </View>

            <View style={styles.layoutWide}>
              <View style={styles.tierGridWide}>
                {PACK_TIERS.map((tier) => {
                  const cost = totalCost(tier, selectedEra);
                  const affordable = rings >= cost;
                  return (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      cost={cost}
                      affordable={affordable}
                      accent={TIER_ACCENT[tier.id]}
                      onBuy={() => handleBuy(tier.id)}
                      onViewOdds={() => setOddsSheetTierId(tier.id)}
                      style={styles.tierCardWide}
                    />
                  );
                })}
              </View>

              <View style={styles.sidebarCardWide}>
                <Text style={styles.sidebarTitle}>My Packs</Text>
                <Text style={styles.sidebarSub}>
                  {pendingCount === 0 ? 'None waiting to be opened' : `${pendingCount} waiting to be opened`}
                </Text>
                {pendingCount === 0 ? (
                  <Text style={styles.emptyHint}>Buy a pack to get started.</Text>
                ) : (
                  ownedPacks.map((pack: OwnedPack) => {
                    const tier = PACK_TIERS.find((t) => t.id === pack.tierId);
                    if (!tier) return null;
                    return (
                      <PendingPackRow
                        key={pack.id}
                        pack={pack}
                        tier={tier}
                        accent={TIER_ACCENT[tier.id]}
                        onPress={() => navigation.navigate('PackOpening', { packId: pack.id })}
                        style={styles.sidebarPendingRow}
                      />
                    );
                  })
                )}
              </View>
            </View>

            <FieldFooterBand />
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.tabsWrap}>
            <SegmentedControl
              options={[
                { value: 'store', label: 'PACK STORE' },
                { value: 'mine', label: `MY PACKS · ${pendingCount}` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {tab === 'store' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {pendingPacksBanner}
              {shopAdPill}

              <Text style={styles.eraLabel}>Era filter (applies to any tier below)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraRow}>
                {eraChips}
              </ScrollView>
              {eraNote}

              <View style={styles.tierList}>
                {PACK_TIERS.map((tier) => {
                  const cost = totalCost(tier, selectedEra);
                  const affordable = rings >= cost;
                  return (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      cost={cost}
                      affordable={affordable}
                      accent={TIER_ACCENT[tier.id]}
                      onBuy={() => handleBuy(tier.id)}
                      onViewOdds={() => setOddsSheetTierId(tier.id)}
                    />
                  );
                })}
              </View>

              <FieldFooterBand />
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.pendingHero}>
                <Text style={styles.pendingCount}>{pendingCount}</Text>
                <Text style={styles.pendingHeroLabel}>Packs waiting to be opened</Text>
              </View>

              {pendingCount === 0 ? (
                <Text style={styles.emptyHint}>No packs waiting — buy one in the Pack Store.</Text>
              ) : (
                <View style={styles.pendingList}>
                  {ownedPacks.map((pack: OwnedPack) => {
                    const tier = PACK_TIERS.find((t) => t.id === pack.tierId);
                    if (!tier) return null;
                    return (
                      <PendingPackRow
                        key={pack.id}
                        pack={pack}
                        tier={tier}
                        accent={TIER_ACCENT[tier.id]}
                        onPress={() => navigation.navigate('PackOpening', { packId: pack.id })}
                      />
                    );
                  })}
                </View>
              )}

              <FieldFooterBand />
            </ScrollView>
          )}
        </>
      )}

      <PackOddsSheet
        visible={oddsSheetTier !== null}
        tier={oddsSheetTier}
        accentColor={oddsSheetTier ? TIER_ACCENT[oddsSheetTier.id] : Colors.gold}
        isWide={isWide}
        onClose={() => setOddsSheetTierId(null)}
        subtitle={selectedEra ? `ERA LOCKED · ${selectedEra}` : undefined}
        priceLine={oddsSheetTier ? (
          selectedEra
            ? `${oddsSheetTier.cost} 💍 base + ${TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS} 💍 era lock · ${PACK_CARD_COUNT} cards`
            : `${oddsSheetTier.cost} 💍 · ${PACK_CARD_COUNT} cards`
        ) : undefined}
        note={selectedEra && oddsSheetTier && (
          <View style={styles.eraNoteBox}>
            <Text style={styles.eraNoteBoxText}>{eraNoteText(oddsSheetTier, selectedEra)}</Text>
          </View>
        )}
        footer={oddsSheetTier && (
          <View style={styles.sheetBuyRow}>
            <SecondaryButton label="CLOSE" onPress={() => setOddsSheetTierId(null)} style={styles.sheetCloseBtn} />
            <PrimaryButton
              label={`BUY · ${totalCost(oddsSheetTier, selectedEra)} 💍`}
              onPress={() => handleBuy(oddsSheetTier.id)}
              disabled={rings < totalCost(oddsSheetTier, selectedEra)}
              style={styles.sheetBuyBtn}
            />
          </View>
        )}
      />

      {/* Ad-for-Rings sheet (item 5) — reuses the same overlay/sheet look as
          PackOddsSheet above (styles.sheetOverlay/sheet/sheetWide/sheetHandle,
          previously unused leftovers from before that sheet was its own
          component) rather than a new sheet primitive, since ShopAdCard's
          content shape doesn't fit PackOddsSheet's tier-odds-specific props. */}
      <Modal visible={adSheetOpen} transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={() => setAdSheetOpen(false)}>
        <Pressable style={[styles.sheetOverlay, isWide && styles.sheetOverlayWide]} onPress={() => setAdSheetOpen(false)}>
          <Pressable style={[styles.sheet, isWide && styles.sheetWide]} onPress={(e) => e.stopPropagation()}>
            {!isWide && <View style={styles.sheetHandle} />}
            <ShopAdCard
              preview={adPreview}
              onWatch={handleWatchShopAd}
              disabled={adPreview.watchesRemainingToday <= 0}
              justEarned={adRingsJustEarned}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <RewardedAdModal {...adModalProps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },

  adCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.gold, borderRadius: Radius.lg,
    padding: 16, marginBottom: Spacing.lg,
  },
  adCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  adCardTitle: { fontSize: Typography.md, color: Colors.textPrimary, fontFamily: Font.primaryBold, letterSpacing: 0.3 },
  adCardStreakBadge: { borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  adCardStreakText: { fontSize: Typography.xs, color: Colors.gold, fontFamily: Font.mono, letterSpacing: 0.5 },
  adCardSub: { fontSize: Typography.sm, color: Colors.textMuted, fontFamily: Font.secondaryRegular, marginBottom: 12 },
  adCardEarned: {
    fontSize: Typography.sm, color: Colors.gold, fontFamily: Font.primaryBold, marginBottom: 10, letterSpacing: 0.5,
  },
  adWatchBtn: {
    minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  adWatchBtnDisabled: { backgroundColor: 'transparent', borderColor: Colors.border },
  adWatchBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.base, letterSpacing: 0.6 },

  adPill: {
    alignSelf: 'flex-start', backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10,
  },
  adPillText: { color: Colors.textMuted, fontFamily: Font.mono, fontSize: Typography.xs },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.gold,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  pendingBannerText: { color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography.sm, letterSpacing: 0.4 },
  pendingBannerArrow: { color: Colors.gold, fontSize: Typography.lg },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  toolbarTitle: { flex: 1, fontSize: Typography.xl, color: Colors.textPrimary, letterSpacing: 1.1, fontFamily: Font.primaryBold },
  toolbarTitleWideWrap: { flex: 1 },
  breadcrumb: {
    fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2,
  },
  toolbarTitleWide: { fontSize: Typography['3xl'], color: Colors.textPrimary, letterSpacing: 1, fontFamily: Font.primaryBold },
  ringsChip: {
    borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ringsText: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: Spacing.lg },
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, textAlign: 'center' },

  tabsWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },

  eraLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 8,
  },
  eraRow: { gap: 8, paddingBottom: 2 },
  eraChip: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 0 },
  eraNote: { fontSize: Typography.xs, color: Colors.textDim, fontFamily: Font.secondaryRegular, marginTop: 8 },
  eraNoteGold: { color: Colors.gold, fontFamily: Font.secondarySemiBold },

  tierList: { gap: 14, marginTop: Spacing.lg },
  tierCard: { backgroundColor: Colors.bgCard, borderWidth: 1.5, borderRadius: Radius.lg, padding: 16 },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  tierName: { fontSize: Typography.lg, color: Colors.textPrimary, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
  tierCardsCount: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono, marginTop: 2 },
  tierBadge: {
    borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  tierBadgeText: { fontSize: Typography.xs, fontFamily: Font.mono, letterSpacing: 0.5, textTransform: 'uppercase' },

  oddsBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },

  guaranteeText: { fontSize: Typography.sm, color: Colors.gold, fontFamily: Font.secondarySemiBold, marginBottom: 12 },
  guaranteeTextNone: { color: Colors.textDim, fontFamily: Font.secondaryRegular },

  tierBottom: { marginTop: 'auto' },
  tierFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tierPrice: { fontFamily: Font.mono, fontWeight: '700', fontSize: Typography.md, color: Colors.gold },
  viewOddsLink: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.secondaryRegular, textDecorationLine: 'underline', marginLeft: 'auto' },

  buyBtn: {
    minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  buyBtnDisabled: { backgroundColor: 'transparent', borderColor: Colors.border },
  buyBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.base, letterSpacing: 0.6 },

  pendingHero: {
    marginTop: Spacing.lg, marginBottom: 8, alignItems: 'center', padding: 18, borderRadius: Radius.lg,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border,
  },
  pendingCount: { fontFamily: Font.primaryBold, fontSize: Typography['3xl'], color: Colors.gold },
  pendingHeroLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontFamily: Font.mono,
  },

  emptyHint: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.secondaryRegular, marginTop: Spacing.md, textAlign: 'center' },

  pendingList: { gap: 10, marginTop: 8 },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12,
  },
  pendingIcon: {
    width: 38, height: 48, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgCardDeep,
  },
  pendingIconText: { fontFamily: Font.primaryBold, fontSize: Typography.xs, letterSpacing: 0.5 },
  pendingInfo: { flex: 1 },
  pendingName: { fontFamily: Font.primaryBold, fontSize: Typography.md, color: Colors.textPrimary, letterSpacing: 0.5 },
  pendingSub: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono, marginTop: 1 },
  pendingEraTag: {
    alignSelf: 'flex-start', marginTop: 3, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  pendingEraTagText: { fontSize: Typography.xs, color: Colors.gold, fontFamily: Font.mono },
  pendingOpenBtn: {
    minHeight: 34, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14,
  },
  pendingOpenBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.sm, letterSpacing: 0.5 },

  // ── WIDE LAYOUT (docs/handoff/gridiron-legends-shop-web.html) — tier
  // grid + always-visible "My Packs" sidebar, not a reflow of the narrow
  // tabbed stack. Mirrors the wide/narrow split HomeScreen already uses
  // (see useResponsive/WIDE_BREAKPOINT).
  scrollContentWide: { paddingBottom: Spacing['2xl'] },
  wideWrap: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: Spacing['2xl'] },

  eraBarWide: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 18, paddingVertical: 14, marginTop: Spacing.lg, marginBottom: Spacing.xl,
  },
  eraBarLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  eraChipsWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },

  layoutWide: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2xl'] },
  tierGridWide: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 18 },
  tierCardWide: { flexBasis: '31%', flexGrow: 1 },
  sidebarCardWide: {
    width: 300, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: 18,
  },

  sidebarTitle: { fontSize: Typography.lg, color: Colors.textPrimary, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
  sidebarSub: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono, marginTop: 2, marginBottom: 14 },
  sidebarPendingRow: { marginBottom: 10 },

  sheetOverlay: { flex: 1, backgroundColor: '#000000A8', justifyContent: 'flex-end' },
  sheetOverlayWide: { justifyContent: 'center', alignItems: 'center' },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 24, borderTopWidth: 1.5, borderTopColor: Colors.rarityLegend,
  },
  sheetWide: {
    maxWidth: 420, width: '100%', alignSelf: 'center',
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.rarityLegend,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: Font.primaryBold, fontSize: Typography.xl, letterSpacing: 0.5, textAlign: 'center' },
  sheetSubtitle: { textAlign: 'center', fontFamily: Font.mono, color: Colors.gold, fontSize: Typography.sm, marginTop: 4 },
  sheetPrice: { textAlign: 'center', fontFamily: Font.mono, color: Colors.textSecondary, fontSize: Typography.sm, marginTop: 2, marginBottom: 18 },

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

  eraNoteBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.borderMid, borderRadius: Radius.md, padding: 12, marginBottom: 18 },
  eraNoteBoxText: { fontSize: Typography.sm, color: Colors.textSecondary, fontFamily: Font.secondaryRegular, lineHeight: 19 },

  sheetBuyRow: { flexDirection: 'row', gap: 10 },
  sheetCloseBtn: { flex: 1 },
  sheetBuyBtn: { flex: 2 },
});
