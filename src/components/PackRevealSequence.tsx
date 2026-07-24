import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { PackRarity } from '../data/packs';
import { PackPullResult } from '../store/dynastyStore';
import { PackPlayerCard, RARITY_COLOR } from './PackPlayerCard';

const BURST_DOT_COUNT = 12;
const RIP_DURATION = 480;

// Session-lifetime, not per-mount and not persisted — the first pack opened
// after a fresh app load always plays the full sequence uninterrupted; every
// pack after that (including ones in later sessions after a reload) shows
// the skip control once reveal starts. Intentionally resets on app restart.
let hasRevealedOnceThisSession = false;

// Rarity-scaled reveal flourish (docs/handoff/gridiron-legends-pack-
// animation.html): higher rarities get a bigger glow pulse, and legend
// additionally gets a screen shake + banner. Common/rare/elite all use the
// same glow shape, just wider/longer per tier.
const GLOW_DURATION: Record<PackRarity, number> = {
  common: 0, rare: 550, elite: 700, legend: 900,
};
const HOLD_AFTER_FLIP: Record<PackRarity, number> = {
  common: 1100, rare: 1300, elite: 1400, legend: 2000,
};

interface PackRevealSequenceProps {
  // Fired the instant the pack is tapped — this is where the parent should
  // call the store's openPack() (a real, order-committing mutation), not
  // before. Returning null (e.g. the gate re-checked and failed) leaves the
  // pack visual sitting idle rather than animating into a reveal with no
  // cards.
  onOpen: () => PackPullResult[] | null;
  // Fired once every card has been flipped through — the parent swaps to
  // its existing card-selection summary screen at that point.
  onDone: (pulls: PackPullResult[]) => void;
  cardCount: number;
  // Shown under the idle pack only (e.g. "4 cards · 2016-2020") — gone once
  // ripping starts, same as the mockup dropping its "TAP TO OPEN" hint.
  subtitle?: string;
}

