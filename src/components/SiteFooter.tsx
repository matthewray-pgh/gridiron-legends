import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Spacing, Typography } from '../theme/colors';
import { BrandBackground } from './BrandBackground';

// Wide-viewport-only footer (doc 04 point 6). About/Support/Terms have no
// destinations yet, so they render visually present but inert rather than
// linking to dead routes.
export function SiteFooter() {
  return (
    <BrandBackground variant="footer" style={styles.wrap}>
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
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing['2xl'],
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
    fontFamily: Font.secondaryRegular,
    marginBottom: Spacing.md,
  },
  links: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  link: {
    fontSize: Typography.sm,
    color: Colors.textDim,
    fontFamily: Font.secondaryRegular,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});
