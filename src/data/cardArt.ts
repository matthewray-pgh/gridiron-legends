// Full-bleed pack-card background art (docs/handoff/16-pack-card-photo-
// background-redesign.md). Each of the 10 source photos was tagged by
// product for which positions it visually fits (e.g. a QB dropping back
// doesn't fit a DT card) — cardArtFor() picks within a card's own
// position's pool instead of treating all ten as one interchangeable pool.
import { Position } from './players';

const CARD_ART = {
  card01: require('../../assets/card-art/card-01.png'),
  card02: require('../../assets/card-art/card-02.png'),
  card03: require('../../assets/card-art/card-03.png'),
  card04: require('../../assets/card-art/card-04.png'),
  card05: require('../../assets/card-art/card-05.png'),
  card06: require('../../assets/card-art/card-06.png'),
  card07: require('../../assets/card-art/card-07.png'),
  card08: require('../../assets/card-art/card-08.png'),
  card09: require('../../assets/card-art/card-09.png'),
  card10: require('../../assets/card-art/card-10.png'),
};

// Only the 9 real card positions (data/packs.ts's PRIMARY_DRAFT_POSITION) —
// draft-slot placeholders like QB2/FLEX never appear on a pack card, so
// they're not worth a pool of their own; cardArtFor() falls back to the
// full art set for anything outside this list.
type CardArtPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'EDGE' | 'DT' | 'LB' | 'CB' | 'S';

// Product-tagged image -> eligible-positions mapping, inverted to
// position -> image pool:
//   card-01: QB, RB, WR, CB, S            card-06: LB, EDGE, CB, S, DT
//   card-02: RB, S, TE                    card-07: RB, WR, TE
//   card-03: WR, CB, QB                   card-08: WR, CB, S
//   card-04: WR, CB, S, EDGE, LB          card-09: DT, EDGE
//   card-05: WR, TE                       card-10: CB, S, TE, WR
const CARD_ART_POOL_BY_POSITION: Record<CardArtPosition, (typeof CARD_ART)[keyof typeof CARD_ART][]> = {
  QB: [CARD_ART.card01, CARD_ART.card03],
  RB: [CARD_ART.card01, CARD_ART.card02, CARD_ART.card07],
  WR: [CARD_ART.card01, CARD_ART.card03, CARD_ART.card04, CARD_ART.card05, CARD_ART.card07, CARD_ART.card08, CARD_ART.card10],
  TE: [CARD_ART.card02, CARD_ART.card05, CARD_ART.card07, CARD_ART.card10],
  EDGE: [CARD_ART.card04, CARD_ART.card06, CARD_ART.card09],
  DT: [CARD_ART.card09, CARD_ART.card06],
  LB: [CARD_ART.card04, CARD_ART.card06],
  CB: [CARD_ART.card01, CARD_ART.card03, CARD_ART.card04, CARD_ART.card06, CARD_ART.card08, CARD_ART.card10],
  S: [CARD_ART.card01, CARD_ART.card02, CARD_ART.card04, CARD_ART.card06, CARD_ART.card08, CARD_ART.card10],
};

const ALL_CARD_ART = Object.values(CARD_ART);

// Deterministic per-card (hash of the card's id) within that card's own
// position pool, rather than Math.random() or a single shared pool — the
// same pull renders the same art on every re-render within a session, and
// a card never shows art that wasn't tagged for its position.
export function cardArtFor(cardId: string, position: Position) {
  const pool = CARD_ART_POOL_BY_POSITION[position as CardArtPosition] ?? ALL_CARD_ART;
  const hash = cardId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return pool[hash % pool.length];
}
