// Dynasty mode pack pull logic (docs/handoff/03-legacy-mode.md, section 3
// "Packs"). Perk packs have been retired (for now) — every pack is a player
// pack that opens PACK_CARD_COUNT cards at once.
import { formatStats, GENERATED_RECORDS, GeneratedEra, Position } from './players';

export const PACK_CARD_COUNT = 4;

export type PackRarity = 'common' | 'rare' | 'elite' | 'legend';

export const PACK_RARITIES: PackRarity[] = ['common', 'rare', 'elite', 'legend'];

export interface PackPlayer {
  id: string;
  name: string;
  team: string;
  era: GeneratedEra;
  rating: number;
  rarity: PackRarity;
  position: Position;
  // Same per-position season-snapshot formatting as the draft flow's
  // player cards (data/players.ts formatStats()) — reused here rather than
  // forked so a pack pull shows the same stat line the draft would.
  stats: string;
}

// Same generated-position -> draft-slot mapping used for the spin draft
// (data/players.ts GENERATED_POSITION_MAP), collapsed to one primary slot
// per player since a pack pull isn't scoped to a set of open positions.
const PRIMARY_DRAFT_POSITION: Record<string, Position> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE',
  EDGE: 'EDGE', DL: 'DT', DT: 'DT', LB: 'LB', CB: 'CB', S: 'S', DB: 'S',
};

// TODO_BALANCE: rating bands mapped to pack rarity are placeholders — not
// yet confirmed by product. docs/handoff/03-legacy-mode.md > DECISION NEEDED
// (pack pull odds / conversion values).
const RARITY_RATING_BANDS: Record<PackRarity, { min: number; max: number }> = {
  common: { min: 0, max: 64 },
  rare: { min: 65, max: 79 },
  elite: { min: 80, max: 89 },
  legend: { min: 90, max: 100 },
};

// TODO_BALANCE: dupe-pull Rings refund value is a placeholder — see
// docs/handoff/03-legacy-mode.md > DECISION NEEDED ("dupe protection").
export const TODO_BALANCE_DUPE_REFUND_RINGS = 25;

// TODO_BALANCE: flat Rings surcharge for locking a pack purchase to one era
// (docs/handoff/gridiron-legends-shop-mockups.html) — narrows the pull pool
// to that era only, same tier odds. Applies once per pack, regardless of
// tier.
export const TODO_BALANCE_ERA_LOCK_SURCHARGE_RINGS = 50;

export type PackTierId = 'rookie' | 'pro' | 'legend';

export interface PackTier {
  id: PackTierId;
  label: string;
  // Short code for compact UI (My Packs row icons).
  shortCode: string;
  // Odds-bar badge text (BASE / RARE+ / ELITE+).
  badge: string;
  cost: number;
  // Per-tier pull weights — each tier has its own odds curve rather than
  // sharing one global table (docs/handoff/gridiron-legends-shop-mockups.html:
  // "Revised odds ... more generous per tier").
  weights: Record<PackRarity, number>;
  // If none of the PACK_CARD_COUNT pulled cards meet this rarity or better,
  // the lowest-rarity card is upgraded to it after the fact (see
  // applyGuaranteeFloor below) — not a forced slot rolled up front.
  guaranteedMinRarity?: PackRarity;
  description: string;
}

// TODO_BALANCE: tier costs and odds are placeholders pending product
// balancing — see docs/handoff/03-legacy-mode.md > DECISION NEEDED
// ("Packs") and docs/handoff/gridiron-legends-shop-mockups.html.
export const PACK_TIERS: PackTier[] = [
  {
    id: 'rookie',
    label: 'Rookie Pack',
    shortCode: 'RKI',
    badge: 'BASE',
    cost: 100,
    weights: { common: 45, rare: 35, elite: 15, legend: 5 },
    description: 'No guarantee — standard odds',
  },
  {
    id: 'pro',
    label: 'Pro Pack',
    shortCode: 'PRO',
    badge: 'RARE+',
    cost: 280,
    weights: { common: 20, rare: 40, elite: 30, legend: 10 },
    guaranteedMinRarity: 'rare',
    description: 'Guaranteed: 1+ Rare or better',
  },
  {
    id: 'legend',
    label: 'Legend Pack',
    shortCode: 'LEG',
    badge: 'ELITE+',
    cost: 650,
    weights: { common: 5, rare: 20, elite: 45, legend: 30 },
    guaranteedMinRarity: 'elite',
    description: 'Guaranteed: 1+ Elite or better',
  },
];

