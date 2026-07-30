import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';
import { usePressScale } from '../hooks/useAnimations';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
  const { scale: pressScale, onPressIn, onPressOut } = usePressScale(0.94);
  const fillPulse = useRef(new Animated.Value(1)).current;
  const wasFilled = useRef(filled);

  // 0 = default, 1 = selected, 2 = filled — a single index lets border/bg
  // interpolate smoothly across all three tones instead of snapping.
  const stateIndex = filled ? 2 : selected ? 1 : 0;
  const stateAnim = useRef(new Animated.Value(stateIndex)).current;

  useEffect(() => {
    Animated.timing(stateAnim, { toValue: stateIndex, duration: 180, useNativeDriver: false }).start();
  }, [stateIndex, stateAnim]);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      Animated.sequence([
        Animated.spring(fillPulse, { toValue: 1.15, useNativeDriver: true, speed: 40, bounciness: 10 }),
        Animated.spring(fillPulse, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();
    }
    wasFilled.current = filled;
  }, [filled, fillPulse]);

  const borderColor = stateAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [Colors.borderMid, Colors.gold, Colors.green] });
  const backgroundColor = stateAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [Colors.bgCardDeep, '#2A210F', Colors.bgCardDeep] });

  return (
    <AnimatedTouchable
      style={[styles.pill, { borderColor, backgroundColor, transform: [{ scale: Animated.multiply(pressScale, fillPulse) }] }, style]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[styles.text, selected && styles.textSelected, filled && styles.textFilled]}>{label}</Text>
      {selected && showCheck && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </AnimatedTouchable>
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
