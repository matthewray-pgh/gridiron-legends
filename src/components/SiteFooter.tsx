import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Spacing, Typography } from '../theme/colors';

const FIELD_BG = require('../../assets/field-bottom.png');

// Wide-viewport-only footer (doc 04 point 6). About/Support/Terms have no
// destinations yet, so they render visually present but inert rather than
// linking to dead routes.
export function SiteFooter() {
  return (
    <ImageBackground source={FIELD_BG} style={styles.wrap} imageStyle={styles.image}>
      <LinearGradient
        colors={['#070A0EE0', '#070A0EF7']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.disclaimer}>
          Not affiliated with or endorsed by the NFL, NFLPA, or any team.
        </Text>
        <View style={styles.links}>
          <Text style={styles.link}>About</Text>
          <Text style={styles.link}>Support</Text>
          <Text style={styles.link}>Terms</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing['2xl'],
  },
  image: {
    resizeMode: 'cover',
  },
  content: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  disclaimer: {
    fontSize: Typography.md,
    color: Colors.textDim,
    textAlign: 'center',
    fontFamily: Font.mono,
    marginBottom: Spacing.md,
  },
  links: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  link: {
    fontSize: Typography.sm,
    color: Colors.textDim,
    fontFamily: Font.mono,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});
