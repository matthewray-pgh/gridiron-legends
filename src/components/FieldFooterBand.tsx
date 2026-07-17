import React from 'react';
import { StyleSheet } from 'react-native';
import { Spacing } from '../theme/colors';
import { BrandBackground } from './BrandBackground';

// Decorative "bottom fade" from the background-imagery system (DESIGN-
// SYSTEM.md §6.2: the football-field art is meant for "footers, nav areas,
// and bottom fades", not just SiteFooter's wide-only Home footer). Plain
// art + gradient scrim, no nav links/disclaimer text — just a bottom
// flourish for the app's main hub screens (Home, Dynasty, Shop).
export function FieldFooterBand() {
  return <BrandBackground variant="footer" overlayIntensity="light" style={styles.wrap} />;
}

const styles = StyleSheet.create({
  wrap: {
    height: 140,
    marginTop: Spacing['2xl'],
  },
});
