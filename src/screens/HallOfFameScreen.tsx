import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Font, Radius, Spacing, Typography } from '../theme/colors';
import { TIER_COLORS } from '../data/players';
import { useDynastyStore } from '../store/dynastyStore';
import { BrandBackground } from '../components/BrandBackground';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Not detailed in the reference mockups yet (docs/handoff/03-legacy-mode.md)
// — scoped as a simple list view for now, revisit visual design later.
export function HallOfFameScreen() {
  const navigation = useNavigation<Nav>();
  const hallOfFame = useDynastyStore((s) => s.hallOfFame);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <BrandBackground variant="header" style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>HALL OF FAME</Text>
      </BrandBackground>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {hallOfFame.length === 0 ? (
          <Text style={styles.emptyText}>No retired legends yet. Retire a roster player from the Roster tab to shelve them here.</Text>
        ) : (
          hallOfFame.map((entry, i) => (
            <View key={`${entry.player.id}-${i}`} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{entry.player.name}</Text>
                <Text style={styles.sub}>{entry.player.position} · Retired season {entry.retiredAtSeason} · {entry.careerRecord}</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[entry.player.tier].bg }]}>
                <Text style={[styles.tierText, { color: TIER_COLORS[entry.player.tier].text }]}>{entry.player.rating}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: Typography.xl, color: Colors.textMuted },
  toolbarTitle: { fontSize: Typography['2xl'], color: Colors.textPrimary, letterSpacing: 1.1, fontFamily: Font.primaryBold },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  emptyText: {
    color: Colors.textMuted, fontSize: Typography.base, fontFamily: Font.secondaryRegular,
    textAlign: 'center', marginTop: Spacing.xl, lineHeight: 20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: 12, marginBottom: 8,
  },
  rowLeft: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.lg, fontFamily: Font.primarySemiBold },
  sub: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.secondaryRegular, marginTop: 2 },
  tierBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  tierText: { fontSize: Typography.md, fontFamily: Font.secondaryBold },
});
