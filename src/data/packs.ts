// Dynasty mode pack pull logic (docs/handoff/03-legacy-mode.md, section 3
// "Packs"). Player packs and Perk packs stay as distinct types here rather
// than one generic "Pack" — their pull tables are unrelated.
import { GENERATED_RECORDS, GeneratedEra, Position } from './players';

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

// TODO_BALANCE: pull odds per rarity are placeholders.
const RARITY_PULL_WEIGHTS: Record<PackRarity, number> = {
  common: 60,
  rare: 27,
  elite: 10,
  legend: 3,
};

// TODO_BALANCE: dupe-pull Rings refund value is a placeholder — see
// docs/handoff/03-legacy-mode.md > DECISION NEEDED ("dupe protection").
export const TODO_BALANCE_DUPE_REFUND_RINGS = 25;

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
    };
    return player;
  })
  .filter((player): player is PackPlayer => Boolean(player));

function rollRarity(): PackRarity {
  const totalWeight = PACK_RARITIES.reduce((sum, rarity) => sum + RARITY_PULL_WEIGHTS[rarity], 0);
  let roll = Math.random() * totalWeight;
  for (const rarity of PACK_RARITIES) {
    roll -= RARITY_PULL_WEIGHTS[rarity];
    if (roll <= 0) return rarity;
  }
  return PACK_RARITIES[PACK_RARITIES.length - 1];
}

// Pulls a random player at a weighted-random rarity tier. Falls back to any
// pool player if the rolled tier has no candidates (small eras can be thin).
export function pullPlayerPack(): PackPlayer | null {
  if (PACK_PLAYER_POOL.length === 0) return null;

  const rarity = rollRarity();
  const candidates = PACK_PLAYER_POOL.filter((player) => player.rarity === rarity);
  const pool = candidates.length > 0 ? candidates : PACK_PLAYER_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}
