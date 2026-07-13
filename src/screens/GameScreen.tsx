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
import { useResponsive } from '../hooks/useResponsive';
import { PlayerDetailPanel } from '../components/PlayerDetailPanel';
import { InfoChip } from '../components/InfoChip';
import { SegmentedControl } from '../components/SegmentedControl';
import { SelectablePill } from '../components/SelectablePill';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OFFENSE_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'FLEX2'];
const DEFENSE_POSITIONS: Position[] = ['EDGE', 'DT', 'LB', 'CB', 'S', 'D-FLEX'];
const SLOT_FILTER_OPTIONS: { value: 'offense' | 'defense'; label: string }[] = [
  { value: 'offense', label: 'OFF' },
  { value: 'defense', label: 'DEF' },
];
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
  const { isWide } = useResponsive();
  const {
    mode,
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

  // Gridiron IQ ("trust your instincts", docs/handoff/05-game-loop-bugfixes.md
  // P1): hide OVR and the rating-derived tier badge everywhere in the draft
  // screen — actual box-score stats stay visible, only the computed
  // quality signal is hidden.
  const hideRating = mode === 'iq';
  const spinRouteName = mode === 'timer' ? 'TwoMinuteDrillSpin' : 'Spin';
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
      navigation.replace(spinRouteName);
    }
  }, [currentSpin, isComplete, navigation, spinRouteName]);

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
    // On wide layouts the detail lives in a persistent side panel — only
    // narrow layouts need the bottom-sheet Modal to surface it.
    if (!isWide) setStatsModalVisible(true);
  }

  function renderSlot(position: Position) {
    const filled = Boolean(roster[position]);
    const isEligible = selectedEligibleSlots.includes(position);
    const disabled = filled || !selectedPlayer || !isEligible;

    return (
      <SelectablePill
        key={position}
        label={position}
        selected={!filled && isEligible}
        filled={filled}
        disabled={disabled}
        onPress={() => handleAssign(position)}
        style={styles.slot}
      />
    );
  }

  function renderAssignBlock(variantStyle?: object) {
    return (
      <View style={[styles.assignWrap, variantStyle]}>
        <View style={styles.assignHeaderRow}>
          <Text style={styles.assignLabel}>ASSIGN TO SLOT</Text>
          <SegmentedControl compact options={SLOT_FILTER_OPTIONS} value={slotFilter} onChange={setSlotFilter} />
        </View>
        <View style={styles.slotGrid}>
          {filteredSlotPositions.map((position) => renderSlot(position))}
        </View>
        {openSlots.length === 0 && <Text style={styles.assignHint}>Roster complete.</Text>}
      </View>
    );
  }

  function renderPlayerList() {
    return (
      <>
        <Text style={styles.sectionTitle}>Available Players</Text>
        {candidates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No players for this spin</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.replace(spinRouteName)}>
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
                          <Text style={styles.playerMeta}>
                            {candidate.team} · {parseYear(candidate.years)}
                            {!hideRating && candidate.tier ? <Text style={styles.playerMetaTier}> · {candidate.tier}</Text> : null}
                          </Text>
                        </View>
                      </View>
                      {!hideRating && (
                        <View style={styles.rowRight}>
                          <Text style={styles.metricValue}>{candidate.rating}</Text>
                          <Text style={styles.metricLabel}>OVR</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </>
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
              <InfoChip label="TEAM" value={currentSpin.team.abbr} accentColor={Colors.gold} />
              <InfoChip label="ERA" value={currentSpin.era} accentColor={Colors.gridironBlue} labelColor="#5C9BCF" />
            </>
          )}
          <View style={styles.rerollPillWrap}>
            <InfoChip label="REROLL" value={String(rerollsRemaining)} />
          </View>
        </View>
      </View>

      <Text style={styles.helper}>Tap a player for details, then assign from the bottom slots.</Text>

      <View style={styles.divider} />

      {isWide ? (
        <View style={styles.wideRow}>
          <View style={styles.widePaneLeft}>
            {renderPlayerList()}
          </View>
          <View style={styles.widePaneRight}>
            {renderAssignBlock(styles.assignWrapWide)}
            <ScrollView style={styles.detailPanel} contentContainerStyle={styles.detailPanelContent}>
              <PlayerDetailPanel
                player={selectedPlayer}
                fallbackStatMetrics={fallbackStatMetrics}
                quickAssignSlots={quickAssignSlots}
                onAssign={handleAssign}
                hideRating={hideRating}
              />
            </ScrollView>
          </View>
        </View>
      ) : (
        <>
          {renderPlayerList()}
          {renderAssignBlock()}
        </>
      )}

      <Modal
        visible={!isWide && statsModalVisible && !!selectedPlayer}
        animationType="slide"
        transparent
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStatsModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <PlayerDetailPanel
              player={selectedPlayer}
              fallbackStatMetrics={fallbackStatMetrics}
              quickAssignSlots={quickAssignSlots}
              onAssign={handleAssign}
              onClose={() => setStatsModalVisible(false)}
              hideRating={hideRating}
            />
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
  rerollPillWrap: {
    marginLeft: 'auto',
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

  // ── WIDE TWO-PANE LAYOUT
  wideRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: 4,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  widePaneLeft: {
    flex: 1.4,
    minWidth: 0,
  },
  widePaneRight: {
    flex: 1,
    maxWidth: 420,
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  assignWrapWide: {
    marginTop: 4,
    marginBottom: 0,
  },
  detailPanel: {
    flex: 1,
    backgroundColor: Colors.bgCardDeep,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailPanelContent: {
    padding: 14,
    flexGrow: 1,
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
    fontFamily: Font.secondaryRegular,
    marginTop: 2
  },
  playerMetaTier: {
    color: Colors.gold,
    fontFamily: Font.primarySemiBold,
  },
  rowRight: { alignItems: 'flex-end' },
  metricValue: {
    color: Colors.gold,
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
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  slot: {
    width: '32%',
  },
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
    fontFamily: Font.primaryBold,
  },
  emptyBtn: {
    backgroundColor: Colors.green,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyBtnText: { color: Colors.greenDark, fontFamily: Font.primaryBold, fontSize: Typography.base },
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
});
