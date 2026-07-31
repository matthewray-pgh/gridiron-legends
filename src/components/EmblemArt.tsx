import React from 'react';
import { Image } from 'react-native';
import { PackTierId } from '../data/packs';
import { emblemArtFor } from '../data/packArt';

// All three source images (assets/emblems) are 320x403.
const ASPECT_RATIO = 320 / 403;
const DEFAULT_SIZE = 96;

interface EmblemArtProps {
  tierId: PackTierId;
  // Image width in px; height derives at ASPECT_RATIO.
  size?: number;
}

// Reward-reveal emblem art (e.g. ResultScreen's season-reward "You earned a
// {tier}!" card) — replaces PackShieldBadge's hand-drawn SVG shield now
// that real art exists (assets/emblems), tier name baked into the image.
export function EmblemArt({ tierId, size = DEFAULT_SIZE }: EmblemArtProps) {
  return (
    <Image
      source={emblemArtFor(tierId)}
      style={{ width: size, height: size / ASPECT_RATIO }}
      resizeMode="contain"
    />
  );
}
