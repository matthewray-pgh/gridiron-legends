import React from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { usePressScale } from '../hooks/useAnimations';

interface CallSheetPillProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  tag?: string;
  accentColor?: string;
  onPress: () => void;
}

// Narrow-viewport call sheet row — brought up to the same icon+description
// richness as the wide grid's <ModeCard> (doc 04 point 3) instead of a bare
// title/tag pill, so mobile isn't a stripped-down read of desktop. Still a
// single-column stacked row (not ModeCard's 3-up grid), just taller now
// that there's a description line to carry.
export function CallSheetPill({ icon, title, description, tag, accentColor = Colors.steel, onPress }: CallSheetPillProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.8}>
      <Animated.View style={[styles.pill, { borderLeftColor: accentColor, transform: [{ scale }] }]}>
        <MaterialCommunityIcons name={icon} size={28} color={accentColor} style={styles.icon} />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            {!!tag && <Text style={[styles.tag, { color: accentColor }]}>{tag}</Text>}
          </View>
          <Text style={styles.description}>{description}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  icon: { marginTop: 2 },
  body: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: Font.primaryBold,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  tag: {
    fontSize: Typography.xs,
    fontFamily: Font.secondarySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    marginTop: 3,
    fontSize: Typography.md,
    color: Colors.textMuted,
    fontFamily: Font.secondaryRegular,
    lineHeight: 20,
  },
});
