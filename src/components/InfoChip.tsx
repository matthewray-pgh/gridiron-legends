import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface InfoChipProps {
  label: string;
  value: string;
  /** Border color; also used as the label color unless labelColor is given. Defaults to the subtle low-contrast border used for non-emphasized chips. */
  accentColor?: string;
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function InfoChip({ label, value, accentColor = Colors.borderMid, labelColor, style }: InfoChipProps) {
  return (
    <View style={[styles.chip, { borderColor: accentColor }, style]}>
      <Text style={[styles.label, { color: labelColor ?? accentColor }]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 82,
  },
  label: {
    fontSize: Typography.md,
    fontFamily: Font.primarySemiBold,
    letterSpacing: 1,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: Typography['2xl'],
    fontFamily: Font.primaryBold,
    fontWeight: '800',
  },
});
