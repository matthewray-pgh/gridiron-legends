import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '../theme/colors';

interface RingsIconProps {
  size?: number;
  color?: string;
}

// Vector replacement for the 💍 emoji previously used everywhere the Rings
// currency is displayed (confirmed with the user) — a diamond-ring emoji
// reads as jewelry, not the Super Bowl-rings/championship theme the
// currency is named after, and emoji glyphs render inconsistently across
// platforms/fonts. @expo/vector-icons renders its icons as plain RN <Text>
// under the hood, so this nests inline inside surrounding <Text> content
// exactly like the emoji character it replaces (e.g. `{rings} <RingsIcon
// size={12} />`) — no layout restructuring needed at call sites.
export function RingsIcon({ size = 14, color = Colors.gold }: RingsIconProps) {
  return <MaterialCommunityIcons name="trophy-variant" size={size} color={color} />;
}
