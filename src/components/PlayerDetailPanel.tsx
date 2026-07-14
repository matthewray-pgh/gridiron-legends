import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Player, Position } from '../data/players';
import { Colors, Font, Radius, Typography } from '../theme/colors';

function parseYear(playerYears: string): string {
  const match = playerYears.match(/(\d{4})/);
  return match ? match[1] : '--';
}

interface StatMetric {
  key: string;
  label: string;
  value: string;
}

interface PlayerDetailPanelProps {
  player: Player | null;
  fallbackStatMetrics: StatMetric[];
  quickAssignSlots: Position[];
  onAssign: (position: Position) => void;
  onClose?: () => void;
  // docs/handoff/05-game-loop-bugfixes.md P1 (resolved): OVR is never shown
  // by default here (it's gated behind the Dynasty-only Scouting Report
  // perk, which doesn't reach this draft-screen panel). Gridiron IQ
  // ("stats hidden") additionally hides the whole box-score breakdown —
  // name/team/years only.
  hideStats?: boolean;
}

export function PlayerDetailPanel({ player, fallbackStatMetrics, quickAssignSlots, onAssign, onClose, hideStats = false }: PlayerDetailPanelProps) {
  if (!player) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Select a player to see stats and assign a slot.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.meta}>
            {player.team} · {parseYear(player.years)}
          </Text>
        </View>
      </View>

      {!hideStats && (
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>STATISTICS</Text>
          <View style={styles.statGrid}>
            {fallbackStatMetrics.map((metric) => (
              <View key={metric.key} style={styles.statItem}>
                <Text style={styles.statValue}>{metric.value}</Text>
                <Text style={styles.statLabel}>{metric.label}</Text>
              </View>
            ))}
            {fallbackStatMetrics.length === 0 && (
              <Text style={styles.statsEmptyText}>No stat breakdown available.</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.quickAssignWrap}>
        <Text style={styles.quickAssignLabel}>Quick Assign</Text>
        <View style={styles.quickAssignGrid}>
          {quickAssignSlots.map((position) => (
            <TouchableOpacity
              key={position}
              style={styles.quickAssignBtn}
              onPress={() => onAssign(position)}
              activeOpacity={0.85}
            >
              <Text style={styles.quickAssignBtnText}>{position}</Text>
            </TouchableOpacity>
          ))}
          {quickAssignSlots.length === 0 && (
            <Text style={styles.quickAssignEmpty}>No open eligible slots.</Text>
          )}
        </View>
      </View>

      {!!onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.textDim,
    fontSize: Typography.base,
    fontFamily: Font.secondaryRegular,
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  titleWrap: { flexShrink: 1 },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography['2xl'],
    fontFamily: Font.primaryBold,
  },
  meta: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    marginTop: 2,
    fontFamily: Font.secondaryMedium,
  },
  statsBox: {
    backgroundColor: Colors.bgCardDeep,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginTop: 14,
  },
  statsLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    letterSpacing: 0.5,
    fontFamily: Font.secondaryBold,
  },
  statsEmptyText: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontFamily: Font.secondarySemiBold,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 8,
  },
  statItem: {
    width: '31%',
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    letterSpacing: 0.4,
    fontFamily: Font.secondaryBold,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontFamily: Font.primaryBold,
  },
  quickAssignWrap: {
    gap: 6,
    marginTop: 16,
  },
  quickAssignLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    letterSpacing: 0.5,
    fontFamily: Font.secondaryBold,
  },
  quickAssignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAssignBtn: {
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: '#2A210F',
    borderRadius: Radius.md,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 72,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAssignBtnText: {
    color: Colors.gold,
    fontSize: Typography.xl,
    fontFamily: Font.primaryBold,
    letterSpacing: 0.5,
  },
  quickAssignEmpty: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontFamily: Font.secondarySemiBold,
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderMid,
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontFamily: Font.primaryBold,
  },
});
