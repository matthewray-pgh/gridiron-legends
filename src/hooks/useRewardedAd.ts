import { useCallback, useEffect, useRef, useState } from 'react';
import type * as GoogleMobileAds from 'react-native-google-mobile-ads';
import { ADMOB_TEST_REWARDED_UNIT_ID, googleMobileAds } from '../config/admob';

// Wraps RewardedAdModal with the ad-availability + fallback rule from
// docs/handoff/13-ad-monetization-economy.md section 5: when `enabled` is
// false (the placement's feature flag — the same kill switch a real
// no-fill/no-inventory result would trip), requestAd() resolves `false`
// immediately with no modal and no error state, and the caller falls back
// to the base reward silently. Spread `adModalProps` onto a
// <RewardedAdModal /> wherever requestAd() is used.
//
// Native (config/admob.ts's ADMOB_SUPPORTED_PLATFORM): a real AdMob
// rewarded ad, pinned to Google's public TEST ad unit ID — see admob.ts's
// TODO_BALANCE note on swapping in this app's real ad unit ID before
// release. Web: no ad SDK exists for it, so this falls back to the
// original simulated countdown (RewardedAdModal) unchanged.
export function useRewardedAd(enabled: boolean) {
  const [pendingResolve, setPendingResolve] = useState<((watched: boolean) => void) | null>(null);
  const resolveRef = useRef<((watched: boolean) => void) | null>(null);
  const rewardedRef = useRef<GoogleMobileAds.RewardedAd | null>(null);
  const loadedRef = useRef(false);
  const earnedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !googleMobileAds) return;
    const { RewardedAd, RewardedAdEventType, AdEventType } = googleMobileAds;
    const rewarded = RewardedAd.createForAdRequest(ADMOB_TEST_REWARDED_UNIT_ID);
    rewardedRef.current = rewarded;
    loadedRef.current = false;

    // Preloaded the whole time this placement is enabled, not lazily on
    // first tap — requestAd() would otherwise have to wait on a network
    // load every single time instead of showing instantly.
    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedRef.current = true;
    });
    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      resolveRef.current?.(earnedRef.current);
      resolveRef.current = null;
      earnedRef.current = false;
      loadedRef.current = false;
      rewarded.load();
    });
    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      resolveRef.current?.(false);
      resolveRef.current = null;
      loadedRef.current = false;
    });

    rewarded.load();

    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      rewardedRef.current = null;
    };
  }, [enabled]);

  const requestAd = useCallback((): Promise<boolean> => {
    if (!enabled) return Promise.resolve(false);

    if (googleMobileAds && rewardedRef.current) {
      // Not loaded yet (still fetching, or the last load errored) — same
      // silent-fallback contract as `enabled` being false, rather than
      // making the player wait indefinitely for a load that may not come.
      if (!loadedRef.current) return Promise.resolve(false);
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        rewardedRef.current!.show();
      });
    }

    // Web (or native module unavailable for any other reason) — simulated
    // modal, exactly as before real ad SDK wiring existed.
    return new Promise((resolve) => setPendingResolve(() => resolve));
  }, [enabled]);

  const handleComplete = useCallback(() => {
    pendingResolve?.(true);
    setPendingResolve(null);
  }, [pendingResolve]);

  const handleCancel = useCallback(() => {
    pendingResolve?.(false);
    setPendingResolve(null);
  }, [pendingResolve]);

  return {
    requestAd,
    adModalProps: { visible: pendingResolve !== null, onComplete: handleComplete, onCancel: handleCancel },
  };
}
