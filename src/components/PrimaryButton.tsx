import React from 'react';
import { Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// The app's one gold-gradient CTA button — lifted from HomeScreen's Game
// Setup sheet ("Start Game"), which was already duplicated near-verbatim in
// ResultScreen's "Play Again"/"Enter Dynasty". Reused everywhere a primary
// action button is needed instead of forking gradient/color values per
// screen.
export function PrimaryButton({ label, onPress, disabled, style }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={['#A86A05', '#D4A017', '#F0CC50', '#D4A017', '#A86A05']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  button: {
    minHeight: 52, borderRadius: Radius.md, borderWidth: 1, borderColor: '#F5DC7A',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  label: {
    color: Colors.bgDark, fontSize: Typography.xl, fontFamily: Font.primaryBold, letterSpacing: 1,
  },
});
