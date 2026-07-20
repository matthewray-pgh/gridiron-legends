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

  function benchStarter(pos: Position) {
    const player = pendingRoster[pos];
    if (!player) return;
    const next = { ...pendingRoster };
    delete next[pos];
    setPendingRoster(next);
    setPendingBench((prev) => [...prev, player]);
    setDirty(true);
  }

  // Every player's `.position` is set to the exact slot they belong in at
  // draft/pack-pull time (a WR drafted into FLEX has `.position === 'FLEX'`,
  // not 'WR') — so it's always the one correct target slot, no eligible-
  // slot picker needed.
  function startFromBench(player: Player) {
    const pos = player.position;
    const displaced = pendingRoster[pos];
    setPendingRoster((prev) => ({ ...prev, [pos]: player }));
    setPendingBench((prev) => {
      const next = prev.filter((p) => p.id !== player.id);
      if (displaced) next.push(displaced);
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

  const selectedActions: PlayerDetailAction[] = !selected ? [] : selected.kind === 'starter'
    ? [
      { label: 'Bench', onPress: () => { benchStarter(selected.position!); setSelected(null); } },
      { label: 'Retire', destructive: true, disabled: retireDisabled, onPress: () => { retireStarter(selected.position!); setSelected(null); } },
    ]
    : [
      { label: 'Starter', onPress: () => { startFromBench(selected.player); setSelected(null); } },
      { label: 'Retire', destructive: true, disabled: retireDisabled, onPress: () => { releaseBenchPlayer(selected.player); setSelected(null); } },
    ];

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
