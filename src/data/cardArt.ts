// Full-bleed pack-card background art (docs/handoff/16-pack-card-photo-
// background-redesign.md). STUBBED: these four are plain abstract
// gradients generated as placeholders, not the final sourced pool — see
// this doc's section 4 "DECISION NEEDED" note, which flags that the real
// art source (licensed stock / commissioned illustration / AI-generated,
// with an explicit no-real-branding check if AI) still needs a decision
// from the user before final art ships. Do not treat these as final.
const CARD_ART_POOL = [
  require('../../assets/card-art/action-01.png'),
  require('../../assets/card-art/action-02.png'),
  require('../../assets/card-art/action-03.png'),
  require('../../assets/card-art/action-04.png'),
];

// Deterministic per-card (hash of the card's id) rather than Math.random()
// — the same pull renders the same art on every re-render within a session
// instead of flickering between images.
export function cardArtFor(cardId: string) {
  const hash = cardId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return CARD_ART_POOL[hash % CARD_ART_POOL.length];
}
