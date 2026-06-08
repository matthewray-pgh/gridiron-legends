import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Typography } from '../theme/colors';

export function StatusBar() {
  return (
    <View style={styles.bar}>
      <Text style={styles.time}>9:41</Text>
      <View style={styles.right}>
        <Text style={styles.indicator}>●●●●</Text>
        <Text style={styles.indicator}>WiFi</Text>
        <Text style={styles.indicator}>▮▮▮</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 4,
  },
  time: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },
  right: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  indicator: { fontSize: Typography.xs, color: Colors.textSecondary },
});
