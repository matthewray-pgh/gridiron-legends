import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface CallSheetPillProps {
  title: string;
  tag?: string;
  accentColor?: string;
  onPress: () => void;
}

export function CallSheetPill({ title, tag, accentColor = Colors.steel, onPress }: CallSheetPillProps) {
  return (
    <TouchableOpacity
      style={[styles.pill, { borderLeftColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.title}>{title}</Text>
      {!!tag && <Text style={styles.tag}>{tag}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderLeftWidth: 3,
    borderRadius: Radius.sharp,
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
    fontFamily: Font.mono,
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});
