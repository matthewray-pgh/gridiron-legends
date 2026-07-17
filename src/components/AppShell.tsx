import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../theme/colors';
import { DYNASTY_ENABLED, LEADERBOARD_ENABLED } from '../config/featureFlags';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Screens that are all "inside" Dynasty mode for the purposes of the crown
// shortcut's active state — not just the DynastyHome route itself. Without
// this, the crown lit gold on DynastyHome but silently reverted to the
// default muted color on PackOpening/HallOfFame, even though the user was
// still navigating within Dynasty — visually inconsistent across screens
// that are all part of the same section.
const DYNASTY_ROUTE_NAMES: (keyof RootStackParamList)[] = ['DynastyHome', 'Shop', 'PackOpening', 'HallOfFame'];

const LOGO = require('../../assets/undefeated-gridiron-legends-header.png');
const LOGO_ASPECT_RATIO = 1398 / 375;
const LOGO_HEIGHT = 40;
const ICON_BTN_SIZE = 44;

// App-wide persistent nav shell (docs/handoff/04-web-home-layout.md, point 1,
// RESOLVED). Renders on every screen at every viewport width via
// AppNavigator's screenOptions.header — not scoped to HomeScreen and not
// gated on isWide, replacing the old Home-only, wide-only <TopNav />.
// Deliberately minimal: logo (always links Home) + icon-only shortcuts
// (Leaderboard, Dynasty — each independently gated by its feature flag, see
// config/featureFlags.ts) — not the mockup's full text-link nav, which would
// fight the app's hub-and-spoke shape (Home → mode → play → Result → Home).
export function AppShell() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const onHome = routeName === 'Home';
  const inDynastySection = routeName != null && DYNASTY_ROUTE_NAMES.includes(routeName as keyof RootStackParamList);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        onPress={() => !onHome && navigation.navigate('Home')}
        disabled={onHome}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Undefeated Gridiron Legends"
        />
      </TouchableOpacity>

      <View style={styles.shortcuts}>
        {LEADERBOARD_ENABLED && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Leaderboard')}
            disabled={routeName === 'Leaderboard'}
            accessibilityLabel="Leaderboard"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="podium"
              size={20}
              color={routeName === 'Leaderboard' ? Colors.gold : Colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {DYNASTY_ENABLED && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('DynastyHome')}
            disabled={routeName === 'DynastyHome'}
            accessibilityLabel="Dynasty"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="crown"
              size={20}
              color={inDynastySection ? Colors.gold : Colors.textMuted}
            />
          </TouchableOpacity>
        )}
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
    paddingBottom: 12,
    backgroundColor: Colors.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_ASPECT_RATIO,
  },
  shortcuts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBtn: {
    width: ICON_BTN_SIZE,
    height: ICON_BTN_SIZE,
    borderRadius: ICON_BTN_SIZE / 2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
