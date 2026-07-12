import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface SelectablePillProps {
  label: string;
  selected?: boolean;
  /** Distinct "already complete" success state (e.g. a filled roster slot) — a third tone beyond selected/unselected. */
  filled?: boolean;
  disabled?: boolean;
  showCheck?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SelectablePill({ label, selected, filled, disabled, showCheck, onPress, style }: SelectablePillProps) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected, filled && styles.pillFilled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[styles.text, selected && styles.textSelected, filled && styles.textFilled]}>{label}</Text>
      {selected && showCheck && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bgCardDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    borderColor: Colors.gold,
    backgroundColor: '#2A210F',
  },
  pillFilled: {
    borderColor: Colors.green,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: Typography.lg,
    fontFamily: Font.primaryMedium,
    letterSpacing: 0.9,
  },
  textSelected: { color: Colors.gold, fontFamily: Font.primaryBold },
  textFilled: { color: Colors.green, fontFamily: Font.primaryBold },
  checkBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: Colors.bgDark,
    fontSize: 12,
    lineHeight: 14,
    fontFamily: Font.secondaryBold,
  },
});
