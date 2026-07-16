import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  // Small numeric badge in the top-right corner — e.g. an owned-pack count.
  // Omitted (or 0) renders no badge.
  badge?: number;
  // Override the label color — e.g. Colors.loss for a destructive action
  // (Reset Dynasty) that still needs the shared button shell/sizing.
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

// The app's one dark-bordered secondary button — lifted from HomeScreen's
// Game Setup sheet ("Cancel"). Reused anywhere a button needs to read as
// the non-primary option next to a PrimaryButton (Share, Close, Cancel,
// secondary CTAs with a count badge) instead of forking bg/border colors
// per screen.
export function SecondaryButton({ label, onPress, disabled, badge, labelColor, style }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[styles.button, disabled && styles.disabled, style]}
    >
      <Text style={[styles.label, labelColor && { color: labelColor }]} numberOfLines={1}>{label}</Text>
      {typeof badge === 'number' && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52, backgroundColor: '#121A24', borderRadius: Radius.md, borderWidth: 1, borderColor: '#3A4754',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, position: 'relative',
  },
  disabled: { opacity: 0.45 },
  label: { color: Colors.textSecondary, fontSize: Typography.lg, fontFamily: Font.primaryBold, letterSpacing: 1 },
  badge: {
    position: 'absolute', top: -6, right: -6, backgroundColor: Colors.gold, borderRadius: Radius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: Colors.bgDark, fontSize: Typography.xs, fontFamily: Font.secondaryBold },
});
