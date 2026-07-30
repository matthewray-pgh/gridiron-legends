import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Spacing, Typography } from '../theme/colors';

// Wide-viewport-only footer (doc 04 point 6). About/Support/Terms have no
// destinations yet, so they render visually present but inert rather than
// linking to dead routes. Plain surface, not the field-art BrandBackground
// this used to sit on (removed app-wide, per user direction).
export function SiteFooter() {
  return (
    <View style={styles.wrap}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing['2xl'],
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
