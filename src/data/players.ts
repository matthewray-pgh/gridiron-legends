export type Tier = 'GOAT' | 'Legend' | 'Elite';

export interface Player {
  id: string;
  name: string;
  team: string;
  years: string;
  stats: string;
  statValues?: Record<string, number>;
  rating: number;
  tier: Tier;
  position: Position;
  eligiblePositions?: Position[];
}

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'FLEX2' | 'EDGE' | 'DT' | 'LB' | 'CB' | 'S' | 'D-FLEX';

type GeneratedPosition =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'EDGE'
  | 'DL'
  | 'DT'
  | 'LB'
  | 'CB'
  | 'S'
  | 'DB';

interface GeneratedStats {
  completions: number;
  attempts: number;
  passingYards: number;
  passingTD: number;
  interceptions: number;
  passingAirYards: number;
  passingYardsAfterCatch: number;
  passingFirstDowns: number;
  rushingYards: number;
  rushingTD: number;
  rushingFirstDowns: number;
  rushingFumbles: number;
  rushingFumblesLost: number;
  receptions: number;
  targets: number;
  receivingYards: number;
  receivingTD: number;
  receivingAirYards: number;
  receivingYardsAfterCatch: number;
  receivingFirstDowns: number;
  receivingFumbles: number;
  receivingFumblesLost: number;
  tackles: number;
  sacks: number;
  tfl: number;
  qbHits: number;
  forcedFumbles: number;
  passesDefended: number;
  defTD: number;
}

export interface GeneratedPlayerRecord {
  id: string;
  playerId: string;
  name: string | null;
  team: string;
  era: GeneratedEra;
  position: GeneratedPosition | string;
  bestSeason: number;
  stats: GeneratedStats;
  ratings?: {
    overall?: number;
  };
}

const generatedData = require('../../data_generator/outputs/nfl_era_players.json') as {
  records?: GeneratedPlayerRecord[];
};

export const GENERATED_ERA_OPTIONS = [
  '2000-2005',
  '2006-2010',
  '2011-2015',
  '2016-2020',
  '2021-2025',
] as const;

export type GeneratedEra = (typeof GENERATED_ERA_OPTIONS)[number];

export const DRAFT_POSITIONS: Position[] = [
  'QB', 'RB', 'WR', 'TE', 'FLEX', 'FLEX2', 'EDGE', 'DT', 'LB', 'CB', 'S', 'D-FLEX',
];

const GENERATED_POSITION_MAP: Record<Position, GeneratedPosition[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  FLEX2: ['RB', 'WR', 'TE'],
  EDGE: ['EDGE'],
  DT: ['DL', 'DT'],
  LB: ['LB'],
  CB: ['CB', 'DB'],
  S: ['S', 'DB'],
  'D-FLEX': ['EDGE', 'DL', 'DT', 'LB', 'CB', 'S', 'DB'],
};

export const GENERATED_RECORDS = (generatedData.records ?? []).filter((record): record is GeneratedPlayerRecord => {
  return Boolean(
    record?.id
      && record.team
      && record.era
      && record.position
      && typeof record.bestSeason === 'number'
      && typeof record.name === 'string'
      && record.name.trim().length > 0,
  );
});

export function ratingToTier(rating: number): Tier {
  if (rating >= 95) return 'GOAT';
  if (rating >= 85) return 'Legend';
  return 'Elite';
}

function formatStatValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000) return Math.round(value).toLocaleString('en-US');
  if (value >= 100) return Math.round(value).toString();
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

function joinStatParts(parts: Array<string | null>): string {
  const visibleParts = parts.filter((part): part is string => Boolean(part));
  return visibleParts.length > 0 ? visibleParts.join(' • ') : 'Season snapshot unavailable';
}

