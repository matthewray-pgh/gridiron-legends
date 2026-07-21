import { Player, Position } from '../data/players';

export interface StatMetric {
  key: string;
  label: string;
  value: string;
}

// Row-card top 3 (ROW_STAT_COUNT below) — order matters, the first 3 fields
// with a non-zero value win the slot, so the position's headline stats go
// first, deeper box-score fields after for the full detail-panel breakdown.
const QB_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['passingYards', 'PASSYDS'],
  ['passingTD', 'PASSTD'],
  ['interceptions', 'INT'],
  ['completions', 'COMP'],
  ['attempts', 'ATT'],
  ['rushingYards', 'RUYDS'],
  ['rushingTD', 'RUTD'],
];

const RB_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['rushingYards', 'RUYDS'],
  ['rushingTD', 'RUTD'],
  ['receivingYards', 'RECYDS'],
  ['receptions', 'REC'],
  ['receivingTD', 'RECTD'],
];

const RECEIVER_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['receptions', 'REC'],
  ['receivingYards', 'RECYDS'],
  ['receivingTD', 'RECTD'],
  ['receivingYardsAfterCatch', 'RECYAC'],
  ['rushingYards', 'RUYDS'],
];

// FLEX/FLEX2 candidates can be a native RB, WR, or TE (see
// GENERATED_POSITION_MAP), so unlike RB/WR/TE above this stays a broad
// combined list rather than committing to a rushing- or receiving-first
// headline.
const FLEX_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['rushingYards', 'RUYDS'],
  ['rushingTD', 'RUTD'],
  ['receptions', 'REC'],
  ['receivingYards', 'RECYDS'],
  ['receivingTD', 'RECTD'],
  ['receivingYardsAfterCatch', 'RECYAC'],
];

const EDGE_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['sacks', 'SACKS'],
  ['qbHits', 'QBHITS'],
  ['tfl', 'TFL'],
  ['forcedFumbles', 'FF'],
];

const DT_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['sacks', 'SACKS'],
  ['tfl', 'TFL'],
  ['qbHits', 'QBHITS'],
  ['forcedFumbles', 'FF'],
];

const LB_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['sacks', 'SACKS'],
  ['tfl', 'TFL'],
  ['interceptions', 'INT'],
  ['forcedFumbles', 'FF'],
];

const CB_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['interceptions', 'INT'],
  ['passesDefended', 'PD'],
  ['forcedFumbles', 'FF'],
  ['sacks', 'SACKS'],
];

const S_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['interceptions', 'INT'],
  ['forcedFumbles', 'FF'],
  ['passesDefended', 'PD'],
  ['tfl', 'TFL'],
];

// D-FLEX can be any defensive position, so — like FLEX/FLEX2 — it stays a
// broad combined list rather than one position's headline stats.
const D_FLEX_STAT_DISPLAY_ORDER: Array<[string, string]> = [
  ['tackles', 'TKL'],
  ['sacks', 'SACKS'],
  ['interceptions', 'INT'],
  ['tfl', 'TFL'],
  ['qbHits', 'QBHITS'],
  ['forcedFumbles', 'FF'],
  ['passesDefended', 'PD'],
];

export function getStatDisplayOrder(position: Position | undefined): Array<[string, string]> {
  switch (position) {
    case 'QB':
    case 'QB2': return QB_STAT_DISPLAY_ORDER;
    case 'RB':
    case 'RB2': return RB_STAT_DISPLAY_ORDER;
    case 'WR':
    case 'WR2':
    case 'TE': return RECEIVER_STAT_DISPLAY_ORDER;
    case 'FLEX':
    case 'FLEX2': return FLEX_STAT_DISPLAY_ORDER;
    case 'EDGE': return EDGE_STAT_DISPLAY_ORDER;
    case 'DT': return DT_STAT_DISPLAY_ORDER;
    case 'LB': return LB_STAT_DISPLAY_ORDER;
    case 'CB': return CB_STAT_DISPLAY_ORDER;
    case 'S': return S_STAT_DISPLAY_ORDER;
    case 'D-FLEX': return D_FLEX_STAT_DISPLAY_ORDER;
    default: return [];
  }
}

export function formatChipValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000) return Math.round(value).toLocaleString('en-US');
  if (value >= 100) return Math.round(value).toString();
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

const ROW_STAT_COUNT = 3;

// Compact row-card stat readout — the position's 3 most significant stats
// only (not the full breakdown getFullStatMetrics below shows), in the
// same big-number/small-label shape as PlayerDetailPanel's stat items.
export function getRowStatMetrics(player: Player): StatMetric[] {
  const structured = getStatDisplayOrder(player.position)
    .map(([key, label]) => {
      const value = player.statValues?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
      return { key, label, value: formatChipValue(value) };
    })
    .filter((entry): entry is StatMetric => Boolean(entry))
    .slice(0, ROW_STAT_COUNT);

  if (structured.length > 0) return structured;

  return player.stats
    .split('•')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, ROW_STAT_COUNT)
    .map((entry) => {
      const splitIndex = entry.indexOf(' ');
      const value = splitIndex > 0 ? entry.slice(0, splitIndex) : entry;
      const label = (splitIndex > 0 ? entry.slice(splitIndex + 1) : 'STAT').replace(/\s+/g, '').toUpperCase();
      return { key: `${label}-${value}`, label, value };
    });
}

// Full (non-truncated) stat breakdown for PlayerDetailPanel's STATISTICS
// grid — falls back to splitting the free-text `stats` string when
// `statValues` isn't populated for this player.
export function getFullStatMetrics(player: Player | null): StatMetric[] {
  if (!player) return [];

  const fromRawStats = getStatDisplayOrder(player.position)
    .map(([key, label]) => {
      const value = player.statValues?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
      return { key, label, value: formatChipValue(value) };
    })
    .filter((entry): entry is StatMetric => Boolean(entry));

  if (fromRawStats.length > 0) return fromRawStats;

  return player.stats
    .split('•')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const splitIndex = entry.indexOf(' ');
      const value = splitIndex > 0 ? entry.slice(0, splitIndex) : entry;
      const label = (splitIndex > 0 ? entry.slice(splitIndex + 1) : 'STAT').replace(/\s+/g, '').toUpperCase();
      return { key: `${label}-${value}`, label, value };
    });
}
