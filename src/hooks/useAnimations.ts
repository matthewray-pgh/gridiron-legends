import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// Scale-on-press feedback shared by every tappable surface (buttons, mode
// cards, pills) — wire onPressIn/onPressOut to the Touchable and wrap the
// pressed content in `<Animated.View style={{ transform: [{ scale }] }}>`.
export function usePressScale(scaleTo = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

// Animates a displayed integer counting toward `value` whenever it changes
// after the initial mount — the first render shows the final value
// immediately rather than counting up from zero on every screen focus.
export function useCountUp(value: number, duration = 500) {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      // Listener needs the interpolated JS value each frame — unsupported
      // on the native driver.
      useNativeDriver: false,
    }).start(() => anim.removeListener(id));
    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

// Holds the last non-null value seen — for content that fades out via
// FadeInOut's `visible` toggle: the source value often flips to null the
// instant the fade-out starts (e.g. a reward banner's setTimeout), which
// would otherwise leave the text reading "null" for the fade's duration.
export function useLastNonNull<T>(value: T | null): T | null {
  const [last, setLast] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) setLast(value);
  }, [value]);
  return last;
}

// Pops the Rings/trophies chip whenever its value goes up (a reward landed)
// — a spring overshoot past scaleTo then settling back to 1, with a
// temporarily elevated zIndex for the duration of the bounce so the chip
// pops visually above its toolbar neighbors while it's larger than its own
// box, instead of getting clipped/underlapped by whatever paints after it.
// Ignores decreases (spending Rings) — only "added" should bounce.
export function useBounceOnIncrease(value: number, scaleTo = 1.35) {
  const scale = useRef(new Animated.Value(1)).current;
  const [elevated, setElevated] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value > prevValue.current) {
      setElevated(true);
      Animated.sequence([
        Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 30, bounciness: 18 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }),
      ]).start(() => setElevated(false));
    }
    prevValue.current = value;
  }, [value, scale, scaleTo]);

  return { scale, zIndex: elevated ? 20 : 0 };
}

// One-shot horizontal shake — signals a rejected action (e.g. tapping Buy
// without enough Rings) without needing a modal or toast.
export function useShake() {
  const value = useRef(new Animated.Value(0)).current;
  function shake() {
    value.setValue(0);
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -0.6, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }
  const translateX = value.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });
  return { translateX, shake };
}
