import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography, Font } from '../theme/colors';
import { DRAFT_POSITIONS, Player, Position, isOffensePosition, parseYear } from '../data/players';
import { BENCH_CAPACITY, DynastyRoster, retireRingsReward, useDynastyStore } from '../store/dynastyStore';
import { SHOW_DEBUG_OVR } from '../config/featureFlags';
import { getRowStatMetrics } from '../utils/statMetrics';
import { useLastNonNull } from '../hooks/useAnimations';
import { FadeInOut } from './animation/FadeInOut';
import { PlayerRow } from './PlayerRow';
import { RingsIcon } from './RingsIcon';
import { PlayerRowStats } from './PlayerRowStats';
import { PlayerDetailAction } from './PlayerDetailPanel';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

type Selection = { player: Player; kind: 'starter' | 'bench'; position?: Position };

// docs/handoff/11-roster-management-restructure.md section 2 — which native
// positions are eligible for each roster slot. Exact-match slots (QB, EDGE,
// ...) are just an eligibility array of one; FLEX/FLEX2 and D-FLEX are the
// only many-to-one slots. This is the Position-space analog of
// data/players.ts's GENERATED_POSITION_MAP (which maps slots to the raw
// *generated* position categories used to build the candidate pool) — this
// one operates on already-resolved Player.position values instead.
const SLOT_ELIGIBILITY: Record<Position, Position[]> = {
  QB: ['QB'], QB2: ['QB'],
  RB: ['RB'], RB2: ['RB'],
  WR: ['WR'], WR2: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  FLEX2: ['RB', 'WR', 'TE'],
  EDGE: ['EDGE'],
  DT: ['DT'],
  LB: ['LB'],
  CB: ['CB'],
  S: ['S'],
  'D-FLEX': ['EDGE', 'DT', 'LB', 'CB', 'S'],
};

// Which starter slots in the current roster could this player legally
// fill? Excludes the slot they already occupy (if they're a starter) —
// that's not a "move," it's where they already are.
function getEligibleSlots(player: Player, roster: DynastyRoster): Position[] {
  const currentSlot = (Object.keys(roster) as Position[]).find((slot) => roster[slot]?.id === player.id);
  return DRAFT_POSITIONS.filter((slot) => slot !== currentSlot && SLOT_ELIGIBILITY[slot].includes(player.position));
}

// Which bench players could legally fill this specific starter slot?
function getEligibleBenchCandidates(pos: Position, bench: Player[]): Player[] {
  return bench.filter((player) => SLOT_ELIGIBILITY[pos].includes(player.position));
}

