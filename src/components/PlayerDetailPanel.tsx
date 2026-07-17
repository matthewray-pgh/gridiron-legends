import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Player, Position, TIER_COLORS, parseYear } from '../data/players';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { SecondaryButton } from './SecondaryButton';

const STAT_GRID_COLS = 3;

interface StatMetric {
  key: string;
  label: string;
  value: string;
}

export interface PlayerDetailAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface PlayerDetailPanelProps {
  player: Player | null;
  fallbackStatMetrics: StatMetric[];
  // Draft-screen usage (GameScreen.tsx): "Quick Assign" grid of open
  // eligible position slots.
  quickAssignSlots?: Position[];
  onAssign?: (position: Position) => void;
  // Dynasty roster usage (RosterManager.tsx): a small row of named action
  // buttons (Bench/Starter/Retire) instead of position slots. Only one of
  // quickAssignSlots or actions should be passed by a given caller —
  // quickAssignSlots takes precedence if both are somehow provided.
  actions?: PlayerDetailAction[];
  // Small explanatory line shown under the actions row — e.g. why Retire
  // is currently disabled (no bench/roster replacement for the slot).
  actionsNote?: string;
  onClose?: () => void;
  // docs/handoff/05-game-loop-bugfixes.md P1 (resolved): OVR is never shown
  // by default here (it's gated behind the Dynasty-only Scouting Report
  // perk, which doesn't reach this draft-screen panel). Gridiron IQ
  // ("stats hidden") additionally hides the whole box-score breakdown —
  // name/team/years only.
  hideStats?: boolean;
}

export function PlayerDetailPanel({ player, fallbackStatMetrics, quickAssignSlots, onAssign, actions, actionsNote, onClose, hideStats = false }: PlayerDetailPanelProps) {
  if (!player) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Select a player to see stats and assign a slot.</Text>
      </View>
    );
  }

  const tierColors = TIER_COLORS[player.tier];
  const rowCount = Math.ceil(fallbackStatMetrics.length / STAT_GRID_COLS);

  return (
    <View style={styles.wrap}>
      <View style={styles.watermarkWrap} pointerEvents="none">
        <MaterialCommunityIcons name="shield-star" size={160} color={tierColors.text} />
      </View>

      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.meta}>
            {player.team} · {parseYear(player.years)}
          </Text>
        </View>
        <View style={styles.positionWrap}>
          <Text style={styles.positionValue}>{player.position}</Text>
        </View>
      </View>

      {!hideStats && (
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>STATS</Text>
          <View style={styles.statGrid}>
            {fallbackStatMetrics.map((metric, index) => {
              const isLastCol = (index + 1) % STAT_GRID_COLS === 0 || index === fallbackStatMetrics.length - 1;
              const isLastRow = Math.floor(index / STAT_GRID_COLS) === rowCount - 1;
              return (
                <View
                  key={metric.key}
                  style={[
                    styles.statItem,
                    !isLastCol && styles.statItemDividerRight,
                    !isLastRow && styles.statItemDividerBottom,
                  ]}
                >
                  <Text style={styles.statValue}>{metric.value}</Text>
                  <Text style={styles.statLabel}>{metric.label}</Text>
                </View>
              );
            })}
            {fallbackStatMetrics.length === 0 && (
              <Text style={styles.statsEmptyText}>No stat breakdown available.</Text>
            )}
          </View>
        </View>
      )}

      {quickAssignSlots ? (
        <View style={styles.quickAssignWrap}>
          <Text style={styles.quickAssignLabel}>Quick Assign</Text>
          <View style={styles.quickAssignGrid}>
            {quickAssignSlots.map((position) => (
              <TouchableOpacity
                key={position}
                style={styles.quickAssignBtn}
                onPress={() => onAssign?.(position)}
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
      ) : actions && (
        <View style={styles.quickAssignWrap}>
          <View style={styles.quickAssignGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[
                  styles.quickAssignBtn,
                  action.destructive && styles.quickAssignBtnDestructive,
                  action.disabled && styles.quickAssignBtnDisabled,
                ]}
                onPress={action.onPress}
                disabled={action.disabled}
                activeOpacity={0.85}
              >
                <Text style={[styles.quickAssignBtnText, action.destructive && styles.quickAssignBtnTextDestructive]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!actionsNote && <Text style={styles.actionsNoteText}>{actionsNote}</Text>}
        </View>
      )}

      {!!onClose && (
        <SecondaryButton label="Close" onPress={onClose} style={styles.closeBtn} />
      )}
    </View>
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
  wrap: {
    flex: 1,
  },
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.06,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  positionWrap: {
    alignItems: 'flex-end',
  },
  positionValue: {
    color: Colors.textPrimary,
    fontSize: Typography['3xl'],
    fontFamily: Font.primaryBold,
    letterSpacing: 0.5,
  },
  titleWrap: { flexShrink: 1 },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography['3xl'],
    fontFamily: Font.primaryBold,
  },
  meta: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    marginTop: 2,
    fontFamily: Font.secondaryMedium,
  },
  statsBox: {
    marginTop: 16,
    gap: 8,
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.bgCardDeep}59`,
  },
  statItem: {
    width: `${100 / STAT_GRID_COLS}%`,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statItemDividerRight: {
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statItemDividerBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    letterSpacing: 0.4,
    fontFamily: Font.secondaryBold,
    marginTop: 4,
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
  // Dynasty roster's "Retire" action (RosterManager.tsx) — same pill shape
  // as Quick Assign, swapped to the app's destructive-action color instead
  // of gold (matches DynastyHomeScreen's "Reset Dynasty" button).
  quickAssignBtnDestructive: {
    borderColor: Colors.loss,
    backgroundColor: '#2A1210',
  },
  quickAssignBtnTextDestructive: {
    color: Colors.loss,
  },
  quickAssignBtnDisabled: {
    opacity: 0.35,
  },
  actionsNoteText: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontFamily: Font.secondaryRegular,
    marginTop: 4,
  },
  quickAssignEmpty: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontFamily: Font.secondarySemiBold,
  },
  closeBtn: {
    marginTop: 16,
  },
});
