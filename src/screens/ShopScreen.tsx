import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StyleProp, ViewStyle, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import {
  PACK_CARD_COUNT, PACK_TIERS, PackTier, PackTierId, TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS,
} from '../data/packs';
import { GENERATED_ERA_OPTIONS, GeneratedEra } from '../data/players';
import {
  computeShopAdPreview, OwnedPack, PackSource, TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY, totalOwnedPacks, useDynastyStore,
} from '../store/dynastyStore';
import { SHOP_AD_RINGS_ENABLED } from '../config/featureFlags';
import { PackShieldBadge, TIER_ACCENT } from '../components/PackShieldBadge';
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

// Caps the Store tab's horizontal "waiting to open" strip (docs/handoff/
// 18-shop-pack-shelf-redesign.md section 2) — beyond this many owned
// packs, the last slot becomes a "See all N" tile into the My Packs tab
// instead of scrolling indefinitely.
const WAITING_STRIP_CAP = 4;

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

function findTier(tierId: PackTierId): PackTier | undefined {
  return PACK_TIERS.find((t) => t.id === tierId);
}

// Shop's always-available "Watch an ad for Rings" placement
// (docs/handoff/13-ad-monetization-economy.md, section 1) — reward scales
// on the daily watch streak rather than a flat per-watch amount. Shared by
// both layouts like the pack tiles below.
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

// Buy-shelf tile (docs/handoff/18-shop-pack-shelf-redesign.md section 2) —
// replaces TierCard's bordered stat-card look. Odds/guarantee detail no
// longer renders inline (that's PackOddsSheet's job now, exclusively);
// tapping the tile body opens that sheet, Buy stays its own explicit
// action so the whole tile isn't a silent buy button.
function PackTile({ tier, cost, affordable, onBuy, onViewOdds, style }: {
  tier: PackTier;
  cost: number;
  affordable: boolean;
  onBuy: () => void;
  onViewOdds: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.packTile, style]}>
      <TouchableOpacity style={styles.packTileBody} onPress={onViewOdds} activeOpacity={0.85}>
        <PackShieldBadge tierId={tier.id} size={64} />
        <Text style={styles.packTileName} numberOfLines={1}>{tier.label}</Text>
        <Text style={styles.packTilePrice}>{cost} 💍</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.packTileBuyBtn, !affordable && styles.packTileBuyBtnDisabled]}
        onPress={onBuy}
        disabled={!affordable}
        activeOpacity={0.85}
      >
        <Text style={styles.packTileBuyBtnText}>{affordable ? 'BUY' : 'NOT ENOUGH'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Small strip tile for a pack that's already owned and waiting to be
// opened — no room for the full name at this size, shield badge only plus
// a gold OPEN bar.
function WaitingPackTile({ tier, onPress }: { tier: PackTier; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.waitingTile} onPress={onPress} activeOpacity={0.85}>
      <PackShieldBadge tierId={tier.id} size={36} />
      <View style={styles.waitingTileOpenBar}>
        <Text style={styles.waitingTileOpenText}>OPEN</Text>
      </View>
    </TouchableOpacity>
  );
}

// Caps the waiting strip at WAITING_STRIP_CAP real tiles — a functional
// "See all" tile beyond that instead of scrolling indefinitely for players
// with a lot of pending packs.
function SeeAllTile({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.seeAllTile} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.seeAllTileCount}>{count}</Text>
      <Text style={styles.seeAllTileText}>SEE ALL ›</Text>
    </TouchableOpacity>
  );
}

