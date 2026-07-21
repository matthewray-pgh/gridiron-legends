import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Font } from '../theme/colors';
import { DRAFT_POSITIONS, Player, Position, parseYear } from '../data/players';
import { BENCH_CAPACITY, DynastyRoster, useDynastyStore } from '../store/dynastyStore';
import { SHOW_DEBUG_OVR } from '../config/featureFlags';
import { getRowStatMetrics } from '../utils/statMetrics';
import { PlayerRow } from './PlayerRow';
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
    commitLineup(pendingRoster, pendingBench, pendingRetirees);
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
      label: 'Retire',
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
    pendingRoster, pendingBench, overCapacity, canSave, dirty,
    selected, setSelected, selectedActions, actionsNote,
    handleSave, handleDiscard,
  };
}

export type RosterEditor = ReturnType<typeof useRosterEditor>;

// Roster + bench rows and the save bar — shared by the narrow (rows only,
// detail opens in a Modal — see DynastyHomeScreen) and wide (rows in
// widePaneLeft, detail is the persistent widePaneRight) layouts.
export function RosterList({ editor }: { editor: RosterEditor }) {
  const { pendingRoster, pendingBench, overCapacity, dirty, canSave, selected, setSelected, handleSave, handleDiscard } = editor;

  return (
    <>
      <Text style={styles.sectionLabel}>Full roster</Text>
      {DRAFT_POSITIONS.map((pos) => {
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
          />
        ) : (
          <PlayerRow key={pos} position={pos} name="Empty" meta="No starter drafted" style={styles.rosterRow} />
        );
      })}

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
            />
          ))
      )}

      {dirty && (
        <View style={styles.saveBar}>
          <View style={styles.saveBarButtons}>
            <SecondaryButton label="Discard" onPress={handleDiscard} style={styles.discardBtn} />
            <PrimaryButton label="Save Changes" onPress={handleSave} disabled={!canSave} style={styles.saveBtn} />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: Typography.xs, color: Colors.textSecondary, fontFamily: Font.mono,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  emptyText: { color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular, marginBottom: Spacing.lg, lineHeight: 20 },
  warningText: { color: Colors.loss, fontSize: Typography.sm, fontFamily: Font.secondarySemiBold, marginBottom: Spacing.sm },

  rosterRow: { marginBottom: 6 },
  benchSectionLabel: { marginTop: Spacing.md },

  saveBar: {
    marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBarButtons: { flexDirection: 'row', gap: 10 },
  discardBtn: { flex: 1 },
  saveBtn: { flex: 1.4 },
});
