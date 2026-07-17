import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const STADIUM_BG = require('../../assets/stadium-bg.png');
const FIELD_BG = require('../../assets/field-bottom.png');

export type BrandBackgroundVariant = 'header' | 'footer';

interface BrandBackgroundProps {
  variant: BrandBackgroundVariant;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // 'default' overlay is tuned for text legibility (SiteFooter's nav
  // links/disclaimer sit directly on it) — near-opaque, which leaves the
  // photo itself barely visible. 'light' is for decorative-only footer use
  // (FieldFooterBand) where there's no text to protect and the field art
  // should actually read as a football field, not a near-black band.
  overlayIntensity?: 'default' | 'light';
}

// Shared brand background system (DESIGN-SYSTEM.md §6) — stadium art behind
// headers, field art behind footers/nav areas, always with a dark gradient
// overlay so content never sits directly on the raw photo. Doc 06's audit
// found both assets exported but wired into zero screens; doc 07 flagged
// this as the single highest-leverage, lowest-effort fidelity fix since one
// component applied everywhere moves every screen's score at once, rather
// than fixing screens one at a time.
//
// The design system's header/contextual-header split (§9) would normally
// reserve this for branded-header screens only — applied to every screen
// here per explicit product direction, overriding that default.
const GRADIENT_COLORS: Record<BrandBackgroundVariant, readonly [string, string, ...string[]]> = {
  header: ['#070A0EF2', '#070A0EB8', '#070A0EF2'],
  footer: ['#070A0EE0', '#070A0EF7'],
};

// Lighter top stop than 'default' so the field art actually reads as a
// field, still fading to a near-solid bottom edge to blend into whatever
// follows the band.
const LIGHT_FOOTER_GRADIENT: readonly [string, string] = ['#070A0E4D', '#070A0EE0'];

export function BrandBackground({ variant, children, style, overlayIntensity = 'default' }: BrandBackgroundProps) {
  const source = variant === 'header' ? STADIUM_BG : FIELD_BG;
  const gradient = overlayIntensity === 'light' && variant === 'footer' ? LIGHT_FOOTER_GRADIENT : GRADIENT_COLORS[variant];
  return (
    <ImageBackground source={source} style={style} imageStyle={styles.image}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: {
    // react-native-web's <img> defaults to its natural pixel size unless
    // width/height are set explicitly — without these, resizeMode: 'cover'
    // alone left the (small, ~476px) source images unstretched, showing
    // only in a corner of any container wider than that on web.
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
