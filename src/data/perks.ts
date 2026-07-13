// Dynasty mode perk packs (docs/handoff/03-legacy-mode.md, section 3
// "Packs" > Perk packs). Data-driven so the list can grow without touching
// pack-opening logic — do not add per-perk branches elsewhere.
//
// TODO_BALANCE: this list and each perk's `effect` are the exact candidates
// named in the handoff doc, not a finalized, product-approved set — see
// docs/handoff/03-legacy-mode.md > DECISION NEEDED ("full perk list and
// each perk's mechanical effect needs product sign-off"). The `effect`
// field is descriptive/structural only; nothing in the app currently reads
// it to alter gameplay, since shipping a guessed magnitude (e.g. how much
// of a win-probability boost) would be inventing balance the user hasn't
// confirmed.
export type PerkEffect =
  | { kind: 'extraRerollPerRound' }
  | { kind: 'simWinProbabilityBoost'; games: number }
  | { kind: 'skipForcedLowOvrPick' }
  | { kind: 'revealHiddenOvr' }
  | { kind: 'protectRosterSlotFromDowngrade' };

export interface Perk {
  id: string;
  name: string;
  description: string;
  effect: PerkEffect;
}

export const PERKS: Perk[] = [
  {
    id: 'two-a-days',
    name: 'Two-a-Days',
    description: 'Extra reroll every round this season.',
    effect: { kind: 'extraRerollPerRound' },
  },
  {
    id: 'homefield-advantage',
    name: 'Homefield Advantage',
    description: 'Sim win-probability boost for a stretch of games.',
    effect: { kind: 'simWinProbabilityBoost', games: 3 },
  },
  {
    id: 'iron-man',
    name: 'Iron Man',
    description: 'Immunity to one forced low-OVR pick this season.',
    effect: { kind: 'skipForcedLowOvrPick' },
  },
  {
    id: 'scouting-report',
    name: 'Scouting Report',
    description: 'Reveal hidden OVR in a Gridiron IQ-style Dynasty run.',
    effect: { kind: 'revealHiddenOvr' },
  },
  {
    id: 'cap-insurance',
    name: 'Cap Insurance',
    description: 'Protect one roster slot from downgrade on a bad spin.',
    effect: { kind: 'protectRosterSlotFromDowngrade' },
  },
];

export function getPerkById(id: string): Perk | undefined {
  return PERKS.find((perk) => perk.id === id);
}

export function pullRandomPerk(): Perk {
  return PERKS[Math.floor(Math.random() * PERKS.length)];
}
