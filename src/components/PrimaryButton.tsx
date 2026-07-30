import React from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { usePressScale } from '../hooks/useAnimations';

interface PrimaryButtonProps {
  // ReactNode (not just string) so a label can embed an inline icon (e.g.
  // <RingsIcon />) — @expo/vector-icons renders its icons as plain RN Text
  // under the hood, so they nest fine inside this component's own <Text>.
  label: React.ReactNode;
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
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[disabled && styles.disabled, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={['#A86A05', '#D4A017', '#F0CC50', '#D4A017', '#A86A05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      </Animated.View>
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
