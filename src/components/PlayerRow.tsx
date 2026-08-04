import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Font, Radius, Typography } from '../theme/colors';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PlayerRowProps {
  position: string;
  name: string;
  meta: string;
  // Temporary, testing-only (docs/handoff/09-ovr-visibility-reversal.md) —
  // gold, inline after the name, one Typography step larger. Callers gate
  // this behind SHOW_DEBUG_OVR themselves (pass undefined when off) rather
  // than PlayerRow checking the flag itself, matching how `right` content
  // like PlayerRowStats is already toggled per-caller (e.g. GameScreen's
  // `showStats`).
  ovr?: number;
  // docs/handoff/21-economy-balance-signoff.md section 8 — Two-Minute
  // Drill's "both locks hit" draft suggestion. A star, never the rating
  // number itself — OVR stays an earned reveal, not a baseline display,
  // same rule ovr? above already follows.
  suggested?: boolean;
  selected?: boolean;
  onPress?: () => void;
  // Arbitrary right-side content — stat chips on GameScreen's draft list,
  // OVR + action links on Dynasty's roster tab. Kept generic here rather
  // than forking the row shell per screen.
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Shared player-listing row — originally GameScreen.tsx's draft candidate
// row, extracted so other player lists (Dynasty's roster tab) use the same
// shell instead of a bespoke look per screen. Position badge + name/meta on
// the left, `right` slot for whatever the caller needs. Not pressable when
// `onPress` is omitted (Dynasty's rows put their own buttons in `right`
// instead of making the whole row tappable).
export function PlayerRow({ position, name, meta, ovr, suggested, selected, onPress, right, style, testID }: PlayerRowProps) {
  const selectedAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selectedAnim, {
      toValue: selected ? 1 : 0,
      duration: 180,
      // borderColor interpolation isn't supported on the native driver.
      useNativeDriver: false,
    }).start();
  }, [selected, selectedAnim]);

  const borderColor = selectedAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.border, Colors.gold] });

  return (
    <AnimatedTouchable
      style={[styles.rowCard, { borderColor }, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.9}
      testID={testID}
    >
      <View style={styles.rowLeft}>
        <View style={styles.posBadge}>
          <Text style={styles.posBadgeText} numberOfLines={1}>{position}</Text>
        </View>
        <View style={styles.nameWrap}>
          <View style={styles.nameLine}>
            {suggested && <MaterialCommunityIcons name="star" size={16} color={Colors.gold} />}
            <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
            {ovr != null && <Text style={styles.debugOvr}>{ovr}</Text>}
          </View>
          <Text style={styles.playerMeta} numberOfLines={1}>{meta}</Text>
        </View>
      </View>
      {right}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    backgroundColor: Colors.bgCardDeep,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  nameWrap: { flexShrink: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  debugOvr: {
    color: Colors.gold,
    fontSize: Typography['2xl'],
    fontFamily: Font.primaryBold,
  },
  posBadge: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posBadgeText: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    fontWeight: '700',
    fontFamily: Font.primaryBold,
    letterSpacing: 0.3,
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontFamily: Font.primaryBold,
    flexShrink: 1,
  },
  playerMeta: {
    color: Colors.textDim,
    fontSize: Typography.base,
    fontFamily: Font.secondaryRegular,
    marginTop: 2,
  },
});
