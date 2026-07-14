import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../theme/colors';
import { DYNASTY_ENABLED } from '../config/featureFlags';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOGO = require('../../assets/undefeated-gridiron-legends-header.png');
const LOGO_ASPECT_RATIO = 1398 / 375;
const LOGO_HEIGHT = 40;
const ICON_BTN_SIZE = 44;

// App-wide persistent nav shell (docs/handoff/04-web-home-layout.md, point 1,
// RESOLVED). Renders on every screen at every viewport width via
// AppNavigator's screenOptions.header — not scoped to HomeScreen and not
// gated on isWide, replacing the old Home-only, wide-only <TopNav />.
// Deliberately minimal: logo (always links Home) + 2 icon-only shortcuts
// (Leaderboard, Dynasty) — not the mockup's full text-link nav, which would
// fight the app's hub-and-spoke shape (Home → mode → play → Result → Home).
export function AppShell() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const onHome = routeName === 'Home';

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
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Leaderboard')}
          disabled={routeName === 'Leaderboard'}
          accessibilityLabel="Leaderboard"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.icon, routeName === 'Leaderboard' && styles.iconActive]}>🏆</Text>
        </TouchableOpacity>

        {DYNASTY_ENABLED && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('DynastyHome')}
            disabled={routeName === 'DynastyHome'}
            accessibilityLabel="Dynasty"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.icon, routeName === 'DynastyHome' && styles.iconActive]}>👑</Text>
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
  icon: {
    fontSize: 20,
    opacity: 0.75,
  },
  iconActive: {
    opacity: 1,
  },
});