function ratingToRarity(rating: number): PackRarity {
  const found = PACK_RARITIES.find((rarity) => {
    const band = RARITY_RATING_BANDS[rarity];
    return rating >= band.min && rating <= band.max;
  });
  return found ?? 'common';
}

const PACK_PLAYER_POOL: PackPlayer[] = GENERATED_RECORDS
  .filter((record) => Boolean(record.name?.trim()))
  .map((record) => {
    const position = PRIMARY_DRAFT_POSITION[record.position];
    if (!position) return null;
    const rating = typeof record.ratings?.overall === 'number' ? record.ratings.overall : 40;
    const player: PackPlayer = {
      id: record.id,
      name: (record.name ?? '').trim(),
      team: record.team,
      era: record.era,
      rating,
      rarity: ratingToRarity(rating),
      position,
      stats: formatStats(record, position),
    };
    return player;
  })
  .filter((player): player is PackPlayer => Boolean(player));

// Weighted-random roll over a tier's own odds table.
function rollRarity(weights: Record<PackRarity, number>): PackRarity {
  const totalWeight = PACK_RARITIES.reduce((sum, rarity) => sum + weights[rarity], 0);
  let roll = Math.random() * totalWeight;
  for (const rarity of PACK_RARITIES) {
    roll -= weights[rarity];
    if (roll <= 0) return rarity;
  }
  return PACK_RARITIES[PACK_RARITIES.length - 1];
}

function rarityIndex(rarity: PackRarity): number {
  return PACK_RARITIES.indexOf(rarity);
}

// Pulls `count` distinct players from `pool` (no repeats within the same
// pack) at the given rarity, falling back to any not-yet-pulled pool player
// if that rarity has no candidates left (small era-locked pools can be
// thin). Returns null only if the whole pool is already exhausted.
function pickOne(pool: PackPlayer[], usedIds: Set<string>, rarity: PackRarity): PackPlayer | null {
  const candidates = pool.filter((player) => player.rarity === rarity && !usedIds.has(player.id));
  const fallback = candidates.length > 0 ? candidates : pool.filter((player) => !usedIds.has(player.id));
  if (fallback.length === 0) return null;

  const picked = fallback[Math.floor(Math.random() * fallback.length)];
  usedIds.add(picked.id);
  return picked;
}

// If none of the pulled cards meet the tier's guaranteed floor, the
// lowest-rarity card is re-rolled at (or above) that floor — an after-the-
// fact top-up rather than a slot forced up front
// (docs/handoff/gridiron-legends-shop-mockups.html: "If all 4 rolls land
// below Elite, the lowest-rarity card is upgraded automatically").
function applyGuaranteeFloor(
  pulled: PackPlayer[],
  usedIds: Set<string>,
  pool: PackPlayer[],
  floor: PackRarity,
): PackPlayer[] {
  if (pulled.length === 0 || pulled.some((card) => rarityIndex(card.rarity) >= rarityIndex(floor))) {
    return pulled;
  }

  let lowestIndex = 0;
  pulled.forEach((card, i) => {
    if (rarityIndex(card.rarity) < rarityIndex(pulled[lowestIndex].rarity)) lowestIndex = i;
  });

  usedIds.delete(pulled[lowestIndex].id);
  const upgraded = pickOne(pool, usedIds, floor);
  if (!upgraded) return pulled;

  const next = [...pulled];
  next[lowestIndex] = upgraded;
  return next;
}

// Pulls a tier's PACK_CARD_COUNT cards, each independently rolled against
// that tier's own odds table (data/packs.ts PACK_TIERS), then applies the
// tier's guarantee floor if it has one. `eraLock` narrows the pull pool to
// one era with no change to the rarity odds themselves (era lock is a price
// surcharge + pool filter, not an odds boost).
export function pullPlayerPack(tier: PackTier, eraLock?: GeneratedEra): PackPlayer[] {
  const pool = eraLock ? PACK_PLAYER_POOL.filter((player) => player.era === eraLock) : PACK_PLAYER_POOL;
  if (pool.length === 0) return [];

  const pulled: PackPlayer[] = [];
  const usedIds = new Set<string>();

  while (pulled.length < PACK_CARD_COUNT) {
    const rarity = rollRarity(tier.weights);
    const picked = pickOne(pool, usedIds, rarity);
    if (!picked) break;
    pulled.push(picked);
  }

  return tier.guaranteedMinRarity
    ? applyGuaranteeFloor(pulled, usedIds, pool, tier.guaranteedMinRarity)
    : pulled;
}
