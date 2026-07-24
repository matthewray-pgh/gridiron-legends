import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Spacing } from '../theme/colors';
import { PackPullResult } from '../store/dynastyStore';
import { PackPlayerCard } from './PackPlayerCard';

const COLUMNS = 3;
const GRID_GAP = 10;
const MAX_CARD_WIDTH = 140;
const MAX_GRID_WIDTH = 480;

interface PackPullGridProps {
  pulls: PackPullResult[];
  checked: Record<number, boolean>;
  onToggle: (index: number) => void;
}

// Replaces CardStack.tsx's one-card-at-a-time swipe carousel (docs/handoff/
// 17-pack-reveal-grid-layout.md) — every pulled card visible at once, no
// scrolling needed to review a pack. 3 columns fits today's PACK_CARD_COUNT
// of 4 at 2 rows-worth of height, or a possible future bump to 6 at exactly
// 2 full rows, without a second layout pass.
export function PackPullGrid({ pulls, checked, onToggle }: PackPullGridProps) {
  const { width: winWidth } = useWindowDimensions();
  const gridWidth = Math.min(winWidth - Spacing.lg * 2, MAX_GRID_WIDTH);
  const cardWidth = Math.min((gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS, MAX_CARD_WIDTH);

  return (
    <View style={[styles.grid, { width: gridWidth }]}>
      {pulls.map((card, i) => (
        <PackPlayerCard
          key={i}
          card={card}
          width={cardWidth}
          selected={!!checked[i]}
          onPress={card.duplicate ? undefined : () => onToggle(i)}
          compact
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP,
    justifyContent: 'center', alignSelf: 'center',
  },
});
