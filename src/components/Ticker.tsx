import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Colors, Font, Typography } from '../theme/colors';

// Speed, not duration, is fixed — a fixed duration would make longer content
// scroll faster than shorter content. Not specified anywhere in the handoff
// docs; this is a tunable eyeball default, not a game-balance number.
const TICKER_SPEED_PX_PER_SEC = 60;
const TICKER_SEPARATOR = '   •   ';

interface TickerProps {
  items: string[];
}

export function Ticker({ items }: TickerProps) {
  const baseContent = items.join(TICKER_SEPARATOR) + TICKER_SEPARATOR;

  const [containerWidth, setContainerWidth] = useState(0);
  const [baseWidth, setBaseWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useSharedValue(0);

  // A single copy of the (short) stats string is often much narrower than
  // a wide desktop viewport — duplicating it just once left a dead gold
  // gap before the loop wrapped. Repeat it enough times to fill the
  // container so the two duplicated copies always overlap seamlessly,
  // regardless of viewport width.
  const repeatCount = containerWidth > 0 && baseWidth > 0
    ? Math.max(1, Math.ceil(containerWidth / baseWidth))
    : 1;
  const content = baseContent.repeat(repeatCount);

  function handleContainerLayout(e: LayoutChangeEvent) {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 0.5) {
      setContainerWidth(width);
    }
  }

  function handleBaseLayout(e: LayoutChangeEvent) {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - baseWidth) > 0.5) {
      setBaseWidth(width);
    }
  }

  function handleContentLayout(e: LayoutChangeEvent) {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - contentWidth) > 0.5) {
      setContentWidth(width);
    }
  }

  useEffect(() => {
    if (contentWidth <= 0) return;
    translateX.value = 0;
    const durationMs = (contentWidth / TICKER_SPEED_PX_PER_SEC) * 1000;
    translateX.value = withRepeat(
      withTiming(-contentWidth, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(translateX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.wrap} onLayout={handleContainerLayout}>
      {/* Off-screen probe — measures a single copy of the stats string so
          we know how many times to repeat it to fill the container. */}
      <Text style={[styles.text, styles.probe]} onLayout={handleBaseLayout}>{baseContent}</Text>

      <Animated.View style={[styles.track, animatedStyle]}>
        <Text style={styles.text} onLayout={handleContentLayout}>{content}</Text>
        <Text style={styles.text}>{content}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.gold,
    paddingVertical: 5,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  track: {
    flexDirection: 'row',
  },
  text: {
    flexShrink: 0,
    color: Colors.tickerText,
    fontFamily: Font.monoBold,
    fontSize: Typography.sm,
    letterSpacing: 0.5,
  },
  probe: {
    position: 'absolute',
    opacity: 0,
  },
});
