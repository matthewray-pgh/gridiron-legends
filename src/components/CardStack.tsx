import React, { useState } from 'react';
import {
  NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { Colors, Radius, Spacing } from '../theme/colors';
import { PackPlayerCard, RARITY_COLOR } from './PackPlayerCard';
import { PackPullResult } from '../store/dynastyStore';

const CARD_GAP = 20;
const WIDTH_RATIO = 0.74;
const MAX_CARD_WIDTH = 320;
const HEIGHT_RATIO = 1.45;

interface CardStackProps {
  pulls: PackPullResult[];
  checked: Record<number, boolean>;
  onToggle: (index: number) => void;
}

// Fixed per-depth transform for the decorative "shuffled behind" ghost
// cards — not randomized, so the fan reads as an intentional deck rather
// than jittering as activeIndex changes.
const GHOST_TRANSFORMS: { rotate: string; translateX: number; translateY: number; scale: number }[] = [
  { rotate: '-5deg', translateX: -8, translateY: 8, scale: 0.96 },
  { rotate: '6deg', translateX: 10, translateY: 12, scale: 0.93 },
];

// Card-opening reveal, used at every screen width (confirmed with the
// user — no separate wide/desktop layout anymore). The front card rides a
// real horizontal snap-scrolling ScrollView (same swipe-to-browse +
// tap-to-select mechanics as before); the "shuffled deck" look is a
// separate, non-interactive decorative layer behind it showing the next
// couple of upcoming pulls as rotated, rarity-tinted card silhouettes.
// Every pull's rarity is already known up front (openPack() reveals the
// whole pack in one call before this screen renders), so tinting the
// ghosts by real rarity isn't a spoiler.
export function CardStack({ pulls, checked, onToggle }: CardStackProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = Math.min(width * WIDTH_RATIO, MAX_CARD_WIDTH);
  const cardHeight = cardWidth * HEIGHT_RATIO;
  const snapInterval = cardWidth + CARD_GAP;
  // The stack's own container is capped to roughly "one card + ghost peek
  // room" and centered — not the full screen width. Without this, wide
  // viewports are wider than a single card, so the ScrollView (which spans
  // its container) would render two+ real cards side by side at once
  // instead of just the front card with the ghost stack behind it.
  const stackWidth = Math.min(width, cardWidth + CARD_GAP + Spacing.lg * 4);
  const sidePadding = Math.max((stackWidth - cardWidth) / 2, Spacing.lg);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(Math.max(0, Math.min(index, pulls.length - 1)));
  }

  const upcoming = [pulls[activeIndex + 1], pulls[activeIndex + 2]];

  return (
    <View style={[styles.wrap, { width: stackWidth, height: cardHeight }]}>
      <View style={[styles.ghostLayer, { width: cardWidth, height: cardHeight, marginLeft: -cardWidth / 2 }]} pointerEvents="none">
        {upcoming.map((card, i) => {
          if (!card) return null;
          const t = GHOST_TRANSFORMS[i];
          return (
            <View
              key={i}
              style={[
                styles.ghostCard,
                {
                  width: cardWidth, height: cardHeight,
                  borderColor: RARITY_COLOR[card.rarity],
                  zIndex: -i,
                  transform: [
                    { translateX: t.translateX },
                    { translateY: t.translateY },
                    { rotate: t.rotate },
                    { scale: t.scale },
                  ],
                },
              ]}
            />
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={32}
        style={[styles.scroll, { height: cardHeight }]}
        contentContainerStyle={[styles.row, { paddingHorizontal: sidePadding }]}
      >
        {pulls.map((card, i) => (
          <View key={i} style={{ width: cardWidth, marginRight: CARD_GAP }}>
            <PackPlayerCard
              card={card}
              width={cardWidth}
              selected={!!checked[i]}
              onPress={card.duplicate ? undefined : () => onToggle(i)}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {pulls.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'center', position: 'relative' },
  ghostLayer: { position: 'absolute', top: 0, left: '50%' },
  ghostCard: {
    position: 'absolute', top: 0, left: 0, borderRadius: Radius.lg, borderWidth: 2,
    backgroundColor: Colors.bgCardDeep,
  },
  scroll: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dots: {
    position: 'absolute', bottom: -22, flexDirection: 'row', justifyContent: 'center', gap: 6, alignSelf: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.gold, width: 16 },
});
