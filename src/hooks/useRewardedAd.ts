import { useCallback, useState } from 'react';

// Wraps RewardedAdModal with the ad-availability + fallback rule from
// docs/handoff/13-ad-monetization-economy.md section 5: when `enabled` is
// false (the placement's feature flag — the same kill switch a real
// no-fill/no-inventory result would trip), requestAd() resolves `false`
// immediately with no modal and no error state, and the caller falls back
// to the base reward silently. Spread `adModalProps` onto a
// <RewardedAdModal /> wherever requestAd() is used.
export function useRewardedAd(enabled: boolean) {
  const [pendingResolve, setPendingResolve] = useState<((watched: boolean) => void) | null>(null);

  const requestAd = useCallback((): Promise<boolean> => {
    if (!enabled) return Promise.resolve(false);
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
