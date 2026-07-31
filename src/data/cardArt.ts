// Full-bleed pack-card background art (docs/handoff/16-pack-card-photo-
// background-redesign.md). Real sourced pool — replaces the earlier 4
// placeholder gradients.
const CARD_ART_POOL = [
  require('../../assets/card-art/card-01.png'),
  require('../../assets/card-art/card-02.png'),
  require('../../assets/card-art/card-03.png'),
  require('../../assets/card-art/card-04.png'),
  require('../../assets/card-art/card-05.png'),
  require('../../assets/card-art/card-06.png'),
  require('../../assets/card-art/card-07.png'),
  require('../../assets/card-art/card-08.png'),
  require('../../assets/card-art/card-09.png'),
  require('../../assets/card-art/card-10.png'),
];

// Deterministic per-card (hash of the card's id) rather than Math.random()
// — the same pull renders the same art on every re-render within a session
// instead of flickering between images.
export function cardArtFor(cardId: string) {
  const hash = cardId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return CARD_ART_POOL[hash % CARD_ART_POOL.length];
}
