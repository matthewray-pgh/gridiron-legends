import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';

interface ModeCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  tag?: string;
  accentColor?: string;
  onPress: () => void;
}

// Wide-viewport 2x2 grid card (doc 04 point 3) — richer than the narrow
// <CallSheetPill>, with room for a one-line description. Not a replacement
// for CallSheetPill, which mobile keeps using.
export function ModeCard({ icon, title, description, tag, accentColor = Colors.steel, onPress }: ModeCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderTopColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name={icon} size={22} color={accentColor} />
        {!!tag && <Text style={[styles.tag, { color: accentColor }]}>{tag}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 3,
    borderRadius: Radius.sharp,
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
    fontFamily: Font.mono,
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
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontFamily: Font.mono,
    lineHeight: 18,
  },
});
