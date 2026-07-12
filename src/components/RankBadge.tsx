import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Typography } from '../theme/colors';

const RANK_COLORS = [Colors.gold, Colors.silver, Colors.bronze];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const isTop3 = rank >= 1 && rank <= 3;

  return (
    <View
      style={[
        styles.circle,
        { backgroundColor: isTop3 ? RANK_COLORS[rank - 1] + '33' : Colors.bgPrimary },
      ]}
    >
      <Text style={[styles.text, { color: isTop3 ? RANK_COLORS[rank - 1] : Colors.textDim }]}>
        {isTop3 ? RANK_MEDALS[rank - 1] : rank}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: Typography.md,
    fontFamily: Font.primaryBold,
  },
});
