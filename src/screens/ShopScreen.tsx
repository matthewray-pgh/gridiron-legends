import React, { useState } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, ScrollView, StyleProp, ViewStyle, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import {
  PACK_CARD_COUNT, PACK_TIERS, PackTier, PackTierId, TIER_ACCENT, TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS,
} from '../data/packs';
import { GENERATED_ERA_OPTIONS, GeneratedEra } from '../data/players';
import {
  computeShopAdPreview, OwnedPack, PackSource, TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY, totalOwnedPacks, useDynastyStore,
} from '../store/dynastyStore';
import { SHOP_AD_RINGS_ENABLED } from '../config/featureFlags';
import { PackArt } from '../components/PackArt';
import { SelectablePill } from '../components/SelectablePill';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { BrandBackground } from '../components/BrandBackground';
import { PackOddsSheet } from '../components/PackOddsSheet';
import { RewardedAdModal } from '../components/RewardedAdModal';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { useResponsive } from '../hooks/useResponsive';
import { useBounceOnIncrease, useCountUp, useLastNonNull, usePressScale, useShake } from '../hooks/useAnimations';
import { FadeInOut } from '../components/animation/FadeInOut';
import { RingsIcon } from '../components/RingsIcon';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Caps the Store's horizontal "waiting to open" strip (docs/handoff/
// 18-shop-pack-shelf-redesign.md section 2) — beyond this many owned
// packs, the last slot becomes a "See all N" tile that opens the My Packs
// bottom sheet (docs/handoff/19-season-flow-pack-rebalance-shop-polish_1.md
// section 4) instead of scrolling indefinitely.
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