// My Packs tab tile — same shield-and-gradient tile family as PackTile,
// but the bottom shows a gold OPEN bar instead of a price, and the
// season/source/era-lock metadata PendingPackRow used to show carries
// forward underneath rather than being dropped.
function OwnedPackTile({ pack, tier, onPress, style }: {
  pack: OwnedPack;
  tier: PackTier;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity style={[styles.packTile, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.packTileBody}>
        <PackShieldBadge tierId={tier.id} size={64} />
        <View style={styles.waitingTileOpenBar}>
          <Text style={styles.waitingTileOpenText}>OPEN</Text>
        </View>
      </View>
      <Text style={styles.packTileName} numberOfLines={1}>{tier.label}</Text>
      <Text style={styles.packTileMeta}>{SOURCE_LABEL[pack.source]} · Season {pack.acquiredSeason}</Text>
      {pack.eraLock && (
        <View style={styles.packTileEraTag}>
          <Text style={styles.packTileEraTagText}>{pack.eraLock}</Text>
        </View>
      )}
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
    buyPack(tierId, selectedEra ?? undefined);
    setOddsSheetTierId(null);
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
    navigation.navigate('PackOpening', { packId });
  }

  // Waiting-to-open strip (docs/handoff/18-shop-pack-shelf-redesign.md
  // section 2) — supersedes doc 15's PendingPacksBanner text pill. Only
  // rendered when there's something waiting, same guard the banner had.
  const waitingStrip = pendingCount > 0 && (
    <>
      <Text style={styles.sectionLabel}>WAITING TO OPEN</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.waitingStrip} contentContainerStyle={styles.waitingStripContent}>
        {ownedPacks.slice(0, WAITING_STRIP_CAP).map((pack) => {
          const tier = findTier(pack.tierId);
          if (!tier) return null;
          return <WaitingPackTile key={pack.id} tier={tier} onPress={() => openPendingPack(pack.id)} />;
        })}
        {pendingCount > WAITING_STRIP_CAP && (
          <SeeAllTile count={pendingCount} onPress={() => setTab('mine')} />
        )}
      </ScrollView>
    </>
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
            {shopAdPill}

            <View style={styles.eraBarWide}>
              <Text style={styles.eraBarLabel}>ERA FILTER</Text>
              <View style={styles.eraChipsWide}>{eraChips}</View>
              {eraNote}
            </View>

            <View style={styles.layoutWide}>
              <View style={styles.tierGridWide}>
                <Text style={styles.sectionLabel}>BUY A PACK</Text>
                <View style={styles.tierShelfGrid}>
                  {PACK_TIERS.map((tier) => {
                    const cost = totalCost(tier, selectedEra);
                    const affordable = rings >= cost;
                    return (
                      <PackTile
                        key={tier.id}
                        tier={tier}
                        cost={cost}
                        affordable={affordable}
                        onBuy={() => handleBuy(tier.id)}
                        onViewOdds={() => setOddsSheetTierId(tier.id)}
                        style={styles.tierCardWide}
                      />
                    );
                  })}
                </View>
              </View>

              <View style={styles.sidebarCardWide}>
                <Text style={styles.sidebarTitle}>My Packs</Text>
                <Text style={styles.sidebarSub}>
                  {pendingCount === 0 ? 'None waiting to be opened' : `${pendingCount} waiting to be opened`}
                </Text>
                {pendingCount === 0 ? (
                  <Text style={styles.emptyHint}>Buy a pack to get started.</Text>
                ) : (
                  <View style={styles.sidebarWaitingGrid}>
                    {ownedPacks.map((pack: OwnedPack) => {
                      const tier = findTier(pack.tierId);
                      if (!tier) return null;
                      return (
                        <WaitingPackTile
                          key={pack.id}
                          tier={tier}
                          onPress={() => openPendingPack(pack.id)}
                        />
                      );
                    })}
                  </View>
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
              {waitingStrip}
              {shopAdPill}

              <Text style={styles.eraLabel}>Era filter (applies to any tier below)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraRow}>
                {eraChips}
              </ScrollView>
              {eraNote}

              <Text style={styles.sectionLabel}>BUY A PACK</Text>
              <View style={styles.tierShelfGrid}>
                {PACK_TIERS.map((tier) => {
                  const cost = totalCost(tier, selectedEra);
                  const affordable = rings >= cost;
                  return (
                    <PackTile
                      key={tier.id}
                      tier={tier}
                      cost={cost}
                      affordable={affordable}
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
                <View style={styles.tierShelfGrid}>
                  {ownedPacks.map((pack: OwnedPack) => {
                    const tier = findTier(pack.tierId);
                    if (!tier) return null;
                    return (
                      <OwnedPackTile
                        key={pack.id}
                        pack={pack}
                        tier={tier}
                        onPress={() => openPendingPack(pack.id)}
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

  sectionLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 8,
  },

  // ── Waiting-to-open strip (docs/handoff/18-shop-pack-shelf-redesign.md
  // section 2) — capped horizontal row of WaitingPackTile, "See all" once
  // WAITING_STRIP_CAP is exceeded. Supersedes doc 15's PendingPacksBanner.
  waitingStrip: { marginBottom: 4 },
  waitingStripContent: { gap: 10, paddingBottom: 4, paddingRight: 4 },
  waitingTile: {
    width: 64, backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, alignItems: 'center', padding: 6, gap: 4,
  },
  waitingTileOpenBar: {
    width: '100%', backgroundColor: Colors.gold, borderRadius: Radius.sm,
    paddingVertical: 3, alignItems: 'center',
  },
  waitingTileOpenText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: 9, letterSpacing: 0.5 },
  seeAllTile: {
    width: 64, minHeight: 76, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border,
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 2,
  },
  seeAllTileCount: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: Typography.lg },
  seeAllTileText: { color: Colors.textMuted, fontFamily: Font.mono, fontSize: 8, letterSpacing: 0.3, textAlign: 'center' },

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

  // ── Pack shelf (docs/handoff/18-shop-pack-shelf-redesign.md section 2)
  // — replaces the old tierList/tierCard stat-card styles. 2-column grid;
  // a lone odd tile (e.g. Legend Pack alone on row 2) centers via
  // justifyContent rather than stretching full-width.
  tierShelfGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 4 },
  packTile: {
    width: '48%', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: 12, alignItems: 'center',
  },
  packTileBody: { width: '100%', alignItems: 'center', gap: 6 },
  packTileName: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: Typography.md, textAlign: 'center' },
  packTilePrice: { color: Colors.gold, fontFamily: Font.mono, fontSize: Typography.sm },
  packTileBuyBtn: {
    width: '100%', marginTop: 10, minHeight: 38, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  packTileBuyBtnDisabled: { backgroundColor: 'transparent', borderColor: Colors.border },
  packTileBuyBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.sm, letterSpacing: 0.5 },
  // OwnedPackTile-only (My Packs tab) — season/source/era-lock metadata
  // PendingPackRow used to show, carried forward beneath the tile.
  packTileMeta: { color: Colors.textMuted, fontSize: Typography.xs, fontFamily: Font.mono, marginTop: 6, textAlign: 'center' },
  packTileEraTag: {
    marginTop: 3, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  packTileEraTagText: { fontSize: Typography.xs, color: Colors.gold, fontFamily: Font.mono },

  pendingHero: {
    marginTop: Spacing.lg, marginBottom: 8, alignItems: 'center', padding: 18, borderRadius: Radius.lg,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border,
  },
  pendingCount: { fontFamily: Font.primaryBold, fontSize: Typography['3xl'], color: Colors.gold },
  pendingHeroLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontFamily: Font.mono,
  },

  emptyHint: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.secondaryRegular, marginTop: Spacing.md, textAlign: 'center' },

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
  // Just the left column's width claim now — PackTile's own 3-up sizing
  // comes from tierCardWide (passed as its `style` override) inside the
  // nested tierShelfGrid, not from this container directly wrapping tiles.
  tierGridWide: { flex: 1 },
  // 3-up on wide (docs/handoff/18-shop-pack-shelf-redesign.md section 4) —
  // same PackTile component as narrow's 2-up shelf, just a wider slice per
  // tile via this style override, not a forked wide-specific tile.
  tierCardWide: { width: '31%' },
  sidebarCardWide: {
    width: 300, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: 18,
  },

  sidebarTitle: { fontSize: Typography.lg, color: Colors.textPrimary, fontFamily: Font.primaryBold, letterSpacing: 0.5 },
  sidebarSub: { fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono, marginTop: 2, marginBottom: 14 },
  // 2-up WaitingPackTile grid (section 4) — fits the 300px sidebar's
  // ~264px content width better than a sparser single column at this
  // tile's fixed ~64px size.
  sidebarWaitingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

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
