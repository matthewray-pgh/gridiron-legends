// AdMob wiring for the Rewarded ad placements (ShopScreen's "Watch Reward
// Ad", ResultScreen's season-end pack upgrade) — real react-native-google-
// mobile-ads SDK, but pinned to Google's own public TEST ad unit IDs
// (documented at https://developers.google.com/admob/android/test-ads and
// .../ios/test-ads) rather than a real AdMob account's IDs. These test IDs
// always serve a fill (no real inventory/policy risk) and are safe to ship
// in a dev/test build.
//
// TODO_BALANCE: swap AD_UNIT_ID for this app's real AdMob rewarded ad unit
// ID (and app.json's androidAppId/iosAppId for the real app IDs) before any
// production release — that's an AdMob-console step for whoever owns the
// account, not something to guess at here.
import { Platform } from 'react-native';
import type * as GoogleMobileAds from 'react-native-google-mobile-ads';

// Native-only — react-native-google-mobile-ads has no web implementation,
// so nothing is allowed to import it at module scope (the `import type`
// above is compile-time-only and carries no runtime cost either way).
export const ADMOB_SUPPORTED_PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android';

export const ADMOB_TEST_REWARDED_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
  default: '',
});

// Single guarded `require` shared by App.tsx (SDK init) and
// useRewardedAd.ts (loading/showing the actual ad) — `require`d at most
// once regardless of how many files import this, and only ever on native.
export const googleMobileAds: typeof GoogleMobileAds | null = ADMOB_SUPPORTED_PLATFORM
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ? require('react-native-google-mobile-ads')
  : null;
