import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Typography } from '../theme/colors';
import { StatMetric } from '../utils/statMetrics';

interface PlayerRowStatsProps {
  metrics: StatMetric[];
}

// Compact stat-chip readout for a player list row — shared by GameScreen's
// draft candidate list and RosterManager's Dynasty roster list so both
// render the identical markup/styling (getRowStatMetrics in
// utils/statMetrics.ts produces the `metrics` this expects).
export function PlayerRowStats({ metrics }: PlayerRowStatsProps) {
  return (
    <View style={styles.wrap}>
      {metrics.map((metric, i) => (
        <React.Fragment key={metric.key}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.item}>
            <Text style={styles.value}>{metric.value}</Text>
            <Text style={styles.label}>{metric.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  divider: {
    width: 1,
    height: 34,
    marginHorizontal: 8,
    backgroundColor: Colors.border,
  },
  item: {
    alignItems: 'center',
    minWidth: 48,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: Typography['2xl'],
    fontFamily: Font.primaryBold,
  },
  label: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontFamily: Font.secondaryBold,
    letterSpacing: 0.4,
    marginTop: 1,
  },
});
