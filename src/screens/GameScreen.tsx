import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { DRAFT_POSITIONS, Position } from '../data/players';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OFFENSE_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'FLEX2'];
const DEFENSE_POSITIONS: Position[] = ['EDGE', 'DT', 'LB', 'CB', 'S', 'D-FLEX'];
const QB_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['completions', 'COMP'],
  ['attempts', 'ATT'],
  ['passingYards', 'PASSYDS'],
  ['passingTD', 'PASSTD'],
  ['interceptions', 'INT'],
  // ['passingAirYards', 'PASSAIR'],
  // ['passingYardsAfterCatch', 'PASSYAC'],
  // ['passingFirstDowns', 'PASS1D'],
  ['rushingYards', 'RUYDS'],
  ['rushingTD', 'RUTD'],
  // ['rushingFirstDowns', 'RU1D'],
  // ['rushingFumbles', 'RFUM'],
  // ['rushingFumblesLost', 'RFUML'],
];

const SKILL_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['rushingYards', 'RUYDS'],
  ['rushingTD', 'RUTD'],
  // ['rushingFirstDowns', 'RU1D'],
  // ['rushingFumbles', 'RFUM'],
  // ['rushingFumblesLost', 'RFUML'],
  ['receptions', 'REC'],
  // ['targets', 'TGT'],
  ['receivingYards', 'RECYDS'],
  ['receivingTD', 'RECTD'],
  // ['receivingAirYards', 'RECAIR'],
  ['receivingYardsAfterCatch', 'RECYAC'],
  // ['receivingFirstDowns', 'REC1D'],
  // ['receivingFumbles', 'CFUM'],
  // ['receivingFumblesLost', 'CFUML'],
];

const DEFENSE_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['sacks', 'SACKS'],
  ['tfl', 'TFL'],
  ['qbHits', 'QBHITS'],
  ['forcedFumbles', 'FF'],
  ['passesDefended', 'PD'],
  // ['defTD', 'DEFTD'],
];

function getStatDisplayOrder(position: Position | undefined): Array<[string, string]> {
  if (!position) return [];
  if (position === 'QB') return QB_STAT_DISPLAY_ORDER;
  if (OFFENSE_POSITIONS.includes(position)) return SKILL_STAT_DISPLAY_ORDER;
  return DEFENSE_STAT_DISPLAY_ORDER;
}

function parseYear(playerYears: string): string {
  const match = playerYears.match(/(\d{4})/);
  return match ? match[1] : '--';
}

function formatChipValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000) return Math.round(value).toLocaleString('en-US');
  if (value >= 100) return Math.round(value).toString();
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