// Dynasty's Roster tab, rebuilt as a staged editor (confirmed with the
// user): Bench/Start/Retire/Release only mutate local pending state here —
// nothing reaches the store until "Save Changes" commits it all atomically
// via commitLineup(). This lets the bench temporarily go over
// BENCH_CAPACITY while rearranging (e.g. benching a starter with no room
// yet); Save just stays disabled until it's back at/under capacity instead
// of blocking the individual move.
//
// All the staged-edit state/logic lives here as a hook rather than inside a
// single self-contained component — docs/handoff/gridiron-legends-dynasty-
// web.html's wide layout needs DynastyHomeScreen itself to know whether a
// player is selected (to decide whether its right-hand pane shows the
// season overview or the player detail panel), so the selection state has
// to be visible one level up, not trapped inside this module. Narrow keeps
// the previous bottom-sheet-modal presentation; wide swaps the modal for a
// persistent side pane. Both read/write the same editor instance.
export function useRosterEditor() {
  const storeRoster = useDynastyStore((s) => s.roster);
  const storeBench = useDynastyStore((s) => s.bench);
  const commitLineup = useDynastyStore((s) => s.commitLineup);

  const [pendingRoster, setPendingRoster] = useState<DynastyRoster>(storeRoster);
  const [pendingBench, setPendingBench] = useState<Player[]>(storeBench);
  const [pendingRetirees, setPendingRetirees] = useState<Player[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  // Rings earned from this commit's retirements/releases (docs/handoff/
  // 19-season-flow-pack-rebalance-shop-polish_1.md, section 3) — the player
  // should see what they earned, not have Rings silently increment.
  const [retireRewardEarned, setRetireRewardEarned] = useState<number | null>(null);

  // Resync from the store when there's no open edit session — e.g. a pack
  // opened elsewhere just wrote to roster/bench directly. If the user has
  // unsaved edits in progress, their local session wins instead of being
  // silently clobbered; they still see the live store once they Save or
  // Discard.
  useEffect(() => {
    if (!dirty) {
      setPendingRoster(storeRoster);
      setPendingBench(storeBench);
    }
  }, [storeRoster, storeBench, dirty]);

  const overCapacity = pendingBench.length > BENCH_CAPACITY;
  const canSave = dirty && !overCapacity;

  // docs/handoff/11-roster-management-restructure.md section 4: swaps
  // execute immediately on tap, no confirmation step — there's no ambiguity
  // in where the displaced player goes (bench<->slot is symmetric), and
  // it's still fully reversible via the existing staged-editor Discard.

  // Bench player -> a starter slot, whether that slot is empty (plain
  // start, no displacement) or occupied (occupant goes to the bench) — the
  // same operation either way, just conditionally pushing a displaced
  // player back onto the bench.
  function moveBenchPlayerToSlot(benchPlayer: Player, slot: Position) {
    const occupant = pendingRoster[slot];
    setPendingRoster((prev) => ({ ...prev, [slot]: benchPlayer }));
    setPendingBench((prev) => {
      const next = prev.filter((p) => p.id !== benchPlayer.id);
      if (occupant) next.push(occupant);
      return next;
    });
    setDirty(true);
  }

  // Starter slot -> a different starter slot (e.g. native WR <-> FLEX).
  // Callers (selectedActions below) have already verified this is legal in
  // both directions before offering it — if the target's occupied, the
  // occupant is guaranteed eligible for `fromPos` too.
  function moveStarterToSlot(fromPos: Position, toPos: Position) {
    const mover = pendingRoster[fromPos];
    if (!mover) return;
    const occupant = pendingRoster[toPos];
    setPendingRoster((prev) => {
      const next = { ...prev };
      delete next[fromPos];
      next[toPos] = mover;
      if (occupant) next[fromPos] = occupant;
      return next;
    });
    setDirty(true);
  }

  function retireStarter(pos: Position) {
    const player = pendingRoster[pos];
    if (!player || !starterHasBenchReplacement(pos)) return;
    const next = { ...pendingRoster };
    delete next[pos];
    setPendingRoster(next);
    setPendingRetirees((prev) => [...prev, player]);
    setDirty(true);
  }

  function releaseBenchPlayer(player: Player) {
    if (!benchPlayerHasReplacement(player)) return;
    setPendingBench((prev) => prev.filter((p) => p.id !== player.id));
    setPendingRetirees((prev) => [...prev, player]);
    setDirty(true);
  }

  function handleSave() {
    if (!canSave) return;
    const reward = commitLineup(pendingRoster, pendingBench, pendingRetirees);
    if (reward > 0) {
      setRetireRewardEarned(reward);
      setTimeout(() => setRetireRewardEarned(null), 2500);
    }
    setPendingRetirees([]);
    setDirty(false);
  }

  function handleDiscard() {
    setPendingRoster(storeRoster);
    setPendingBench(storeBench);
    setPendingRetirees([]);
    setDirty(false);
  }

  // Retiring a player must never leave a position with zero way back in.
  // A starter can only retire if a bench player is waiting at that same
  // slot; a bench player can only retire if either the roster slot is
  // already covered by a starter, or another bench player shares that
  // slot — otherwise they're the last replacement standing for it.
  function starterHasBenchReplacement(pos: Position) {
    return pendingBench.some((p) => p.position === pos);
  }
  function benchPlayerHasReplacement(player: Player) {
    if (pendingRoster[player.position]) return true;
    return pendingBench.some((p) => p.id !== player.id && p.position === player.position);
  }

  let retireDisabled = false;
  let actionsNote: string | undefined;
  if (selected?.kind === 'starter') {
    retireDisabled = !starterHasBenchReplacement(selected.position!);
    if (retireDisabled) actionsNote = `No bench player at ${selected.position} to fill this slot — retire is blocked until you have a replacement.`;
  } else if (selected?.kind === 'bench') {
    retireDisabled = !benchPlayerHasReplacement(selected.player);
    if (retireDisabled) actionsNote = `This is the only replacement for the open ${selected.player.position} slot — retire is blocked until you have another.`;
  }

  // docs/handoff/11-roster-management-restructure.md section 3: the detail
  // panel's action list is now a dynamic set of valid moves for whoever's
  // selected, not a fixed Bench/Start + Retire pair.
  const selectedActions: PlayerDetailAction[] = [];
  if (selected) {
    if (selected.kind === 'bench') {
      const benchPlayer = selected.player;
      getEligibleSlots(benchPlayer, pendingRoster).forEach((slot) => {
        const occupant = pendingRoster[slot];
        selectedActions.push({
          label: occupant ? `Swap with ${occupant.name} — ${slot}` : `Start at ${slot}`,
          onPress: () => { moveBenchPlayerToSlot(benchPlayer, slot); setSelected(null); },
        });
      });
    } else {
      const fromPos = selected.position!;
      const starter = selected.player;

      getEligibleBenchCandidates(fromPos, pendingBench).forEach((benchPlayer) => {
        selectedActions.push({
          label: `Swap with ${benchPlayer.name}`,
          onPress: () => { moveBenchPlayerToSlot(benchPlayer, fromPos); setSelected(null); },
        });
      });

      // Starter-to-starter moves (e.g. native WR <-> FLEX) — a swap must be
      // validated in both directions: the mover must be eligible for the
      // target slot (guaranteed by getEligibleSlots) AND, if the target is
      // occupied, that occupant must be eligible for the slot they'd be
      // displaced into (`fromPos`). A TE sitting in FLEX can't be bumped
      // into a strict WR slot just because a WR wants into FLEX.
      getEligibleSlots(starter, pendingRoster).forEach((toPos) => {
        const occupant = pendingRoster[toPos];
        if (occupant && !SLOT_ELIGIBILITY[fromPos].includes(occupant.position)) return;
        selectedActions.push({
          label: occupant ? `Swap with ${occupant.name} — ${toPos}` : `Move to ${toPos}`,
          onPress: () => { moveStarterToSlot(fromPos, toPos); setSelected(null); },
        });
      });
    }

    selectedActions.push({
      label: <>Retire · +{retireRingsReward(selected.player)} <RingsIcon size={14} color={Colors.loss} /></>,
      destructive: true,
      disabled: retireDisabled,
      onPress: () => {
        if (selected.kind === 'starter') retireStarter(selected.position!);
        else releaseBenchPlayer(selected.player);
        setSelected(null);
      },
    });
  }

  return {
    pendingRoster, pendingBench, pendingRetirees, overCapacity, canSave, dirty,
    selected, setSelected, selectedActions, actionsNote,
    handleSave, handleDiscard, retireRewardEarned,
  };
}

export type RosterEditor = ReturnType<typeof useRosterEditor>;

// Retirement's Rings payout — fade+slide in (FadeInOut) plus a spring pop
// on the amount itself, matching ResultScreen.tsx's DailyRewardBanner
// treatment for the same "you just earned Rings" moment elsewhere in the
// app, rather than just materializing flat.
function RetireRewardBanner({ visible, amount }: { visible: boolean; amount: number | null }) {
  const pop = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }
  }, [visible, pop]);

  return (
    <FadeInOut visible={visible} translateY={-6}>
      <Animated.View style={[styles.retireRewardBanner, { transform: [{ scale: pop }] }]}>
        <Text style={styles.retireRewardText}>+{amount} <RingsIcon size={14} /> EARNED FROM RETIREMENT</Text>
      </Animated.View>
    </FadeInOut>
  );
}

