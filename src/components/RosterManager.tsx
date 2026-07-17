import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography, Font } from '../theme/colors';
import { DRAFT_POSITIONS, Player, Position, parseYear } from '../data/players';
import { BENCH_CAPACITY, DynastyRoster, useDynastyStore } from '../store/dynastyStore';
import { getFullStatMetrics, getRowStatMetrics } from '../utils/statMetrics';
import { PlayerRow } from './PlayerRow';
import { PlayerRowStats } from './PlayerRowStats';
import { PlayerDetailAction, PlayerDetailPanel } from './PlayerDetailPanel';
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
// Row/detail-card display matches GameScreen.tsx's draft-screen pattern
// (confirmed with the user): rows show compact stat chips via
// PlayerRowStats (no OVR), and tapping a row opens a bottom-sheet modal
// with PlayerDetailPanel — the same component the draft screen uses —
// showing conditional action buttons (Bench+Retire for a starter,
// Starter+Retire for a bench player) instead of the draft screen's
// Quick Assign slots.
export function RosterManager() {
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

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <PlayerDetailPanel
              player={selected?.player ?? null}
              fallbackStatMetrics={getFullStatMetrics(selected?.player ?? null)}
              actions={selectedActions}
              actionsNote={actionsNote}
              onClose={() => setSelected(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