export function GameScreen() {
  const navigation = useNavigation<Nav>();
  const {
    positionIndex,
    playerIndex,
    roster,
    isComplete,
    resetGame,
    setPlayerIndex,
    assignPlayerToPosition,
    openPositions,
    currentCandidates,
    currentPlayer,
    currentSpin,
    rerollsRemaining,
  } = useGameStore();

  const candidates = currentCandidates();
  const selectedPlayer = currentPlayer();
  const selectedCandidateId = candidates[playerIndex]?.id;
  const openSlots = openPositions();
  const selectedEligibleSlots = selectedPlayer?.eligiblePositions ?? [];
  const quickAssignSlots = selectedEligibleSlots.filter((position) => !roster[position]);
  const progressLabel = `${positionIndex + 1}/${DRAFT_POSITIONS.length}`;
  const positionTypeLabel = positionIndex <= 5 ? 'OFFENSE' : 'DEFENSE';
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [slotFilter, setSlotFilter] = useState<'offense' | 'defense'>('offense');
  const applicablePositions = positionIndex <= 5 ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
  const groupedCandidates = applicablePositions
    .map((position) => ({
      position,
      entries: candidates
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => candidate.position === position)
        .sort(({ candidate: a }, { candidate: b }) => {
          // First sort by era (year from the years string) in descending order
          const yearA = parseYear(a.years);
          const yearB = parseYear(b.years);
          if (yearA !== yearB) {
            return yearB.localeCompare(yearA);
          }
          // Then sort alphabetically by name
          return a.name.localeCompare(b.name);
        }),
    }))
    .filter((group) => group.entries.length > 0);
  const filteredSlotPositions = (slotFilter === 'offense' ? OFFENSE_POSITIONS : DEFENSE_POSITIONS);
  const openOffenseSlots = OFFENSE_POSITIONS.filter((position) => !roster[position]);
  const openDefenseSlots = DEFENSE_POSITIONS.filter((position) => !roster[position]);

  const statMetrics = useMemo(() => {
    if (!selectedPlayer) return [];
    const fromRawStats = getStatDisplayOrder(selectedPlayer.position)
      .map(([key, label]) => {
        const value = selectedPlayer.statValues?.[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
        return { key, label, value: formatChipValue(value) };
      })
      .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry));

    if (fromRawStats.length > 0) return fromRawStats;

    return selectedPlayer.stats
      .split('•')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }, [selectedPlayer]);

  const fallbackStatMetrics = useMemo(() => {
    return statMetrics
      .map((entry) => {
        if (typeof entry !== 'string') return entry;

        const splitIndex = entry.indexOf(' ');
        const value = splitIndex > 0 ? entry.slice(0, splitIndex) : entry;
        const label = (splitIndex > 0 ? entry.slice(splitIndex + 1) : 'STAT').replace(/\s+/g, '').toUpperCase();
        return { key: `${label}-${value}`, label, value };
      })
      .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry));
  }, [selectedPlayer]);

  useEffect(() => {
    if (isComplete) {
      navigation.replace('Result');
    }
  }, [isComplete, navigation]);

  useEffect(() => {
    if (!currentSpin && !isComplete) {
      navigation.replace('Spin');
    }
  }, [currentSpin, isComplete, navigation]);

  useFocusEffect(
    useCallback(() => {
      // Reset transient selection state each time Game screen is focused.
      setPlayerIndex(-1);
      setStatsModalVisible(false);
    }, [setPlayerIndex])
  );



  useEffect(() => {
    setStatsModalVisible(false);
  }, [currentSpin]);

  useEffect(() => {
    if (positionIndex <= 5) {
      setSlotFilter('offense');
      return;
    } else {
      setSlotFilter('defense');
    }
  }, [positionIndex]);

  function handleAssign(position: Position) {
    if (!selectedPlayer) return;
    setStatsModalVisible(false);
    assignPlayerToPosition(position);
  }

  function handleSelectPlayer(index: number) {
    setPlayerIndex(index);
    setStatsModalVisible(true);
  }

  function renderSlot(position: Position) {
    const filled = Boolean(roster[position]);
    const isEligible = selectedEligibleSlots.includes(position);
    const disabled = filled || !selectedPlayer || !isEligible;

    return (
      <TouchableOpacity
        key={position}
        style={[
          styles.slot,
          filled && styles.slotFilled,
          !filled && isEligible && styles.slotEligible,
        ]}
        disabled={disabled}
        onPress={() => handleAssign(position)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.slotText,
            filled && styles.slotTextFilled,
            !filled && isEligible && styles.slotTextEligible,
          ]}
        >
          {position}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.roundRow}>
          <TouchableOpacity onPress={() => { resetGame(); navigation.goBack(); }} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.roundPill}>
            <Text style={styles.roundPillText}>Round {progressLabel}  ·  {positionTypeLabel}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {!!currentSpin && (
            <>
                <View style={styles.pillOutline}>
                <Text style={styles.pillOutlineLabel}>TEAM</Text>
                <Text style={styles.pillOutlineValue}>{currentSpin.team.abbr}</Text>
              </View>
                <View style={styles.pillOutline}>
                <Text style={styles.pillOutlineLabel}>ERA</Text>
                <Text style={styles.pillOutlineValue}>{currentSpin.era}</Text>
              </View>
            </>
          )}
          <View style={styles.rerollPill}>
            <Text style={styles.rerollText}>Reroll ({rerollsRemaining})</Text>
          </View>
        </View>
      </View>

      <Text style={styles.helper}>Tap a player for details, then assign from the bottom slots.</Text>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Available Players</Text>

      {/* <Text style={styles.inlineHint}>Tap a player row to inspect full stats.</Text> */}

      {candidates.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No players for this spin</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.replace('Spin')}>
            <Text style={styles.emptyBtnText}>Back to spin</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {groupedCandidates.map((group) => (
            <View key={group.position} style={styles.groupWrap}>
              <Text style={styles.groupHeader}>{group.position} · {group.entries.length}</Text>
              {group.entries.map(({ candidate, index }) => {
                const selected = candidate.id === selectedCandidateId;
                return (
                  <TouchableOpacity
                    key={candidate.id}
                    style={[styles.rowCard, selected && styles.rowCardSelected]}
                    onPress={() => handleSelectPlayer(index)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.posBadge}>
                        <Text style={styles.posBadgeText}>{candidate.position}</Text>
                      </View>
                      <View style={styles.nameWrap}>
                        <Text style={styles.playerName}>{candidate.name}</Text>
                        <Text style={styles.playerMeta}>{candidate.team} · {parseYear(candidate.years)}</Text>
                      </View>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.metricValue}>{candidate.rating}</Text>
                      <Text style={styles.metricLabel}>OVR</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.assignWrap}>
        <View style={styles.assignHeaderRow}>
          <Text style={styles.assignLabel}>Assign To Position</Text>
          {/* <View style={styles.filterWrap}>
            <TouchableOpacity
              style={[styles.filterBtn, slotFilter === 'offense' && styles.filterBtnActive]}
              onPress={() => setSlotFilter('offense')}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterBtnText, slotFilter === 'offense' && styles.filterBtnTextActive]}>OFF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, slotFilter === 'defense' && styles.filterBtnActive]}
              onPress={() => setSlotFilter('defense')}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterBtnText, slotFilter === 'defense' && styles.filterBtnTextActive]}>DEF</Text>
            </TouchableOpacity>
          </View> */}
        </View>
        <View style={styles.slotGrid}>
          {filteredSlotPositions.map((position) => renderSlot(position))}
        </View>
        {openSlots.length === 0 && <Text style={styles.assignHint}>Roster complete.</Text>}
      </View>

      <Modal
        visible={statsModalVisible && !!selectedPlayer}
        animationType="slide"
        transparent
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStatsModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {!!selectedPlayer && (
              <>
                <View style={styles.selectedTopRow}>
                  <View style={styles.selectedTitleWrap}>
                    <Text style={styles.selectedName}>{selectedPlayer.name}</Text>
                    <Text style={styles.selectedMeta}>{selectedPlayer.team} · {parseYear(selectedPlayer.years)} · {selectedPlayer.tier}</Text>
                  </View>
                  <View style={styles.selectedOvrPill}>
                    <Text style={styles.selectedOvrValue}>{selectedPlayer.rating}</Text>
                    <Text style={styles.selectedOvrLabel}>OVR</Text>
                  </View>
                </View>

                <View style={styles.selectedStatsBox}>
                  <Text style={styles.selectedStatsLabel}>STATISTICS</Text>
                  <View style={styles.statMetricGrid}>
                    {fallbackStatMetrics.map((metric) => (
                      <View key={metric.key} style={styles.statMetricItem}>
                        <Text style={styles.statMetricValue}>{metric.value}</Text>
                        <Text style={styles.statMetricLabel}>{metric.label}</Text>
                      </View>
                    ))}
                    {fallbackStatMetrics.length === 0 && (
                      <Text style={styles.statsEmptyText}>No stat breakdown available.</Text>
                    )}
                  </View>
                </View>

                <View style={styles.quickAssignWrap}>
                  <Text style={styles.quickAssignLabel}>Quick Assign</Text>
                  <View style={styles.quickAssignGrid}>
                    {quickAssignSlots.map((position) => (
                      <TouchableOpacity
                        key={position}
                        style={styles.quickAssignBtn}
                        onPress={() => handleAssign(position)}
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

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setStatsModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary, paddingHorizontal: Spacing.md },
  topBar: {
    gap: 6,
    paddingTop: Spacing.sm,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { paddingHorizontal: 2, paddingVertical: 2 },
  backText: { color: Colors.textMuted, fontSize: Typography.xl, fontWeight: '700' },
  roundPill: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roundPillText: { 
    color: Colors.textSecondary, 
    fontFamily: Font.primarySemiBold,
    fontSize: Typography.lg, 
    textAlign: 'center' 
  },
  pillOutline: {
    borderWidth: 2,
    borderRadius: Radius.md,
    borderColor: Colors.steel,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 82,
  },
  pillOutlineLabel: {
    color: Colors.textMuted,
    fontSize: Typography.md,
    fontFamily: Font.primarySemiBold,
    letterSpacing: 1,
  },
  pillOutlineValue: { 
    color: Colors.textPrimary, 
    fontSize: Typography['2xl'], 
    fontFamily: Font.primaryBold,
    fontWeight: '800' 
  },
  rerollPill: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rerollText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.md, 
    fontFamily: Font.primarySemiBold,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  helper: {
    color: Colors.textDim,
    marginTop: 6,
    fontFamily: Font.secondaryRegular,
    fontSize: Typography.sm,
  },
  divider: {
    marginTop: 10,
    height: 1,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    marginTop: 10,
    color: Colors.gold,
    fontWeight: '800',
    fontSize: Typography.xl,
    fontFamily: Font.primaryBold,
  },
  inlineHint: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    marginTop: 4,
  },
  selectedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  selectedTitleWrap: { flexShrink: 1 },
  selectedName: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  selectedMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    marginTop: 2,
  },
  selectedOvrPill: {
    backgroundColor: Colors.bgDark,
    borderColor: Colors.borderMid,
    borderWidth: 1,
    borderRadius: Radius.md,
    minWidth: 62,
    paddingVertical: 6,
    alignItems: 'center',
  },
  selectedOvrValue: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: '800',
    lineHeight: Typography.xl + 2,
  },
  selectedOvrLabel: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  selectedStatsBox: {
    backgroundColor: Colors.bgCardDeep,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  selectedStatsLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsEmptyText: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  statMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 8,
  },
  statMetricItem: {
    width: '31%',
    alignItems: 'center',
  },
  statMetricLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statMetricValue: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  quickAssignWrap: {
    gap: 6,
  },
  quickAssignLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickAssignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAssignBtn: {
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: '#2A210F',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickAssignBtnText: {
    color: Colors.gold,
    fontSize: Typography.sm,
    fontWeight: '800',
  },
  quickAssignEmpty: {
    color: Colors.textDim,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  list: { flex: 1, marginTop: 8 },
  listContent: { paddingBottom: 8, gap: 10 },
  groupWrap: { gap: 8 },
  groupHeader: {
    color: Colors.gold,
    fontFamily: Font.primaryBold,
    fontSize: Typography.lg,
    fontWeight: '800',
  },
  rowCard: {
    backgroundColor: Colors.bgCardDeep,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCardSelected: {
    borderColor: Colors.gold,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  nameWrap: { flexShrink: 1 },
  posBadge: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  posBadgeText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.xl, 
    fontWeight: '700',
    fontFamily: Font.primaryBold,
  },
  playerName: { 
    color: Colors.textPrimary, 
    fontSize: Typography['2xl'], 
    fontFamily: Font.primaryBold,
  },
  playerMeta: { 
    color: Colors.textDim, 
    fontSize: Typography.lg, 
    fontFamily: Font.primaryRegular,
    marginTop: 2 
  },
  rowRight: { alignItems: 'flex-end' },
  metricValue: { 
    color: Colors.textPrimary, 
    fontFamily: Font.primaryBold,
    fontSize: Typography.xl, 
    fontWeight: '800' 
  },
  metricLabel: { 
    color: Colors.textDim, 
    fontSize: Typography.md, 
    fontWeight: '700',
    fontFamily: Font.primaryBold,
  },
  assignWrap: {
    marginTop: 6,
    marginBottom: 8,
    paddingVertical: 8,
    gap: 8,
  },
  assignHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignLabel: { 
    color: Colors.textSecondary, 
    fontSize: Typography.xl, 
    fontWeight: '700',
    fontFamily: Font.primaryBold,
  },
  filterWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterBtnActive: {
    backgroundColor: Colors.bgNavy,
  },
  filterBtnText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: Colors.gold,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  slot: {
    width: '32%',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    backgroundColor: Colors.bgCardDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  slotEligible: {
    borderColor: Colors.gold,
    backgroundColor: '#2A210F',
  },
  slotFilled: {
    borderColor: Colors.green,
  },
  slotText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.lg, 
    fontFamily: Font.primaryBold,
  },
  slotTextEligible: { color: Colors.gold },
  slotTextFilled: { color: Colors.green },
  assignHint: { color: Colors.textDim, fontSize: Typography.sm },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: '700',
  },
  emptyBtn: {
    backgroundColor: Colors.green,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyBtnText: { color: Colors.greenDark, fontWeight: '800', fontSize: Typography.base },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#070A0ED1',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  modalCloseBtn: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderMid,
  },
  modalCloseBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
});
