import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

const SIMULATED_AD_SECONDS = 3;

interface RewardedAdModalProps {
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

// Web-only fallback now that useRewardedAd.ts wires in the real AdMob SDK
// for native (react-native-google-mobile-ads has no web implementation).
// On native, adModalProps.visible never turns true — Google's own
// full-screen ad UI is what the player actually sees there; this modal's
// simulated countdown only ever renders on web. Every caller goes through
// useRewardedAd() rather than this component directly, so callers don't
// need to know which path they're on.
export function RewardedAdModal({ visible, onComplete, onCancel }: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(SIMULATED_AD_SECONDS);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(SIMULATED_AD_SECONDS);
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const done = setTimeout(onComplete, SIMULATED_AD_SECONDS * 1000);
    return () => { clearInterval(tick); clearTimeout(done); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.label}>AD PLAYING…</Text>
          <Text style={styles.countdown}>{secondsLeft}</Text>
          <Text style={styles.hint}>Simulated ad — no ad network is connected yet.</Text>
          <Pressable onPress={onCancel} hitSlop={10} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000D0', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 260, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5,
    borderColor: Colors.gold, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 8,
  },
  label: { fontFamily: Font.mono, fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 1.2 },
  countdown: { fontFamily: Font.primaryBold, fontSize: Typography['3xl'], color: Colors.gold },
  hint: { fontFamily: Font.secondaryRegular, fontSize: Typography.xs, color: Colors.textDim, textAlign: 'center', marginTop: 4 },
  cancelBtn: { marginTop: 10 },
  cancelText: { fontFamily: Font.secondarySemiBold, fontSize: Typography.sm, color: Colors.textMuted, textDecorationLine: 'underline' },
});