function formatStats(record: GeneratedPlayerRecord, draftPosition: Position): string {
  const { stats } = record;

  switch (draftPosition) {
    case 'QB':
      return joinStatParts([
        stats.completions > 0 ? `${formatStatValue(stats.completions)} comp` : null,
        stats.attempts > 0 ? `${formatStatValue(stats.attempts)} att` : null,
        stats.passingYards > 0 ? `${formatStatValue(stats.passingYards)} pass yds` : null,
        stats.passingTD > 0 ? `${formatStatValue(stats.passingTD)} pass TD` : null,
        stats.interceptions > 0 ? `${formatStatValue(stats.interceptions)} INT` : null,
        stats.rushingYards > 0 ? `${formatStatValue(stats.rushingYards)} rush yds` : null,
      ]);
    case 'RB':
      return joinStatParts([
        stats.rushingYards > 0 ? `${formatStatValue(stats.rushingYards)} rush yds` : null,
        stats.rushingTD > 0 ? `${formatStatValue(stats.rushingTD)} rush TD` : null,
        stats.receptions > 0 ? `${formatStatValue(stats.receptions)} rec` : null,
        stats.targets > 0 ? `${formatStatValue(stats.targets)} tgt` : null,
        stats.receivingYards > 0 ? `${formatStatValue(stats.receivingYards)} rec yds` : null,
      ]);
    case 'WR':
    case 'TE':
    case 'FLEX':
    case 'FLEX2':
      return joinStatParts([
        stats.receptions > 0 ? `${formatStatValue(stats.receptions)} rec` : null,
        stats.targets > 0 ? `${formatStatValue(stats.targets)} tgt` : null,
        stats.receivingYards > 0 ? `${formatStatValue(stats.receivingYards)} rec yds` : null,
        stats.receivingTD > 0 ? `${formatStatValue(stats.receivingTD)} rec TD` : null,
        stats.receivingAirYards > 0 ? `${formatStatValue(stats.receivingAirYards)} air yds` : null,
        stats.receivingYardsAfterCatch > 0 ? `${formatStatValue(stats.receivingYardsAfterCatch)} YAC` : null,
        stats.rushingYards > 0 ? `${formatStatValue(stats.rushingYards)} rush yds` : null,
      ]);
    case 'EDGE':
    case 'DT':
      return joinStatParts([
        stats.tackles > 0 ? `${formatStatValue(stats.tackles)} tackles` : null,
        stats.sacks > 0 ? `${formatStatValue(stats.sacks)} sacks` : null,
        stats.tfl > 0 ? `${formatStatValue(stats.tfl)} TFL` : null,
        stats.qbHits > 0 ? `${formatStatValue(stats.qbHits)} QB hits` : null,
      ]);
    case 'LB':
      return joinStatParts([
        stats.tackles > 0 ? `${formatStatValue(stats.tackles)} tackles` : null,
        stats.tfl > 0 ? `${formatStatValue(stats.tfl)} TFL` : null,
        stats.sacks > 0 ? `${formatStatValue(stats.sacks)} sacks` : null,
        stats.interceptions > 0 ? `${formatStatValue(stats.interceptions)} INT` : null,
      ]);
    case 'CB':
    case 'S':
    case 'D-FLEX':
      return joinStatParts([
        stats.tackles > 0 ? `${formatStatValue(stats.tackles)} tackles` : null,
        stats.interceptions > 0 ? `${formatStatValue(stats.interceptions)} INT` : null,
        stats.passesDefended > 0 ? `${formatStatValue(stats.passesDefended)} PD` : null,
        stats.forcedFumbles > 0 ? `${formatStatValue(stats.forcedFumbles)} FF` : null,
        stats.defTD > 0 ? `${formatStatValue(stats.defTD)} DEF TD` : null,
        stats.sacks > 0 ? `${formatStatValue(stats.sacks)} sacks` : null,
      ]);
    default:
      return 'Season snapshot unavailable';
  }
}

function formatName(record: GeneratedPlayerRecord): string {
  return (record.name ?? '').trim();
}

function toPlayer(record: GeneratedPlayerRecord, draftPosition: Position): Player {
  const rating = typeof record.ratings?.overall === 'number' ? record.ratings.overall : 40;

  return {
    id: record.id,
    name: formatName(record),
    team: record.team,
    years: `Best season ${record.bestSeason} • ${record.era}`,
    stats: formatStats(record, draftPosition),
    statValues: { ...record.stats },
    rating,
    tier: ratingToTier(rating),
    position: draftPosition,
  };
}

