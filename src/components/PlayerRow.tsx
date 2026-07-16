import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface PlayerRowProps {
  position: string;
  name: string;
  meta: string;
  selected?: boolean;
  onPress?: () => void;
  // Arbitrary right-side content — stat chips on GameScreen's draft list,
  // OVR + action links on Dynasty's roster tab. Kept generic here rather
  // than forking the row shell per screen.
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Shared player-listing row — originally GameScreen.tsx's draft candidate
// row, extracted so other player lists (Dynasty's roster tab) use the same
// shell instead of a bespoke look per screen. Position badge + name/meta on
// the left, `right` slot for whatever the caller needs. Not pressable when
// `onPress` is omitted (Dynasty's rows put their own buttons in `right`
// instead of making the whole row tappable).
export function PlayerRow({ position, name, meta, selected, onPress, right, style }: PlayerRowProps) {
  return (
    <TouchableOpacity
      style={[styles.rowCard, selected && styles.rowCardSelected, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.9}
    >
      <View style={styles.rowLeft}>
        <View style={styles.posBadge}>
          <Text style={styles.posBadgeText}>{position}</Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
          <Text style={styles.playerMeta} numberOfLines={1}>{meta}</Text>
        </View>
      </View>
      {right}
    </TouchableOpacity>
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
  rowCardSelected: {
    borderColor: Colors.gold,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  nameWrap: { flexShrink: 1 },
  posBadge: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  posBadgeText: {
    color: Colors.textSecondary,
    fontSize: Typography.xl,
    fontWeight: '700',
    fontFamily: Font.primaryBold,
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: Typography['2xl'],
    fontFamily: Font.primaryBold,
  },
  playerMeta: {
    color: Colors.textDim,
    fontSize: Typography.lg,
    fontFamily: Font.secondaryRegular,
    marginTop: 2,
  },
});
