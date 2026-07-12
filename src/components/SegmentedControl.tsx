import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Typography } from '../theme/colors';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Compact inline variant (e.g. GameScreen's OFF/DEF toggle) vs the roomier full-width tab variant (Home/Leaderboard). */
  compact?: boolean;
}

export function SegmentedControl<T extends string>({ options, value, onChange, compact = false }: SegmentedControlProps<T>) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              compact && styles.segmentCompact,
              active && (compact ? styles.segmentActiveCompact : styles.segmentActive),
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, compact && styles.segmentTextCompact, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#09111B',
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#2B3A48',
  },
  wrapCompact: {
    backgroundColor: Colors.bgDark,
    borderColor: Colors.borderMid,
    borderRadius: Radius.sm,
    padding: 0,
    gap: 0,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segment: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentCompact: {
    flex: 0,
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  segmentActive: {
    backgroundColor: '#221A08',
    borderColor: '#BD9030',
    shadowColor: Colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  segmentActiveCompact: {
    backgroundColor: Colors.bgNavy,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    fontFamily: Font.primaryMedium,
    letterSpacing: 0.8,
  },
  segmentTextCompact: {
    fontSize: Typography.sm,
    fontFamily: Font.primaryBold,
    letterSpacing: 0.6,
  },
  segmentTextActive: {
    color: Colors.gold,
    fontFamily: Font.primaryBold,
  },
});
