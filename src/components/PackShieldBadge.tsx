import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { PackTierId } from '../data/packs';
import { Colors } from '../theme/colors';

// Shape/height ratio from the reference badge sheet's pentagon proportions
// (docs/handoff/18-shop-pack-shelf-redesign.md section 1's clip-path spec,
// reproduced here as an SVG polygon instead — clip-path is web-only and
// this needs to render on native too).
const ASPECT_RATIO = 0.86;
const DEFAULT_SIZE = 56;
const SHIELD_POINTS = '0,0 100,0 100,58 50,100 0,58';

// docs/handoff/18 §1 resolves DESIGN-SYSTEM.md §8's open "reconcile pack
// rarity with the 6-badge brand system" item: Rookie -> All Pro (star),
// Pro -> Elite (a visually heavier/larger star, per the brand sheet's
// "distinct shape accent" note for Elite), Legend -> Legend badge's slot,
// using a crown so it reads as the clear top tier at a glance. This is the
// doc's recommended mapping, not a re-derivation of the brand sheet itself.
export const TIER_ACCENT: Record<PackTierId, string> = {
  rookie: Colors.steel,
  pro: Colors.rarityRare,
  legend: Colors.rarityLegend,
};

type IconKind = 'star' | 'starHeavy' | 'crown';

const TIER_ICON: Record<PackTierId, IconKind> = {
  rookie: 'star',
  pro: 'starHeavy',
  legend: 'crown',
};

// Real vector paths, never Unicode emoji glyphs (doc 18 §1 — emoji render
// inconsistently across platforms and read as low-effort next to a
// beveled metallic badge). Coordinates sit in the same 0-100 viewBox as
// SHIELD_POINTS, centered in the shield's solid upper area (the pentagon
// tapers to a point below y~58, so icons are centered around cy=40-45).
const ICON_POINTS: Record<IconKind, string> = {
  // 5-point star, outer r=20 / inner r=8.
  star: '50,20 54.7,33.5 69,33.8 57.6,42.5 61.8,56.2 50,48 38.2,56.2 42.4,42.5 31,33.8 45.3,33.5',
  // Same star, thicker arms + slightly larger — Elite's "distinct weight"
  // accent relative to Rookie's plain star.
  starHeavy: '50,18 56.5,31.1 70.9,33.2 60.5,43.4 62.9,57.8 50,51 37.1,57.8 39.5,43.4 29.1,33.2 43.5,31.1',
  // Simple 3-peak crown silhouette over a base band.
  crown: '28,62 28,54 34,38 40,46 50,26 60,46 66,38 72,54 72,62',
};

interface PackShieldBadgeProps {
  tierId: PackTierId;
  // Shield height in px; width derives at ASPECT_RATIO.
  size?: number;
}

// Shared identity mark for a pack tier (docs/handoff/18-shop-pack-shelf-
// redesign.md section 1) — a beveled shield with a per-tier icon, reused by
// PackTile/WaitingPackTile/OwnedPackTile so all three read as one visual
// family instead of three one-off implementations.
export function PackShieldBadge({ tierId, size = DEFAULT_SIZE }: PackShieldBadgeProps) {
  const width = size * ASPECT_RATIO;
  const accent = TIER_ACCENT[tierId];
  const gradientId = `pack-shield-fill-${tierId}`;

  return (
    <Svg width={width} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* Light corner -> tier accent -> dark corner diagonal, the
            metallic-bevel look the doc calls for instead of a flat fill. */}
        <LinearGradient id={gradientId} x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%" stopColor="#F2F4F7" stopOpacity={0.95} />
          <Stop offset="45%" stopColor={accent} stopOpacity={1} />
          <Stop offset="100%" stopColor="#0B0F14" stopOpacity={0.92} />
        </LinearGradient>
      </Defs>
      <Polygon points={SHIELD_POINTS} fill={`url(#${gradientId})`} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
      <Polygon points={ICON_POINTS[TIER_ICON[tierId]]} fill="rgba(11,9,6,0.82)" />
    </Svg>
  );
}
