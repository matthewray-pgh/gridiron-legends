import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';

interface TopNavProps {
  dynastyLevel: number;
  rings: number;
  onDynastyPress: () => void;
  onLeaderboardPress: () => void;
  onSettingsPress: () => void;
}

// Wide-viewport-only persistent nav, scoped to HomeScreen (doc 04's
// "local to HomeScreen, not a shared shell" decision) — replaces the
// reflowed mobile header at WIDE_BREAKPOINT and up.
export function TopNav({ dynastyLevel, rings, onDynastyPress, onLeaderboardPress, onSettingsPress }: TopNavProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>UNDEFEATED</Text>

      <View style={styles.links}>
        <Text style={[styles.link, styles.linkActive]}>Home</Text>
        <TouchableOpacity onPress={onDynastyPress}>
          <Text style={styles.link}>Dynasty</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLeaderboardPress}>
          <Text style={styles.link}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <View style={styles.ringsChip}>
          <Text style={styles.ringsValue}>{rings}</Text>
          <Text style={styles.ringsLabel}>rings · lvl {dynastyLevel}</Text>
        </View>

        <TouchableOpacity
          style={styles.gearBtn}
          onPress={onSettingsPress}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.gearIcon}>⚙</Text>
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  logo: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: Font.primaryBold,
    letterSpacing: 1.5,
  },
  links: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  link: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    fontFamily: Font.mono,
    letterSpacing: 0.5,
  },
  linkActive: {
    color: Colors.gold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ringsChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sharp,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ringsValue: {
    fontSize: Typography.md,
    color: Colors.gold,
    fontFamily: Font.monoBold,
  },
  ringsLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontFamily: Font.mono,
    textTransform: 'uppercase',
  },
  gearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.steel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 14,
    color: Colors.steel,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontFamily: Font.primaryBold,
  },
});
