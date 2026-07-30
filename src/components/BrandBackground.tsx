import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const STADIUM_BG = require('../../assets/stadium-bg.png');

export type BrandBackgroundVariant = 'header';

interface BrandBackgroundProps {
  variant: BrandBackgroundVariant;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Shared brand background system (DESIGN-SYSTEM.md §6) — stadium art behind
// headers, always with a dark gradient overlay so content never sits
// directly on the raw photo. Used to also support a 'footer' variant with
// field art (FieldFooterBand, SiteFooter) — removed app-wide per user
// direction, so this only renders the header/stadium art now.
const HEADER_GRADIENT: readonly [string, string, string] = ['#070A0EF2', '#070A0EB8', '#070A0EF2'];

export function BrandBackground({ children, style }: BrandBackgroundProps) {
  return (
    <ImageBackground source={STADIUM_BG} style={style} imageStyle={styles.image}>
      <LinearGradient colors={HEADER_GRADIENT} style={StyleSheet.absoluteFill} />
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
