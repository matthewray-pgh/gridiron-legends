import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Radius } from '../theme/colors';

interface ScoreBoxProps {
  value: string;
  label: string;
}

export function ScoreBox({ value, label }: ScoreBoxProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  value: {
    fontFamily: Font.primaryBold,
    fontSize: 22,
    color: Colors.gold,
  },
  label: {
    fontFamily: Font.secondarySemiBold,
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },
});
