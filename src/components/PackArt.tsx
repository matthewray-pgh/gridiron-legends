import React from 'react';
import { Image } from 'react-native';
import { PackTierId } from '../data/packs';
import { packArtFor } from '../data/packArt';

// ~3:4 (width:height) across all three source images (CardPack_Rookie.png
// 366x491, _Pro 371x481, _Legend 379x497) — close enough to treat as one
// shared ratio rather than looking up each image's exact dimensions.
const ASPECT_RATIO = 3 / 4;
const DEFAULT_SIZE = 64;

interface PackArtProps {
  tierId: PackTierId;
  // Image width in px; height derives at ASPECT_RATIO.
  size?: number;
}

// Real foil-pack product art (Shop tiles, PackRevealSequence's tap-to-open
// pack) — replaces PackShieldBadge's hand-drawn SVG shield now that real
// art exists (assets/packs).
export function PackArt({ tierId, size = DEFAULT_SIZE }: PackArtProps) {
  return (
    <Image
      source={packArtFor(tierId)}
      style={{ width: size, height: size / ASPECT_RATIO }}
      resizeMode="contain"
    />
  );
}