// Shop's always-available "Watch Reward Ad for Rings" placement
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
  const displayEarned = useLastNonNull(justEarned);
  return (
    <View style={[styles.adCard, style]}>
      <View style={styles.adCardTop}>
        <Text style={styles.adCardTitle}>Watch Reward Ad for Rings</Text>
        <View style={styles.adCardStreakBadge}>
          <Text style={styles.adCardStreakText}>{dayLabel} STREAK</Text>
        </View>
      </View>
      <Text style={styles.adCardSub}>
        {preview.watchesRemainingToday > 0
          ? `${preview.watchesRemainingToday}/${TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY} watches left today`
          : 'Come back tomorrow for more'}
      </Text>
      <FadeInOut visible={justEarned !== null}>
        <Text style={styles.adCardEarned}>+{displayEarned} <RingsIcon size={13} /> EARNED</Text>
      </FadeInOut>
      <TouchableOpacity
        style={[styles.adWatchBtn, disabled && styles.adWatchBtnDisabled]}
        onPress={onWatch}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={styles.adWatchBtnText}>
          {preview.watchesRemainingToday > 0
            ? <>▶ WATCH REWARD AD · +{preview.nextReward} <RingsIcon size={13} color={Colors.bgDark} /></>
            : 'NO WATCHES LEFT TODAY'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Trigger for the ad-for-Rings card (item 5, docs/handoff/15-shop-pack-
// flow-streamlining.md) — the full ShopAdCard only renders inside the
// bottom sheet this opens. Originally sized as a small compact pill to
// avoid competing with the Buy buttons; flagged as too easy to miss given
// it's a real income avenue, so this is now a full-width banner with the
// same visual weight as the pack tiles below it rather than a footnote
// above them.
function ShopAdPill({ preview, onPress, justEarned }: {
  preview: { watchesRemainingToday: number; nextReward: number };
  onPress: () => void;
  justEarned: number | null;
}) {
  const pillState = justEarned !== null ? 'earned' : preview.watchesRemainingToday > 0 ? 'watch' : 'none';
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9}>
      <Animated.View style={[styles.adPill, { transform: [{ scale }] }]}>
        <View style={styles.adPillLeft}>
          <MaterialCommunityIcons name="play-circle" size={26} color={Colors.gold} />
          <FadeInOut key={pillState} duration={180} style={styles.adPillTextWrap}>
            <Text style={styles.adPillText} numberOfLines={1}>
              {justEarned !== null
                ? <>+{justEarned} <RingsIcon size={14} /> earned</>
                : preview.watchesRemainingToday > 0
                  ? <>Watch Reward Ad · +{preview.nextReward} <RingsIcon size={14} /></>
                  : 'No ad watches left today'}
            </Text>
          </FadeInOut>
        </View>
        {preview.watchesRemainingToday > 0 && justEarned === null && <Text style={styles.adPillChevron}>›</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Buy-shelf tile (docs/handoff/18-shop-pack-shelf-redesign.md section 2) —
// replaces TierCard's bordered stat-card look. Odds/guarantee detail no
// longer renders inline (that's PackOddsSheet's job now, exclusively);
// tapping the tile body opens that sheet, Buy stays its own explicit
// action so the whole tile isn't a silent buy button.
function PackTile({ tier, cost, affordable, onBuy, onViewOdds, fullWidth, style }: {
  tier: PackTier;
  cost: number;
  affordable: boolean;
  onBuy: () => void;
  onViewOdds: () => void;
  // Full-width single-column row (mobile) instead of the centered square
  // tile (wide's 3-up shelf) — badge/name/price flow horizontally so a
  // full-width card isn't just the small tile stretched out with dead
  // space on either side. Same component, same press/shake behavior either
  // way, just a different JSX arrangement for the two contexts.
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { translateX, shake } = useShake();

  // Buy stays tappable even when unaffordable — tapping it now shakes to
  // signal "not enough Rings" rather than the tap silently doing nothing
  // (the old `disabled` state swallowed the press entirely).
  function handlePress() {
    if (affordable) onBuy();
    else shake();
  }

  if (fullWidth) {
    return (
      <View style={[styles.packTileRow, style]}>
        <TouchableOpacity style={styles.packTileRowBody} onPress={onViewOdds} activeOpacity={0.85}>
          <PackArt tierId={tier.id} size={72} />
          <View style={styles.packTileRowText}>
            <Text style={styles.packTileRowName} numberOfLines={1}>{tier.label}</Text>
            <Text style={styles.packTileRowPrice}>{cost} <RingsIcon size={12} /></Text>
          </View>
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <TouchableOpacity
            style={[styles.packTileRowBuyBtn, !affordable && styles.packTileBuyBtnDisabled]}
            onPress={handlePress}
            activeOpacity={0.85}
            testID={`buy-pack-${tier.id}`}
          >
            <Text style={styles.packTileBuyBtnText}>{affordable ? 'BUY' : 'NOT ENOUGH'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.packTile, style]}>
      <TouchableOpacity style={styles.packTileBody} onPress={onViewOdds} activeOpacity={0.85}>
        <PackArt tierId={tier.id} size={140} />
        <Text style={styles.packTileName} numberOfLines={1}>{tier.label}</Text>
        <Text style={styles.packTilePrice}>{cost} <RingsIcon size={12} /></Text>
      </TouchableOpacity>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[styles.packTileBuyBtn, !affordable && styles.packTileBuyBtnDisabled]}
          onPress={handlePress}
          activeOpacity={0.85}
          testID={`buy-pack-${tier.id}`}
        >
          <Text style={styles.packTileBuyBtnText}>{affordable ? 'BUY' : 'NOT ENOUGH'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// Small strip tile for a pack that's already owned and waiting to be
// opened — no room for the full name at this size, shield badge only plus
// a gold OPEN bar.
function WaitingPackTile({ tier, onPress }: { tier: PackTier; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.waitingTile} onPress={onPress} activeOpacity={0.85}>
      <PackArt tierId={tier.id} size={56} />
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
    <TouchableOpacity style={[styles.packTile, styles.ownedPackTile, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.packTileBody}>
        <PackArt tierId={tier.id} size={92} />
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
// odds) is the only view now (docs/handoff/19-season-flow-pack-rebalance-
// shop-polish_1.md, section 4 — the old My Packs tab was dropped as
// redundant with the waiting-to-open strip already on this screen). Pending
// pack instances beyond the strip's cap surface via the "See all" bottom
// sheet instead of a second tab.
//
// Wide keeps its persistent "My Packs" sidebar unaffected — it already
// shows every pending pack at once, so it never needed the sheet either.
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

  const [selectedEra, setSelectedEra] = useState<GeneratedEra | null>(null);
  const [oddsSheetTierId, setOddsSheetTierId] = useState<PackTierId | null>(null);
  const [adRingsJustEarned, setAdRingsJustEarned] = useState<number | null>(null);
  const [adSheetOpen, setAdSheetOpen] = useState(false);
  // "See all" opens a bottom sheet listing every owned pack (docs/handoff/
  // 19-season-flow-pack-rebalance-shop-polish_1.md, section 4) — supersedes
  // doc 18's My Packs tab, which is now redundant with the waiting strip.
  const [packsSheetOpen, setPacksSheetOpen] = useState(false);
  const { requestAd, adModalProps } = useRewardedAd(SHOP_AD_RINGS_ENABLED);
  const { translateX: sheetBuyShakeX, shake: shakeSheetBuy } = useShake();
  const animatedRings = useCountUp(rings);
  const { scale: ringsBounceScale, zIndex: ringsBounceZIndex } = useBounceOnIncrease(rings);

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
    <View style={[styles.sectionBlock, styles.sectionBlockGreen]}>
      <Text style={[styles.sectionLabel, styles.sectionLabelGreen]}>MY PACKS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.waitingStrip} contentContainerStyle={styles.waitingStripContent}>
        {ownedPacks.slice(0, WAITING_STRIP_CAP).map((pack, i) => {
          const tier = findTier(pack.tierId);
          if (!tier) return null;
          return (
            <FadeInOut key={pack.id} delay={i * 50} translateY={8}>
              <WaitingPackTile tier={tier} onPress={() => openPendingPack(pack.id)} />
            </FadeInOut>
          );
        })}
        {pendingCount > WAITING_STRIP_CAP && (
          <SeeAllTile count={pendingCount} onPress={() => setPacksSheetOpen(true)} />
        )}
      </ScrollView>
    </View>
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
      Lock a specific era for <Text style={styles.eraNoteGold}>+{TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS} <RingsIcon size={11} /></Text> — same tier odds, narrowed pool.
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
        <Animated.View style={[styles.ringsChip, { transform: [{ scale: ringsBounceScale }], zIndex: ringsBounceZIndex }]}>
          <Text style={styles.ringsText}>{animatedRings} <RingsIcon size={14} /></Text>
        </Animated.View>
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

            {/* Stacked, not side-by-side — a wide sidebar previously sat
                next to the Buy shelf; both sections now get full-width
                bordered blocks so they read as clearly separate systems
                (gold = spend Rings, green = ready to open) instead of
                competing for horizontal space. */}
            <View style={styles.sectionBlock}>
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

            <View style={[styles.sectionBlock, styles.sectionBlockGreen]}>
              <Text style={[styles.sectionLabel, styles.sectionLabelGreen]}>MY PACKS</Text>
              <Text style={styles.sidebarSub}>
                {pendingCount === 0 ? 'None waiting to be opened' : `${pendingCount} waiting to be opened`}
              </Text>
              {pendingCount === 0 ? (
                <Text style={styles.emptyHint}>Buy a pack to get started.</Text>
              ) : (
                <View style={styles.sidebarWaitingGrid}>
                  {ownedPacks.map((pack: OwnedPack, i) => {
                    const tier = findTier(pack.tierId);
                    if (!tier) return null;
                    return (
                      <FadeInOut key={pack.id} delay={Math.min(i, 8) * 40} translateY={8}>
                        <WaitingPackTile
                          tier={tier}
                          onPress={() => openPendingPack(pack.id)}
                        />
                      </FadeInOut>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {waitingStrip}
          {shopAdPill}

          <Text style={styles.eraLabel}>Era filter (applies to any tier below)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraRow}>
            {eraChips}
          </ScrollView>
          {eraNote}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>BUY A PACK</Text>
            <View style={styles.tierShelfStack}>
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
                    fullWidth
                  />
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <PackOddsSheet
        visible={oddsSheetTier !== null}
        tier={oddsSheetTier}
        accentColor={oddsSheetTier ? TIER_ACCENT[oddsSheetTier.id] : Colors.gold}
        isWide={isWide}
        onClose={() => setOddsSheetTierId(null)}
        subtitle={selectedEra ? `ERA LOCKED · ${selectedEra}` : undefined}
        priceLine={oddsSheetTier ? (
          selectedEra ? (
            <>{oddsSheetTier.cost} <RingsIcon size={11} color={Colors.textSecondary} /> base + {TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS} <RingsIcon size={11} color={Colors.textSecondary} /> era lock · {PACK_CARD_COUNT} cards</>
          ) : (
            <>{oddsSheetTier.cost} <RingsIcon size={11} color={Colors.textSecondary} /> · {PACK_CARD_COUNT} cards</>
          )
        ) : undefined}
        note={selectedEra && oddsSheetTier && (
          <View style={styles.eraNoteBox}>
            <Text style={styles.eraNoteBoxText}>{eraNoteText(oddsSheetTier, selectedEra)}</Text>
          </View>
        )}
        footer={oddsSheetTier && (
          <View style={styles.sheetBuyRow}>
            <SecondaryButton label="CLOSE" onPress={() => setOddsSheetTierId(null)} style={styles.sheetCloseBtn} />
            <Animated.View style={[styles.sheetBuyBtn, { transform: [{ translateX: sheetBuyShakeX }] }]}>
              <PrimaryButton
                label={<>BUY · {totalCost(oddsSheetTier, selectedEra)} <RingsIcon size={16} color={Colors.bgDark} /></>}
                onPress={() => {
                  if (rings >= totalCost(oddsSheetTier, selectedEra)) handleBuy(oddsSheetTier.id);
                  else shakeSheetBuy();
                }}
              />
            </Animated.View>
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

      {/* My Packs sheet (docs/handoff/19-season-flow-pack-rebalance-shop-
          polish_1.md, section 4) — "See all" beyond WAITING_STRIP_CAP opens
          this instead of navigating into a separate tab; same tile family
          as the strip/shelf (OwnedPackTile), laid out as a scrollable grid.
          Reuses PackOddsSheet's overlay/sheet styles. Wide layout never
          renders this — sidebarCardWide already shows every pending pack. */}
      <Modal visible={packsSheetOpen} transparent animationType="slide" onRequestClose={() => setPacksSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setPacksSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>My Packs</Text>
            <ScrollView contentContainerStyle={styles.tierShelfGrid}>
              {ownedPacks.map((pack: OwnedPack, i) => {
                const tier = findTier(pack.tierId);
                if (!tier) return null;
                return (
                  <FadeInOut key={pack.id} delay={Math.min(i, 10) * 35} translateY={8}>
                    <OwnedPackTile
                      pack={pack}
                      tier={tier}
                      onPress={() => { setPacksSheetOpen(false); openPendingPack(pack.id); }}
                    />
                  </FadeInOut>
                );
              })}
            </ScrollView>
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
  adCardSub: { fontSize: Typography.base, color: Colors.textMuted, fontFamily: Font.secondaryRegular, marginBottom: 12 },
  adCardEarned: {
    fontSize: Typography.sm, color: Colors.gold, fontFamily: Font.primaryBold, marginBottom: 10, letterSpacing: 0.5,
  },
  // alignSelf: 'flex-start' so this hugs its label instead of stretching
  // to the card's full width (adCard's default column/stretch layout).
  adWatchBtn: {
    alignSelf: 'flex-start',
    minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  adWatchBtnDisabled: { backgroundColor: 'transparent', borderColor: Colors.border },
  adWatchBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.lg, letterSpacing: 0.6 },

  adPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(212,160,23,0.14)',
    borderWidth: 1.5, borderColor: Colors.gold, borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: Spacing.lg,
  },
  adPillLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  adPillTextWrap: { flexShrink: 1 },
  adPillText: { color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography.md, letterSpacing: 0.3 },
  adPillChevron: { color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography['2xl'], marginLeft: 8 },

  // Bumped from a small mono eyebrow (xs/textMuted) to a real section
  // title — "BUY A PACK" was reading too quiet relative to the tiles below
  // it. Gold by default (matches this screen's "spend Rings" color
  // language); MY PACKS overrides to green via sectionLabelGreen below.
  sectionLabel: {
    fontSize: Typography.xl, color: Colors.gold, fontFamily: Font.primaryBold,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10,
  },
  sectionLabelGreen: { color: Colors.green },
  // Bordered card wrapping each of BUY A PACK / MY PACKS so the two read as
  // clearly separate sections instead of two headers in one continuous
  // flow. Green border variant mirrors the tiles/OPEN-bar color language
  // used elsewhere on this screen for "already owned" content.
  sectionBlock: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
    padding: 16, marginTop: Spacing.lg,
  },
  sectionBlockGreen: { borderColor: Colors.greenMuted },

  // ── Waiting-to-open strip (docs/handoff/18-shop-pack-shelf-redesign.md
  // section 2) — capped horizontal row of WaitingPackTile, "See all" once
  // WAITING_STRIP_CAP is exceeded. Supersedes doc 15's PendingPacksBanner.
  // Green border (was neutral Colors.border) + green OPEN bar (was gold) —
  // gold is reserved for "spend Rings" actions elsewhere on this screen, so
  // reusing it here made an already-owned pack look like another purchase
  // tile instead of a distinct "ready to open" one.
  waitingStrip: { marginBottom: 4 },
  waitingStripContent: { gap: 10, paddingBottom: 4, paddingRight: 4 },
  // Widened again (92, was 76) to fit the bigger pack-art focal point
  // (WaitingPackTile's PackArt bumped 38 -> 56) — text stays at the earlier
  // mobile-readability-pass sizes (Typography.xs floor).
  waitingTile: {
    width: 92, backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.greenMuted,
    borderRadius: Radius.md, alignItems: 'center', padding: 8, gap: 6,
  },
  waitingTileOpenBar: {
    width: '100%', backgroundColor: Colors.green, borderRadius: Radius.sm,
    paddingVertical: 5, alignItems: 'center',
  },
  waitingTileOpenText: { color: Colors.greenDark, fontFamily: Font.primaryBold, fontSize: Typography.xs, letterSpacing: 0.5 },
  seeAllTile: {
    width: 92, minHeight: 84, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border,
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 3,
  },
  seeAllTileCount: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: Typography.lg },
  seeAllTileText: { color: Colors.textMuted, fontFamily: Font.mono, fontSize: Typography.xs, letterSpacing: 0.3, textAlign: 'center' },

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
  // Matches DynastyHomeScreen/PackOpeningScreen's ringsChip exactly — kept
  // in sync across all three so the balance chip reads consistently
  // wherever it appears.
  ringsChip: {
    borderWidth: 1.5, borderColor: Colors.gold, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  ringsText: { color: Colors.gold, fontSize: Typography.md, fontFamily: Font.primaryBold },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: Spacing.lg },
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, textAlign: 'center' },

  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },

  eraLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 8,
  },
  eraRow: { gap: 8, paddingBottom: 2 },
  // paddingVertical 12 (not SelectablePill's own default 10) + an explicit
  // 44px floor — mobile readability pass: these sat closer to ~38px, under
  // the standard ~44px minimum comfortable tap target.
  eraChip: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  eraNote: { fontSize: Typography.sm, color: Colors.textDim, fontFamily: Font.secondaryRegular, marginTop: 8, lineHeight: 16 },
  eraNoteGold: { color: Colors.gold, fontFamily: Font.secondarySemiBold },

  // ── Pack shelf (docs/handoff/18-shop-pack-shelf-redesign.md section 2)
  // — replaces the old tierList/tierCard stat-card styles. 2-column grid;
  // a lone odd tile (e.g. Legend Pack alone on row 2) centers via
  // justifyContent rather than stretching full-width.
  tierShelfGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 4 },
  // Narrow Store tab's Buy A Pack list — full-width single-column rows
  // (PackTile's `fullWidth` variant) instead of the 2-up grid above, which
  // wide still uses.
  tierShelfStack: { gap: 12, marginTop: 4 },
  packTile: {
    width: '48%', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: 14, alignItems: 'center',
  },
  packTileBody: { width: '100%', alignItems: 'center', gap: 6 },
  packTileName: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: Typography.lg, textAlign: 'center' },
  packTilePrice: { color: Colors.gold, fontFamily: Font.mono, fontSize: Typography.base },
  // minHeight bumped 38 -> 46 (mobile readability pass) — under the ~44px
  // standard minimum comfortable tap target, and this is the tile's one
  // real purchase action.
  packTileBuyBtn: {
    width: '100%', marginTop: 10, minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  packTileBuyBtnDisabled: { backgroundColor: 'transparent', borderColor: Colors.border },
  packTileBuyBtnText: { color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.lg, letterSpacing: 0.5 },

  // PackTile's `fullWidth` row variant (mobile Buy A Pack list) — badge
  // left, name/price stacked left-aligned next to it, Buy button pinned
  // right, instead of the centered-column tile stretched wide with dead
  // space either side of it.
  packTileRow: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: 14,
  },
  packTileRowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  packTileRowText: { flex: 1, alignItems: 'flex-start' },
  packTileRowName: { color: Colors.textPrimary, fontFamily: Font.primaryBold, fontSize: Typography.lg },
  packTileRowPrice: { color: Colors.gold, fontFamily: Font.mono, fontSize: Typography.base, marginTop: 3 },
  packTileRowBuyBtn: {
    width: 108, minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
  },
  // OwnedPackTile only — layered on top of packTile (same card shell as the
  // Buy tiles) to give owned/ready-to-open packs their own green identity
  // instead of reading as a bare variant of the purchase tile next to it.
  ownedPackTile: { borderColor: Colors.greenMuted },
  // OwnedPackTile-only (My Packs tab) — season/source/era-lock metadata
  // PendingPackRow used to show, carried forward beneath the tile.
  packTileMeta: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.mono, marginTop: 6, textAlign: 'center' },
  packTileEraTag: {
    marginTop: 3, borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.sm,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  packTileEraTagText: { fontSize: Typography.sm, color: Colors.gold, fontFamily: Font.mono },

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

  // 3-up on wide (docs/handoff/18-shop-pack-shelf-redesign.md section 4) —
  // same PackTile component as narrow's 2-up shelf, just a wider slice per
  // tile via this style override, not a forked wide-specific tile.
  tierCardWide: { width: '31%' },

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
  sheetTitle: { fontFamily: Font.primaryBold, fontSize: Typography.xl, letterSpacing: 0.5, textAlign: 'center', color: Colors.green },
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
