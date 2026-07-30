import React from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { usePressScale } from '../hooks/useAnimations';

interface ModeCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  tag?: string;
  accentColor?: string;
  onPress: () => void;
}

// Wide-viewport grid card (doc 04 point 3) — richer than the narrow
// <CallSheetPill>, with room for a one-line description. Not a replacement
// for CallSheetPill, which mobile keeps using. Sized for 3 side-by-side
// (Classic / Offense Only / Two-Minute Drill, with Challenge currently
// pulled per LEADERBOARD_ENABLED) — flexBasis leaves headroom for the
// modeGrid gap the same way the old 2-column '48%' did, so re-enabling a
// 4th card wraps to 2+2 instead of breaking the row.
export function ModeCard({ icon, title, description, tag, accentColor = Colors.steel, onPress }: ModeCardProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.85}
      style={styles.touchable}
    >
      <Animated.View style={[styles.card, { borderTopColor: accentColor, transform: [{ scale }] }]}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name={icon} size={30} color={accentColor} />
          {!!tag && <Text style={[styles.tag, { color: accentColor }]}>{tag}</Text>}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flexBasis: '31%',
    alignSelf: 'stretch',
  },
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 3,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tag: {
    fontSize: Typography.xs,
    fontFamily: Font.secondarySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  description: {
    fontSize: Typography.md,
    color: Colors.textMuted,
    fontFamily: Font.secondaryRegular,
    lineHeight: 20,
  },
});
