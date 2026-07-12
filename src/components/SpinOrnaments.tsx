import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, {
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  Path,
  Line,
  Image as SvgImage,
} from 'react-native-svg';
import { Colors, Font, Typography } from '../theme/colors';

const STADIUM_BG = require('../../assets/stadium-bg.png');

export type Tone = 'gold' | 'silver';

const TONE_COLORS: Record<Tone, { light: string; mid: string; dark: string; label: string }> = {
  gold: { light: '#F4D883', mid: Colors.gold, dark: '#8B6B2C', label: Colors.gold },
  silver: { light: Colors.textPrimary, mid: Colors.steel, dark: '#5E6C79', label: '#CBD5E0' },
};

// Chamfered ("cut corner") rectangle path — the octagon-style frame in the mockups.
function chamferPath(w: number, h: number, c: number): string {
  return `M${c},0 L${w - c},0 L${w},${c} L${w},${h - c} L${w - c},${h} L${c},${h} L0,${h - c} L0,${c} Z`;
}

function ClockTicks({ w, h, tone }: { w: number; h: number; tone: Tone }) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.46;
  const color = TONE_COLORS[tone].mid;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    const x1 = cx + Math.sin(angle) * (radius - 12);
    const y1 = cy - Math.cos(angle) * (radius - 12);
    const x2 = cx + Math.sin(angle) * radius;
    const y2 = cy - Math.cos(angle) * radius;
    return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeOpacity={0.22} strokeWidth={2} />;
  });
  return <>{ticks}</>;
}

interface SpinCardProps {
  tone: Tone;
  label: string;
  children: React.ReactNode;
  useTexture?: boolean;
}

export function SpinCard({ tone, label, children, useTexture = false }: SpinCardProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const c = TONE_COLORS[tone];
  const clipId = `cardClip-${tone}`;
  const outerPath = size.w > 0 ? chamferPath(size.w, size.h, 18) : '';
  const innerPath = size.w > 0 ? chamferPath(size.w - 10, size.h - 10, 15) : '';

  return (
    <View
      style={styles.cardOuter}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id={clipId}>
              <Path d={outerPath} />
            </ClipPath>
            <LinearGradient id={`overlay-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0B0F14" stopOpacity={useTexture ? 0.5 : 0.94} />
              <Stop offset="1" stopColor="#0B0F14" stopOpacity={useTexture ? 0.88 : 0.98} />
            </LinearGradient>
          </Defs>

          {useTexture ? (
            <SvgImage
              href={STADIUM_BG}
              x={0}
              y={0}
              width={size.w}
              height={size.h}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <Path d={outerPath} fill="#0B121B" />
          )}

          {!useTexture && <ClockTicks w={size.w} h={size.h} tone={tone} />}

          <Path d={outerPath} fill={`url(#overlay-${tone})`} />
          <Path d={outerPath} fill="none" stroke={c.mid} strokeWidth={2} />
          <Path
            d={innerPath}
            fill="none"
            stroke={c.mid}
            strokeOpacity={0.55}
            strokeWidth={1}
            transform="translate(5,5)"
          />
        </Svg>
      )}

      <View style={styles.cardContent} pointerEvents="none">
        <Text style={[styles.cardLabel, { color: c.label }]}>{label}</Text>
        <View style={styles.valueSlot}>{children}</View>
      </View>
    </View>
  );
}

interface ChamferButtonBackgroundProps {
  disabled?: boolean;
}

export function ChamferButtonBackground({ disabled }: ChamferButtonBackgroundProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const path = size.w > 0 ? chamferPath(size.w, size.h, 12) : '';

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="spinBtnGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#A86A05" />
              <Stop offset="0.5" stopColor="#F0CC50" />
              <Stop offset="1" stopColor="#A86A05" />
            </LinearGradient>
          </Defs>
          <Path d={path} fill={disabled ? '#5A4A22' : 'url(#spinBtnGrad)'} stroke="#F5DC7A" strokeWidth={1.5} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    minHeight: 140,
    justifyContent: 'center',
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  cardLabel: {
    fontFamily: Font.primarySemiBold,
    fontSize: Typography.lg,
    letterSpacing: 3,
    marginBottom: 6,
  },
  valueSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
});
