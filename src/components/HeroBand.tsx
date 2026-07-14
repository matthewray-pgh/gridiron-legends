import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { BrandBackground } from './BrandBackground';

interface HeroBandProps {
  onPlayPress: () => void;
  onViewRulesPress: () => void;
}

// Wide-viewport hero — doc 04 point 2. Always shows "Today's Challenge"
// at this breakpoint (the continue-run/daily-challenge priority swap from
// doc 01 only applies below WIDE_BREAKPOINT; see HomeScreen for the split).
export function HeroBand({ onPlayPress, onViewRulesPress }: HeroBandProps) {
  return (
    <BrandBackground variant="header" style={styles.wrap}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>TODAY'S CHALLENGE</Text>
        <Text style={styles.title}>DAILY ROSTER BUILD</Text>
        <Text style={styles.status}>RESETS --:--:--</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.playBtn} onPress={onPlayPress} activeOpacity={0.85}>
            <Text style={styles.playBtnText}>PLAY NOW</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewRulesPress} activeOpacity={0.7}>
            <Text style={styles.rulesLink}>View rules</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.sharp,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    minHeight: 260,
    justifyContent: 'flex-end',
  },
  content: {
    padding: Spacing['2xl'],
  },
  eyebrow: {
    fontSize: Typography.sm,
    color: Colors.gold,
    fontFamily: Font.mono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 44,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  status: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  playBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.sharp,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  playBtnText: {
    fontSize: Typography.lg,
    color: Colors.bgDark,
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
  },
  rulesLink: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    textDecorationLine: 'underline',
  },
});
