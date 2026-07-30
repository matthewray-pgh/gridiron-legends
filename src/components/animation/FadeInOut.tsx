import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface FadeInOutProps {
  // Defaults to true (fade in on mount) — pass a caller-owned boolean to
  // also fade the content back out (and only then unmount it) when it
  // flips false, instead of the parent's own conditional yanking it away
  // instantly.
  visible?: boolean;
  // Stagger a list by passing `delay={i * 40}` per item — only applies to
  // the fade-in direction.
  delay?: number;
  duration?: number;
  // Slide distance (px) the content travels in from/out to while fading.
  translateY?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// General-purpose fade(+slide) primitive built on plain RN Animated,
// matching PackRevealSequence.tsx/PackPlayerCard.tsx's existing convention
// rather than reaching for reanimated. Pass a changing `key` from the
// caller to re-trigger the mount fade-in on data changes (e.g.
// `key={selectedPlayer?.id}` to cross-fade a detail panel's content).
export function FadeInOut({ visible = true, delay = 0, duration = 240, translateY = 0, style, children }: FadeInOutProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(progress, {
        toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0, duration, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }).start(({ finished }) => { if (finished) setRendered(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!rendered) return null;

  const translateYAnim = progress.interpolate({ inputRange: [0, 1], outputRange: [translateY, 0] });
  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: translateYAnim }] }]}>
      {children}
    </Animated.View>
  );
}
