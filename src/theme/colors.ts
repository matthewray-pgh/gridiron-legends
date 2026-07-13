// Undefeated brand tokens: midnight black, steel silver, championship gold, and gridiron blue.
export const Colors = {
  // Backgrounds
  bgPrimary: '#0B0F14',
  bgCard: '#121A23',
  bgCardDeep: '#0D141C',
  bgNavy: '#123B5D',
  bgDark: '#070A0E',

  // Accent
  green: '#48B56B',
  greenDark: '#0B2A18',
  greenMuted: '#48B56B33',
  gold: '#D4A017',
  goldMuted: '#D4A01733',
  steel: '#A7B1BC',
  steelDark: '#7A8B9C',
  gridironBlue: '#123B5D',

  // Text
  textPrimary: '#F5F7FA',
  textSecondary: '#A7B1BC',
  textMuted: '#7A8B9C',
  textDim: '#5E6C79',

  // Borders
  border: '#213244',
  borderMid: '#314759',

  // Semantic
  win: '#22C55E',
  loss: '#EF4444',
  silver: '#94A3B8',
  bronze: '#B45309',

  // Tier
  goatBg: '#2A2110',
  goatText: '#F4C74D',
  goatBorder: '#D4A017',
  legendBg: '#1A2028',
  legendText: '#D2D9E1',
  legendBorder: '#A7B1BC',
  eliteBg: '#11253A',
  eliteText: '#7CB2E0',
  eliteBorder: '#2F6A9D',

  // Broadcast-scoreboard home screen (docs/handoff/01-home-screen.md)
  tickerText: '#3A2600', // dark warm brown, for text on solid-gold ticker backgrounds

  // Dynasty mode pack-pull rarity (docs/handoff/03-legacy-mode.md), values
  // carried directly from the reference mockup's rarity token set.
  rarityCommon: '#A7B1BC',
  rarityRare: '#3E8DE0',
  rarityElite: '#9B6FE3',
  rarityLegend: '#F0C24B',
};

export const Typography = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

export const Radius = {
  sharp: 2, // broadcast-scoreboard home screen (docs/handoff/01-home-screen.md) — sharp corners, not the rounded-card scale below
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const Font = {
  primaryRegular: 'BebasNeue_400Regular',
  primaryMedium: 'BebasNeue_400Regular',
  primarySemiBold: 'BebasNeue_400Regular',
  primaryBold: 'BebasNeue_400Regular',
  secondaryRegular: 'Inter_400Regular',
  secondaryMedium: 'Inter_500Medium',
  secondarySemiBold: 'Inter_600SemiBold',
  secondaryBold: 'Inter_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};