// Roster + bench rows and the save bar — shared by the narrow (rows only,
// detail opens in a Modal — see DynastyHomeScreen) and wide (rows in
// widePaneLeft, detail is the persistent widePaneRight) layouts.
export function RosterList({ editor }: { editor: RosterEditor }) {
  const {
    pendingRoster, pendingBench, overCapacity, selected, setSelected, retireRewardEarned,
  } = editor;

  const lastRetireReward = useLastNonNull(retireRewardEarned);

  function renderStarterRow(pos: Position) {
    const starter = pendingRoster[pos];
    return starter ? (
      <PlayerRow
        key={pos}
        position={pos}
        name={starter.name}
        meta={`${starter.team} · ${parseYear(starter.years)}`}
        ovr={SHOW_DEBUG_OVR ? starter.rating : undefined}
        style={styles.rosterRow}
        selected={selected?.kind === 'starter' && selected.position === pos}
        onPress={() => setSelected({ player: starter, kind: 'starter', position: pos })}
        right={<PlayerRowStats metrics={getRowStatMetrics(starter)} />}
        testID="roster-starter-row"
      />
    ) : (
      <PlayerRow key={pos} position={pos} name="Empty" meta="No starter drafted" style={styles.rosterRow} />
    );
  }

  return (
    <>
      <RetireRewardBanner visible={retireRewardEarned !== null} amount={lastRetireReward} />

      <Text style={styles.sectionLabel}>Full roster</Text>
      <Text style={styles.subSectionLabel}>Offense</Text>
      {DRAFT_POSITIONS.filter(isOffensePosition).map((pos) => renderStarterRow(pos))}
      <Text style={styles.subSectionLabel}>Defense</Text>
      {DRAFT_POSITIONS.filter((pos) => !isOffensePosition(pos)).map((pos) => renderStarterRow(pos))}

      <Text style={[styles.sectionLabel, styles.benchSectionLabel]}>
        Bench ({pendingBench.length}/{BENCH_CAPACITY})
      </Text>
      {overCapacity && (
        <Text style={styles.warningText}>
          Bench is over capacity — start or release a player before saving.
        </Text>
      )}
      {pendingBench.length === 0 ? (
        <Text style={styles.emptyText}>Bench is empty — pack pulls can go here instead of starting.</Text>
      ) : (
        pendingBench
          .slice()
          .sort((a, b) => b.rating - a.rating)
          .map((player) => (
            <PlayerRow
              key={player.id}
              position={player.position}
              name={player.name}
              meta={`${player.team} · ${parseYear(player.years)}`}
              ovr={SHOW_DEBUG_OVR ? player.rating : undefined}
              style={styles.rosterRow}
              selected={selected?.kind === 'bench' && selected.player.id === player.id}
              onPress={() => setSelected({ player, kind: 'bench' })}
              right={<PlayerRowStats metrics={getRowStatMetrics(player)} />}
              testID="roster-bench-row"
            />
          ))
      )}
    </>
  );
}

