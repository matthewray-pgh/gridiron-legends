import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { getViableTeamAbbrs } from '../data/players';
import { ERA_OPTIONS, EraToken, TeamScope } from '../store/gameStore';
import { SegmentedControl } from './SegmentedControl';
import { SelectablePill } from './SelectablePill';
import { BrandBackground } from './BrandBackground';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

const VIABLE_TEAM_ABBRS = ['PIT', 'DAL', 'NE', 'SF', 'GB', 'BAL', 'MIA', 'KC', 'BUF', 'DEN', 'CHI', 'NYG'];

interface GameSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (params: { teamScope: TeamScope; selectedEras: EraToken[] }) => void;
}

// The team-scope + era picker every Spin/Draft entry point uses (Classic,
// Gridiron IQ, Two-Minute Drill, Daily, and Dynasty's one-time initial
// draft) — extracted from HomeScreen so DynastyHomeScreen can launch the
// same flow directly instead of forking a second setup sheet.
export function GameSetupModal({ visible, onClose, onStart }: GameSetupModalProps) {
  const [teamScope, setTeamScope] = useState<TeamScope>('all');
  const [selectedEras, setSelectedEras] = useState<EraToken[]>(ERA_OPTIONS);

  const viableSingleTeamCount = getViableTeamAbbrs(VIABLE_TEAM_ABBRS, selectedEras).length;
  const canStart = selectedEras.length > 0 && (teamScope === 'all' || viableSingleTeamCount > 0);

  function toggleEra(era: EraToken) {
    setSelectedEras((cur) => (cur.includes(era) ? cur.filter((e) => e !== era) : [...cur, era]));
  }

  function toggleSelectAllEras() {
    setSelectedEras((cur) => (cur.length === 0 ? ERA_OPTIONS : []));
  }

  function handleStart() {
    if (!canStart) return;
    onStart({ teamScope, selectedEras });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <BrandBackground variant="header" style={styles.sheetHeaderWrap}>
            <Text style={styles.sheetIcon}>⚔︎✕</Text>
            <Text style={styles.sheetTitle}>GAME SETUP</Text>
          </BrandBackground>
          <Text style={styles.sheetHint}>Configure constraints for each round's team + era spin.</Text>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>TEAMS</Text>
            <SegmentedControl
              options={[{ value: 'all', label: 'All teams' }, { value: 'single', label: 'One team' }]}
              value={teamScope}
              onChange={setTeamScope}
            />
            {teamScope === 'single' && (
              <Text style={styles.noteText}>
                {viableSingleTeamCount > 0
                  ? 'A viable franchise will be randomly assigned on Round 1 spin.'
                  : 'No supported franchise can cover every draft slot for this era mix.'}
              </Text>
            )}
          </View>

          <View style={styles.sheetSection}>
            <View style={styles.sheetSectionHeader}>
              <Text style={styles.sheetLabel}>ERAS</Text>
              <TouchableOpacity onPress={toggleSelectAllEras}>
                <Text style={styles.clearText}>{selectedEras.length === 0 ? 'Select all' : 'Clear all'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chipsWrap}>
              {ERA_OPTIONS.map((era) => (
                <SelectablePill
                  key={era}
                  label={era}
                  selected={selectedEras.includes(era)}
                  showCheck
                  onPress={() => toggleEra(era)}
                  style={styles.eraChip}
                />
              ))}
            </View>
            {!canStart && (
              <Text style={styles.warningText}>
                {selectedEras.length === 0
                  ? 'Select at least one era to continue'
                  : 'Switch to all teams or add more eras to start a one-team run'}
              </Text>
            )}
          </View>

          <View style={styles.sheetActions}>
            <SecondaryButton label="CANCEL" onPress={onClose} style={styles.cancelBtn} />
            <PrimaryButton label="Start Game" onPress={handleStart} disabled={!canStart} style={styles.startBtn} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#000000A8',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B121BDD',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: 18,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#8B6B2C',
  },
  sheetHeaderWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingVertical: 10,
  },
  sheetIcon: {
    fontSize: 23,
    color: Colors.gold,
    textAlign: 'center',
    fontFamily: Font.primaryBold,
    letterSpacing: 1,
  },
  sheetTitle: {
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Font.primaryBold,
    letterSpacing: 1.1,
    lineHeight: 36,
  },
  sheetHint: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: Font.secondaryRegular,
    lineHeight: 22,
  },
  sheetSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2D3B',
    paddingTop: 12,
  },
  sheetSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetLabel: {
    color: Colors.gold,
    fontSize: Typography.md,
    letterSpacing: 1.4,
    fontFamily: Font.primaryMedium,
  },
  clearText: {
    color: Colors.gold,
    fontSize: Typography.md,
    fontFamily: Font.primarySemiBold,
    letterSpacing: 1,
  },
  noteText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    marginTop: 8,
    fontFamily: Font.secondaryRegular,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  eraChip: {
    width: '48.5%',
    minHeight: 62,
  },
  warningText: {
    color: Colors.gold,
    fontSize: Typography.sm,
    marginTop: 8,
    fontFamily: Font.secondarySemiBold,
  },
  sheetActions: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2D3B',
    paddingTop: 12,
  },
  cancelBtn: { flex: 1 },
  startBtn: { flex: 1.5 },
});
