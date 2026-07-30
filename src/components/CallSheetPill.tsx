import React from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { usePressScale } from '../hooks/useAnimations';

interface CallSheetPillProps {
  title: string;
  tag?: string;
  accentColor?: string;
  onPress: () => void;
}

export function CallSheetPill({ title, tag, accentColor = Colors.steel, onPress }: CallSheetPillProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.8}>
      <Animated.View style={[styles.pill, { borderLeftColor: accentColor, transform: [{ scale }] }]}>
        <Text style={styles.title}>{title}</Text>
        {!!tag && <Text style={styles.tag}>{tag}</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    flex: 1,
    fontFamily: Font.primaryBold,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  tag: {
    fontFamily: Font.secondaryRegular,
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});
