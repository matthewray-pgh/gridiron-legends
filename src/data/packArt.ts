import { PackTierId } from './packs';

// Real product art for the foil-pack visuals (Shop tiles, PackRevealSequence's
// tap-to-open pack) — replaces PackShieldBadge's hand-drawn SVG shield.
// Source images are ~3:4 (width:height), transparent background.
const PACK_ART: Record<PackTierId, number> = {
  rookie: require('../../assets/packs/CardPack_Rookie.png'),
  pro: require('../../assets/packs/CardPack_Pro.png'),
  legend: require('../../assets/packs/CardPack_Legend.png'),
};

export function packArtFor(tierId: PackTierId) {
  return PACK_ART[tierId];
}

// Reward-reveal emblem art (e.g. ResultScreen's season-reward "You earned a
// {tier}!" card) — same shield concept PackShieldBadge drew by hand, now
// real art with the tier name baked in. Source images are all 320x403.
const EMBLEM_ART: Record<PackTierId, number> = {
  rookie: require('../../assets/emblems/Emblem__Rookie.png'),
  pro: require('../../assets/emblems/Emblem__Pro.png'),
  legend: require('../../assets/emblems/Emblem__Legend.png'),
};

export function emblemArtFor(tierId: PackTierId) {
  return EMBLEM_ART[tierId];
}
