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
import { Position, parseYear } from '../data/players';
import { positionsForMode, useGameStore } from '../store/gameStore';
import { useResponsive } from '../hooks/useResponsive';
import { SHOW_DEBUG_OVR } from '../config/featureFlags';
import { getFullStatMetrics, getRowStatMetrics } from '../utils/statMetrics';
import { PlayerDetailPanel } from '../components/PlayerDetailPanel';
import { PlayerRow } from '../components/PlayerRow';
import { PlayerRowStats } from '../components/PlayerRowStats';
import { InfoChip } from '../components/InfoChip';
import { SelectablePill } from '../components/SelectablePill';
import { BrandBackground } from '../components/BrandBackground';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OFFENSE_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'FLEX2'];
const DEFENSE_POSITIONS: Position[] = ['EDGE', 'DT', 'LB', 'CB', 'S', 'D-FLEX'];

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

  // docs/handoff/09-ovr-visibility-reversal.md reverses the earlier "OVR
  // hidden by default" decision — stats (and, behind SHOW_DEBUG_OVR, OVR
  // itself) show in every mode now. Gridiron IQ's "stats hidden" mode this
  // used to branch on is retired (docs/handoff/10-offense-only-mode.md), so
  // there's no longer a mode that hides either.
  const spinRouteName = mode === 'timer' ? 'TwoMinuteDrillSpin' : 'Spin';
  const candidates = currentCandidates();
  const selectedPlayer = currentPlayer();
  const selectedCandidateId = candidates[playerIndex]?.id;
  const openSlots = openPositions();
  const selectedEligibleSlots = selectedPlayer?.eligiblePositions ?? [];
  const quickAssignSlots = selectedEligibleSlots.filter((position) => !roster[position]);
  const activePositions = positionsForMode(mode);
  const progressLabel = `${positionIndex + 1}/${activePositions.length}`;
  // Offense Only's 9 slots are all offense, all at once — no offense/defense
  // phase split to make. Every other mode keeps the original two-phase
  // split (first 6 rounds offense, next 6 defense).
  const isOffenseOnlyMode = mode === 'offense';
  const positionTypeLabel = isOffenseOnlyMode ? 'OFFENSE' : (positionIndex <= 5 ? 'OFFENSE' : 'DEFENSE');
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const applicablePositions = isOffenseOnlyMode
    ? activePositions
    : (positionIndex <= 5 ? OFFENSE_POSITIONS : DEFENSE_POSITIONS);
  const groupedCandidates = applicablePositions
    .map((position) => ({
      position,
      entries: candidates
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => candidate.position === position)
        .sort(({ candidate: a }, { candidate: b }) => {
          // docs/handoff/09-ovr-visibility-reversal.md section 2: year
          // ascending (oldest season first), then alphabetical by name —
          // in every mode, no exceptions. OVR must never be a sort key.
          const yearA = parseYear(a.years);
          const yearB = parseYear(b.years);
          if (yearA !== yearB) {
            return yearA.localeCompare(yearB);
          }
          return a.name.localeCompare(b.name);
        }),
    }))
    .filter((group) => group.entries.length > 0);

  const fallbackStatMetrics = useMemo(() => getFullStatMetrics(selectedPlayer), [selectedPlayer]);

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
        <Text style={styles.assignLabel}>ASSIGN TO SLOT</Text>
        <View style={styles.slotGrid}>
          {applicablePositions.map((position) => renderSlot(position))}
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
                    <PlayerRow
                      key={candidate.id}
                      position={candidate.position}
                      name={candidate.name}
                      meta={`${candidate.team} · ${parseYear(candidate.years)}`}
                      ovr={SHOW_DEBUG_OVR ? candidate.rating : undefined}
                      selected={selected}
                      onPress={() => handleSelectPlayer(index)}
                      right={<PlayerRowStats metrics={getRowStatMetrics(candidate)} />}
                    />
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
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <BrandBackground variant="header" style={styles.topBar}>
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
              <InfoChip style={styles.infoChipGrow} label="TEAM" value={currentSpin.team.abbr} accentColor={Colors.gold} />
              <InfoChip style={styles.infoChipGrow} label="ERA" value={currentSpin.era} accentColor={Colors.gridironBlue} labelColor="#5C9BCF" />
            </>
          )}
          <View style={styles.rerollPillWrap}>
            <InfoChip label="REROLL" value={String(rerollsRemaining)} />
          </View>
        </View>
      </BrandBackground>

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
                ovr={SHOW_DEBUG_OVR ? selectedPlayer?.rating : undefined}
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
              ovr={SHOW_DEBUG_OVR ? selectedPlayer?.rating : undefined}
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
  infoChipGrow: {
    flex: 1,
    alignItems: 'center',
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
  assignWrap: {
    marginTop: 6,
    marginBottom: 8,
    paddingVertical: 8,
    gap: 8,
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
