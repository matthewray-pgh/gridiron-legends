import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player, TIER_COLORS } from '../data/players';
import { Colors, Radius, Typography } from '../theme/colors';

interface PlayerCardProps {
  player: Player;
  passCount: number;
  maxPasses: number;
  hideStats?: boolean;
  compact?: boolean;
}

export function PlayerCard({ player, passCount, maxPasses, hideStats = false, compact = false }: PlayerCardProps) {
  const tier = TIER_COLORS[player.tier];
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

  const ratingBars = Math.round((player.rating / 100) * 5);

  return (
    <View style={[styles.card, { borderColor: tier.border + '44' }, compact && styles.compact]}>
      {/* Tier badge + pass counter */}
      <View style={styles.topRow}>
        <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
          <Text style={[styles.tierText, { color: tier.text }]}>{player.tier}</Text>
        </View>
        <Text style={styles.passCounter}>
          Pass {passCount}/{maxPasses}
        </Text>
      </View>

      {/* Avatar */}
      {!compact && (
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { borderColor: tier.border, backgroundColor: tier.border + '22' }]}>
            <Text style={[styles.avatarText, { color: tier.border }]}>{initials}</Text>
          </View>
        </View>
      )}

      {/* Name & team */}
      <View style={styles.nameWrap}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.teamYear}>
          {player.team} • {player.years}
        </Text>
      </View>

      {/* Stats */}
      {!compact && (
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>CAREER STATS</Text>
          {hideStats ? (
            <Text style={styles.statsValue}>Stats hidden — trust your memory 🧠</Text>
          ) : (
            <Text style={styles.statsValue}>{player.stats}</Text>
          )}
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={i}
                style={[styles.ratingBar, { backgroundColor: i < ratingBars ? Colors.green : Colors.bgCard }]}
              />
            ))}
          </View>
          <Text style={styles.ovrText}>OVR {player.rating}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  compact: {
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierText: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1 },
  passCounter: { fontSize: Typography.sm, color: Colors.textDim },
  avatarWrap: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800' },
  nameWrap: { alignItems: 'center' },
  playerName: {
    fontSize: Typography['2xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  teamYear: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statsBox: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statsValue: { fontSize: Typography.base, color: Colors.textSecondary },
  ratingRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  ratingBar: { width: 20, height: 6, borderRadius: 3 },
  ovrText: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
});