// Tap → rip → flip-through-one-at-a-time reveal. Deliberately built from
// plain RN Animated (matches PackPlayerCard.tsx's existing convention)
// rather than reaching for reanimated for one screen's choreography.
export function PackRevealSequence({ onOpen, onDone, cardCount, subtitle }: PackRevealSequenceProps) {
  const { width: winWidth } = useWindowDimensions();
  const cardWidth = Math.min(winWidth * 0.56, 220);
  const cardHeight = cardWidth * 1.45;

  const [phase, setPhase] = useState<'idle' | 'ripping' | 'reveal'>('idle');
  const [pulls, setPulls] = useState<PackPullResult[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);

  const packPulse = useRef(new Animated.Value(0)).current;
  const leftRip = useRef(new Animated.Value(0)).current;
  const rightRip = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const burstDots = useRef(
    Array.from({ length: BURST_DOT_COUNT }, () => new Animated.Value(0))
  ).current;
  const flip = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(0)).current;

  // Fixed angles/distances, not randomized per render — same reasoning as
  // CardStack's ghost-card transforms: a consistent burst reads as
  // intentional, jittering on every open doesn't.
  const burstTargets = useMemo(
    () => Array.from({ length: BURST_DOT_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / BURST_DOT_COUNT;
      const dist = 70 + (i % 3) * 12;
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    }),
    []
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(packPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(packPulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (phase === 'idle') loop.start();
    return () => loop.stop();
  }, [phase, packPulse]);

  function handleTapPack() {
    if (phase !== 'idle') return;
    const result = onOpen();
    if (!result || result.length === 0) return;
    setPulls(result);
    setPhase('ripping');

    Animated.parallel([
      Animated.timing(leftRip, { toValue: 1, duration: RIP_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rightRip, { toValue: 1, duration: RIP_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      Animated.stagger(
        14,
        burstDots.map((v) => Animated.timing(v, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }))
      ),
    ]).start(() => setPhase('reveal'));
  }

  function handleFlipCard() {
    if (flipped || !pulls) return;
    const card = pulls[index];
    setFlipped(true);

    Animated.timing(flip, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    if (GLOW_DURATION[card.rarity] > 0) {
      glow.setValue(0);
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: GLOW_DURATION[card.rarity] * 0.3, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: GLOW_DURATION[card.rarity] * 0.7, useNativeDriver: true }),
      ]).start();
    }

    if (card.rarity === 'legend') {
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      banner.setValue(0);
      Animated.spring(banner, { toValue: 1, friction: 6, delay: 200, useNativeDriver: true }).start();
    }

    setTimeout(() => {
      if (index + 1 < pulls.length) {
        banner.setValue(0);
        setFlipped(false);
        flip.setValue(0);
        setIndex((i) => i + 1);
      } else {
        hasRevealedOnceThisSession = true;
        onDone(pulls);
      }
    }, HOLD_AFTER_FLIP[card.rarity]);
  }

  function handleSkip() {
    if (!pulls) return;
    setSkipRequested(true);
    onDone(pulls);
  }

  const packScale = packPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const packGlowOpacity = packPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  const leftTranslateX = leftRip.interpolate({ inputRange: [0, 1], outputRange: [0, -cardWidth * 0.9] });
  const leftRotate = leftRip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] });
  const leftOpacity = leftRip.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const rightTranslateX = rightRip.interpolate({ inputRange: [0, 1], outputRange: [0, cardWidth * 0.9] });
  const rightRotate = rightRip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '28deg'] });
  const rightOpacity = rightRip.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const current = pulls?.[index];
  const rarityColor = current ? RARITY_COLOR[current.rarity] : Colors.gold;

  const frontRotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const backRotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const shakeTranslateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });
  const bannerScale = banner.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  return (
    <View style={styles.wrap}>
      {phase === 'reveal' && hasRevealedOnceThisSession && !skipRequested && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipBtnText}>SKIP ›</Text>
        </TouchableOpacity>
      )}

      {phase === 'reveal' && (
        <View style={styles.dotsRow}>
          {Array.from({ length: cardCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i < index && styles.dotDone]} />
          ))}
        </View>
      )}

      <Animated.View style={[styles.stage, { transform: [{ translateX: shakeTranslateX }] }]}>
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />

        {phase !== 'reveal' && (
          <TouchableOpacity activeOpacity={0.9} onPress={handleTapPack} disabled={phase !== 'idle'}>
            <Animated.View style={{ transform: [{ scale: packScale }] }}>
              <View style={[styles.packBox, { width: cardWidth, height: cardHeight * 0.72 }]}>
                <Animated.View style={[styles.packGlow, { opacity: packGlowOpacity }]} />

                <Animated.View
                  style={[
                    styles.packHalf,
                    styles.packHalfLeft,
                    { width: cardWidth / 2, height: cardHeight * 0.72 },
                    { transform: [{ translateX: leftTranslateX }, { rotate: leftRotate }], opacity: leftOpacity },
                  ]}
                >
                  <View style={[styles.packHalfInner, { width: cardWidth, height: cardHeight * 0.72 }]}>
                    <Text style={styles.packEmblem}>◆{'\n'}TAP TO{'\n'}OPEN</Text>
                  </View>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.packHalf,
                    styles.packHalfRight,
                    { width: cardWidth / 2, height: cardHeight * 0.72 },
                    { transform: [{ translateX: rightTranslateX }, { rotate: rightRotate }], opacity: rightOpacity },
                  ]}
                >
                  <View style={[styles.packHalfInner, { width: cardWidth, height: cardHeight * 0.72, left: -cardWidth / 2 }]}>
                    <Text style={styles.packEmblem}>◆{'\n'}TAP TO{'\n'}OPEN</Text>
                  </View>
                </Animated.View>
              </View>
            </Animated.View>

            {phase === 'idle' && (
              <>
                <Text style={styles.tapHint}>TAP TO OPEN</Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </>
            )}

            {burstDots.map((v, i) => {
              const target = burstTargets[i];
              const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, target.x] });
              const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, target.y] });
              const bOpacity = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
              const bScale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
              return (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.burstDot,
                    { opacity: bOpacity, transform: [{ translateX: tx }, { translateY: ty }, { scale: bScale }] },
                  ]}
                />
              );
            })}
          </TouchableOpacity>
        )}

        {phase === 'reveal' && current && (
          <View style={[styles.cardSlot, { width: cardWidth, height: cardHeight }]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glowRing,
                { borderColor: rarityColor, opacity: glow, transform: [{ scale: glowScale }] },
              ]}
            />

            {current.rarity === 'legend' && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.legendBanner,
                  { opacity: banner, transform: [{ rotate: '-8deg' }, { scale: bannerScale }] },
                ]}
              >
                <Text style={styles.legendBannerText}>LEGENDARY PULL</Text>
              </Animated.View>
            )}

            <TouchableOpacity activeOpacity={0.9} onPress={handleFlipCard} disabled={flipped} style={styles.flipTouchable}>
              <Animated.View
                pointerEvents={flipped ? 'none' : 'auto'}
                style={[styles.face, { width: cardWidth, height: cardHeight, transform: [{ perspective: 1000 }, { rotateY: backRotateY }] }]}
              >
                <Text style={styles.backEmblem}>U</Text>
                <Text style={styles.backHint}>TAP TO REVEAL</Text>
              </Animated.View>
            </TouchableOpacity>

            <Animated.View
              pointerEvents="none"
              style={[styles.face, { width: cardWidth, height: cardHeight, transform: [{ perspective: 1000 }, { rotateY: frontRotateY }] }]}
            >
              <PackPlayerCard card={current} width={cardWidth} />
            </Animated.View>

            <Text style={styles.revealHint}>
              {flipped ? '' : `TAP CARD TO REVEAL · ${index + 1} OF ${cardCount}`}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotDone: { backgroundColor: Colors.gold },

  stage: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  flash: {
    position: 'absolute', top: -200, bottom: -200, left: -200, right: -200,
    backgroundColor: '#FFFFFF',
  },

  packBox: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  packGlow: {
    position: 'absolute', top: -10, bottom: -10, left: -10, right: -10, borderRadius: Radius.lg,
    backgroundColor: 'transparent', shadowColor: Colors.gold, shadowRadius: 20, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
  },
  packHalf: { position: 'absolute', top: 0, overflow: 'hidden' },
  packHalfLeft: { left: 0, borderTopLeftRadius: Radius.lg, borderBottomLeftRadius: Radius.lg },
  packHalfRight: { right: 0, borderTopRightRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  packHalfInner: {
    position: 'absolute', top: 0, left: 0, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.gold,
    backgroundColor: '#1B140A', alignItems: 'center', justifyContent: 'center',
  },
  packEmblem: {
    color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography.lg, letterSpacing: 1, textAlign: 'center', lineHeight: 22,
  },
  tapHint: {
    marginTop: Spacing.lg, textAlign: 'center', color: Colors.textMuted, fontSize: Typography.sm,
    fontFamily: Font.mono, letterSpacing: 1,
  },
  subtitle: {
    marginTop: 6, textAlign: 'center', color: Colors.textDim, fontSize: Typography.sm, fontFamily: Font.secondaryRegular,
  },

  burstDot: {
    position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold,
  },

  cardSlot: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  face: {
    position: 'absolute', top: 0, left: 0, borderRadius: Radius.lg, backfaceVisibility: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  flipTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backEmblem: {
    color: Colors.textMuted, fontFamily: Font.primaryBold, fontSize: 30, letterSpacing: 2,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgCardDeep,
    width: '100%', height: '100%', textAlign: 'center', textAlignVertical: 'center', borderRadius: Radius.lg,
  },
  backHint: {
    position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center',
    color: Colors.textMuted, fontSize: Typography.xs, fontFamily: Font.mono, letterSpacing: 1,
  },

  glowRing: { position: 'absolute', top: -14, bottom: -14, left: -14, right: -14, borderRadius: Radius.xl, borderWidth: 3 },

  legendBanner: {
    position: 'absolute', top: '18%', left: '-16%', right: '-16%', paddingVertical: 6,
    backgroundColor: Colors.rarityLegend, alignItems: 'center', zIndex: 5,
  },
  legendBannerText: {
    color: Colors.bgDark, fontFamily: Font.primaryBold, fontSize: Typography.base, letterSpacing: 3,
  },

  revealHint: {
    position: 'absolute', bottom: -32, left: 0, right: 0, textAlign: 'center',
    color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.mono, letterSpacing: 0.5,
  },

  skipBtn: { position: 'absolute', top: 8, right: 8, padding: 8, zIndex: 10 },
  skipBtnText: { color: Colors.textMuted, fontFamily: Font.mono, fontSize: Typography.xs, letterSpacing: 1 },
});