function toPlayerWithEligiblePositions(
  record: GeneratedPlayerRecord,
  openPositions: Position[],
): Player | null {
  const eligiblePositions = openPositions.filter((draftPosition) => {
    const mappedPositions = GENERATED_POSITION_MAP[draftPosition];
    return mappedPositions.includes(record.position as GeneratedPosition);
  });

  if (eligiblePositions.length === 0) return null;

  const player = toPlayer(record, eligiblePositions[0]);
  if (!player.name) return null;

  return {
    ...player,
    eligiblePositions,
  };
}

function sortRecords(a: GeneratedPlayerRecord, b: GeneratedPlayerRecord): number {
  const ratingDiff = (b.ratings?.overall ?? 40) - (a.ratings?.overall ?? 40);
  if (ratingDiff !== 0) return ratingDiff;

  const namedDiff = Number(Boolean(b.name)) - Number(Boolean(a.name));
  if (namedDiff !== 0) return namedDiff;

  return b.bestSeason - a.bestSeason;
}

export function getPlayersForSpin(
  draftPosition: Position,
  spin: { team: { abbr: string }; era: string } | null,
): Player[] {
  const generatedPositions = GENERATED_POSITION_MAP[draftPosition];
  const matchingRecords = GENERATED_RECORDS
    .filter((record) => {
      const recordPosition = record.position as GeneratedPosition;
      if (!generatedPositions.includes(recordPosition)) return false;
      if (!spin) return true;
      return record.team === spin.team.abbr && record.era === spin.era;
    })
    .sort(sortRecords);

  return matchingRecords
    .map((record) => toPlayer(record, draftPosition))
    .filter((player) => player.name.length > 0);
}

export function getAllPlayersForSpin(
  spin: { team: { abbr: string }; era: string } | null,
  openPositions: Position[],
): Player[] {
  if (!spin || openPositions.length === 0) return [];

  const matchingRecords = GENERATED_RECORDS
    .filter((record) => record.team === spin.team.abbr && record.era === spin.era)
    .sort(sortRecords);

  return matchingRecords
    .map((record) => toPlayerWithEligiblePositions(record, openPositions))
    .filter((player): player is Player => Boolean(player));
}

export function hasPlayersForSpin(draftPosition: Position, teamAbbr: string, era: string): boolean {
  const generatedPositions = GENERATED_POSITION_MAP[draftPosition];
  return GENERATED_RECORDS.some((record) => {
    return record.team === teamAbbr
      && record.era === era
      && generatedPositions.includes(record.position as GeneratedPosition);
  });
}

export function getPlayableSpinCombos(draftPosition: Position, teamAbbrs: string[], eras: string[]) {
  return teamAbbrs.flatMap((teamAbbr) => eras
    .filter((era) => hasPlayersForSpin(draftPosition, teamAbbr, era))
    .map((era) => ({ teamAbbr, era })));
}

export function hasAnyPlayersForSpin(openPositions: Position[], teamAbbr: string, era: string): boolean {
  return openPositions.some((draftPosition) => hasPlayersForSpin(draftPosition, teamAbbr, era));
}

export function getPlayableSpinCombosForOpenPositions(
  openPositions: Position[],
  teamAbbrs: string[],
  eras: string[],
) {
  return teamAbbrs.flatMap((teamAbbr) => eras
    .filter((era) => hasAnyPlayersForSpin(openPositions, teamAbbr, era))
    .map((era) => ({ teamAbbr, era })));
}

export function getViableTeamAbbrs(teamAbbrs: string[], eras: string[]): string[] {
  return teamAbbrs.filter((teamAbbr) => DRAFT_POSITIONS.every((draftPosition) => {
    return eras.some((era) => hasPlayersForSpin(draftPosition, teamAbbr, era));
  }));
}

export const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string }> = {
  GOAT: { bg: '#2A2110', text: '#F4C74D', border: '#D4A017' },
  Legend: { bg: '#1A2028', text: '#D2D9E1', border: '#A7B1BC' },
  Elite: { bg: '#11253A', text: '#7CB2E0', border: '#2F6A9D' },
};