// Discard/Save Changes panel, split out of RosterList — it used to render
// inline at the end of the roster+bench list, so it only appeared once
// scrolled all the way down and disappeared again as soon as you scrolled
// up. Rendered once by DynastyHomeScreen as a sibling of the scrollable
// roster pane(s) instead, absolutely positioned so it stays docked to the
// bottom of the screen regardless of scroll position — same `editor`
// instance, same dirty/canSave gating as before.
export function RosterSaveBar({ editor, onHeightChange }: {
  editor: RosterEditor;
  // Reports the bar's real rendered height back to the caller — the
  // pending-retirements section makes this variable (grows with however
  // many players are staged), so a static reserved-padding guess on the
  // scrollable panes above it can't be trusted to always clear it. See
  // DynastyHomeScreen's usage.
  onHeightChange?: (height: number) => void;
}) {
  const { dirty, canSave, pendingRetirees, handleSave, handleDiscard } = editor;
  const totalRetireValue = pendingRetirees.reduce((sum, player) => sum + retireRingsReward(player), 0);

  return (
    <FadeInOut visible={dirty} translateY={14} style={styles.saveBarFixed}>
      <View style={styles.saveBar} onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}>
        {/* Compiles this session's staged Bench/Release retirements (not yet
            committed — see pendingRetirees above) with what they'll pay out
            in Rings once Save Changes actually runs commitLineup(). Only the
            retire/release path earns anything here — start/bench moves are
            free rearranging, nothing to preview. */}
        {pendingRetirees.length > 0 && (
          <View style={styles.pendingRetireSection}>
            <Text style={styles.pendingRetireLabel}>
              Pending retirement{pendingRetirees.length > 1 ? 's' : ''}
            </Text>
            <ScrollView style={styles.pendingRetireList} showsVerticalScrollIndicator={false}>
              {pendingRetirees.map((player) => (
                <View key={player.id} style={styles.pendingRetireRow}>
                  <Text style={styles.pendingRetireName} numberOfLines={1}>{player.name}</Text>
                  <Text style={styles.pendingRetireValue}>+{retireRingsReward(player)} <RingsIcon size={11} color={Colors.loss} /></Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.pendingRetireTotalRow}>
              <Text style={styles.pendingRetireTotalLabel}>Rings earned if saved</Text>
              <Text style={styles.pendingRetireTotalValue}>+{totalRetireValue} <RingsIcon size={13} /></Text>
            </View>
          </View>
        )}

        <View style={styles.saveBarButtons}>
          <SecondaryButton label="Discard" onPress={handleDiscard} style={styles.discardBtn} />
          <PrimaryButton label="Save Changes" onPress={handleSave} disabled={!canSave} style={styles.saveBtn} />
        </View>
      </View>
    </FadeInOut>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Font.mono,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  // Nested under "Full roster" — dimmer/smaller than sectionLabel so the
  // Offense/Defense split reads as a subdivision of it, not a second
  // top-level section.
  subSectionLabel: {
    fontSize: Typography.xs, color: Colors.textMuted, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: Spacing.sm, marginBottom: 6,
  },
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, marginBottom: Spacing.lg, lineHeight: 20 },
  warningText: { color: Colors.loss, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold, marginBottom: Spacing.sm },
  retireRewardBanner: {
    marginBottom: Spacing.md, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.gold, backgroundColor: Colors.gold + '1A', alignItems: 'center',
  },
  retireRewardText: { fontSize: Typography.md, color: Colors.gold, fontFamily: Font.primaryBold, letterSpacing: 0.5 },

  rosterRow: { marginBottom: 6 },
  benchSectionLabel: { marginTop: Spacing.md },

  // Locked to the bottom of the screen (RosterSaveBar) rather than flowing
  // inline after the roster/bench list — position:'absolute' against the
  // nearest positioned ancestor, which is DynastyHomeScreen's SafeAreaView
  // (edges includes 'bottom', so this sits above the home-indicator inset
  // for free without adding a second safe-area padding on top of it).
  saveBarFixed: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
  },
  saveBar: {
    paddingTop: Spacing.md, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bgPrimary,
  },
  saveBarButtons: { flexDirection: 'row', gap: 10 },
  discardBtn: { flex: 1 },
  saveBtn: { flex: 1.4 },

  // Pending-retirements preview (RosterSaveBar) — capped height + its own
  // scroll so a longer list can't push the Discard/Save buttons off-screen.
  pendingRetireSection: { marginBottom: Spacing.md },
  pendingRetireLabel: {
    fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Font.mono,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  pendingRetireList: { maxHeight: 108 },
  pendingRetireRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 5,
  },
  pendingRetireName: { flex: 1, color: Colors.textPrimary, fontSize: Typography.base, fontFamily: Font.secondaryMedium, marginRight: 10 },
  pendingRetireValue: { color: Colors.loss, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },
  pendingRetireTotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  pendingRetireTotalLabel: { color: Colors.textSecondary, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold },
  pendingRetireTotalValue: { color: Colors.gold, fontSize: Typography.md, fontFamily: Font.primaryBold },
});
