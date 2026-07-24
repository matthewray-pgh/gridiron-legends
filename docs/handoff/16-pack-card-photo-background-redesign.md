# 16 — Pack card redesign: full-bleed photo background

Grounded in a direct read of `src/components/PackPlayerCard.tsx`,
`src/components/CardStack.tsx`, and `src/components/PackRevealSequence.tsx`.
Scoped to the card *face* only — pack-opening choreography (rip/flip/glow),
the keep/commit mechanic, and CardStack's ghost-deck layer are unchanged.

## What's changing and why

Today's card (`PackPlayerCard.tsx`) has no player art — a centered
`MaterialCommunityIcons` shield placeholder stands in for a photo, with
rarity/name/meta/position/stats stacked in a plain column on a solid
`bgCardDeep` background.

New direction: each card gets a full-bleed background image (generic
action-shot art — see constraint below), with a bottom gradient scrim
carrying all the identity/stat text so it stays readable over any image,
and a rarity pill + OVR chip pinned to the top corners against the photo
directly. Confirmed with the user: **stats need to read larger and more
prominently than the mockup's first pass** — see the dedicated stats
section below, don't ship the small single-line treatment.

**Hard constraint, carried over from an earlier discussion in this
project — do not deviate without asking:** card art must stay generic
(silhouettes, stylized/illustrative athlete art, helmet-forward
compositions) and must never include real player photos, realistic
likeness art, or real team branding (logos, uniform color schemes, wordmarks).
This is a deliberate boundary distinct from the app's existing
NFL/NFLPA disclaimer in `README.md` — flag any sourced art that risks
crossing it rather than shipping it and asking later.

## 0. Precedent to follow: `BrandBackground.tsx`

Confirmed via the codebase: no player/action-shot art exists anywhere in
`assets/` today — `PackPlayerCard.tsx`'s own comment says the shield-icon
placeholder stands in for a photo specifically because *"no photo assets
exist yet."* `assets/` only has stadium/field background art
(`stadium-bg.png`, `field-bottom.png`) and icon/splash art.

That stadium/field art is already wired up through
`src/components/BrandBackground.tsx`, which does exactly the
image-plus-scrim pattern this doc needs: an `ImageBackground` wrapping a
`LinearGradient` overlay (`expo-linear-gradient`, already a project
dependency), with a `web`-specific fix for `react-native-web`'s `<img>`
sizing (explicit `width: '100%', height: '100%', resizeMode: 'cover'` —
without this the source image doesn't stretch to fill its container on
web). **Reuse this pattern, don't reimplement image+gradient handling
from scratch** — either import `BrandBackground` directly if its
`header`/`footer` variant shape can be extended with a `card` variant, or
mirror its structure closely enough that the two stay recognizably the
same approach if a shared component doesn't fit cleanly. Flag back to the
user which of those two paths you took, don't silently fork a third
pattern.

## 1. Card face layout (`PackPlayerCard.tsx`)

Replace the current centered-column layout with:

```tsx
import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

<View style={[styles.card, { borderColor: selected ? Colors.win : rarityColor }]}>
  <ImageBackground
    source={cardImage}
    style={{ width, height }}
    imageStyle={styles.cardImage}
  >
    {selected && (
      <View style={styles.checkBadge}>
        <MaterialCommunityIcons name="check-circle" size={22} color={Colors.win} />
      </View>
    )}

    <View style={styles.topRow}>
      <View style={[styles.rarityPill, { borderColor: rarityColor }]}>
        <Text style={[styles.rarityPillText, { color: rarityColor }]}>{RARITY_LABEL[card.rarity]}</Text>
      </View>
      {SHOW_DEBUG_OVR && (
        <View style={[styles.ovrChip, { borderColor: rarityColor }]}>
          <Text style={[styles.ovrChipText, { color: rarityColor }]}>{player.rating}</Text>
        </View>
      )}
    </View>

    <LinearGradient
      colors={['transparent', 'rgba(6,5,3,0.80)', 'rgba(6,5,3,0.97)']}
      locations={[0, 0.4, 1]}
      style={styles.scrim}
    >
      <View style={styles.positionBadge}>
        <Text style={styles.positionBadgeText}>{player.position}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
      <Text style={styles.meta}>{player.team} · {parseYear(player.years)}</Text>

      <StatRow stats={player.stats} />
    </LinearGradient>
  </ImageBackground>
</View>
```

Move the checkmark badge from its current absolute `top:-12,left:-12`
floating position (fine on a flat card, awkward sitting half-off a photo)
to a small corner badge inset within the image bounds — see
`checkBadge` style below.

## 2. Stats treatment — larger and more readable (confirmed requirement)

The first-pass mockup used a single muted 10px line (`"3,023 pass yds ·
17 pass TD · 6 INT"`) crammed under the meta line — too small, too low
contrast against a busy photo, and hard to scan at a glance. Replace it
with a **discrete stat-chip row**, not a run-on text line:

- Parse `player.stats` (already a formatted string from
  `formatStats()` in `data/players.ts`) into individual stat
  tokens — if a structured `statValues`-style breakdown is easier to
  thread through than re-parsing the formatted string, prefer that;
  don't regex-parse a display string if a structured source is
  available one level up.
- Render each stat as its own small chip: value large and bold, label
  small and muted underneath — same visual pattern as `InfoChip.tsx`
  (already used elsewhere in the app, e.g. TEAM/ERA/REROLL chips), not
  a new component built from scratch.
- Cap at 3 stat chips per card (the most relevant per position — reuse
  whatever priority order `formatStats()` already applies, which puts
  the most meaningful stat for that position first).
- Chips sit in a single row, left-aligned, inside the scrim below the
  name/meta block.

```tsx
function StatRow({ stats }: { stats: string }) {
  const parts = stats.split(' · ').slice(0, 3);
  return (
    <View style={styles.statRow}>
      {parts.map((part, i) => {
        const [value, ...labelWords] = part.split(' ');
        return (
          <View key={i} style={styles.statChip}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{labelWords.join(' ')}</Text>
          </View>
        );
      })}
    </View>
  );
}
```

Sizing: stat value should read at roughly the same visual weight as the
existing `meta` line's OVR treatment used to (before OVR moved to its own
top-corner chip) — bold, `Typography.lg` minimum, full-opacity white, not
the muted secondary-text color the rest of the app uses for supporting
copy. Label stays small (`Typography.xs`) and muted, since it's there for
context, not the primary read.

```ts
statRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
statChip: { alignItems: 'flex-start' },
statValue: { color: '#fff', fontFamily: Font.primaryBold, fontSize: Typography.lg, lineHeight: 20 },
statLabel: { color: '#c9bfa8', fontSize: Typography.xs, fontFamily: Font.mono, letterSpacing: 0.3, marginTop: 1 },
```

`#c9bfa8` (a warm light stone, not the app's standard `Colors.textMuted`
steel-gray) is used deliberately here — the standard muted-gray token
reads too low-contrast against the warm dark-photo scrim. Confirm this
doesn't need to become a proper `theme/colors.ts` token if it ends up
reused elsewhere (e.g. if the collection idea comes back later — it
won't per this project's decision, but keep the token question in mind
for any other photo-background surface).

## 3. Supporting styles

```ts
cardImage: { borderRadius: Radius.lg },
topRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
rarityPill: {
  backgroundColor: 'rgba(11,9,6,0.72)', borderWidth: 1, borderRadius: Radius.full,
  paddingHorizontal: 9, paddingVertical: 3,
},
rarityPillText: { fontFamily: Font.secondaryBold, fontSize: Typography.xs, letterSpacing: 1 },
ovrChip: {
  backgroundColor: 'rgba(11,9,6,0.72)', borderWidth: 1, borderRadius: Radius.full,
  width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
},
checkBadge: {
  position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(11,9,6,0.72)',
  borderRadius: Radius.full, padding: 2, zIndex: 2,
},
scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingTop: 44 },
name: { color: '#fff', fontFamily: Font.primaryBold, fontSize: Typography.xl },
meta: { color: '#d8cdb8', fontSize: Typography.sm, marginTop: 1, fontFamily: Font.secondaryMedium },
```

## 4. Random art assignment

Confirmed: this is genuinely new art, not something already sitting
unused in the repo (unlike the stadium/field background gap doc 06/07
found) — the pool needs to be sourced from scratch.

New `src/data/cardArt.ts`:

```ts
const CARD_ART_POOL = [
  require('../../assets/card-art/action-01.png'),
  require('../../assets/card-art/action-02.png'),
  // ...
];

// Deterministic per-card (hash of the card's id) rather than
// Math.random() — the same pull renders the same art on every re-render
// within a session instead of flickering between images.
export function cardArtFor(cardId: string) {
  const hash = cardId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return CARD_ART_POOL[hash % CARD_ART_POOL.length];
}
```

> DECISION NEEDED, don't guess: where the art pool itself comes from —
> a licensed generic sports-stock set, a commissioned illustration
> batch, or AI-generated art (if AI-generated, confirm the generation
> prompts/service used don't reintroduce real-team branding or
> real-athlete likeness — the reference image this doc was built from
> included a visible Nike-style swoosh mark, which should NOT be
> reproduced in the sourced pool). Stub `CARD_ART_POOL` with 3–4
> placeholder images and flag this back to the user rather than
> sourcing final art unprompted.

## 5. Things to verify before landing

- **Flip animation compatibility** — `PackRevealSequence.tsx` flips this
  same card face via a 3D `rotateY` transform. `ImageBackground` +
  `rotateY` has had platform-specific edge-clipping quirks in RN
  historically; test on both iOS and Android, not just web.
- **Contrast across the art pool** — the scrim gradient opacities above
  are tuned against dark/moody art (per the reference image this doc is
  based on). Test against the brightest image in the actual pool (sky,
  white jersey, daylight shot) and increase the scrim's opacity floor if
  text legibility drops on lighter art — don't ship a scrim tuned to one
  reference image only.
- **`CardStack.tsx`'s ghost-card layer** is unaffected structurally
  (still tints by `RARITY_COLOR` on the border), but confirm the ghost
  cards read correctly once real cards have photo backgrounds instead of
  flat fills — a flat-colored ghost behind a photo-textured front card
  may need a slight visual adjustment to still look like "the same card,
  face-down" rather than a mismatched placeholder.

## What this doc does NOT change

- Pack-opening choreography (rip/flip/glow/shake) in
  `PackRevealSequence.tsx` — reuses the same card component, no timing
  or sequencing changes.
- The tap-to-keep selection mechanic in `PackOpeningScreen.tsx` —
  explicitly kept as-is per an earlier decision in this project.
- Any persistent "collection" or binder concept — explicitly dropped per
  an earlier decision in this project (NIL/right-of-publicity risk of a
  persistent, completionist real-player collection layer). This doc is
  scoped to the transient pack-reveal card face only.

## Acceptance criteria

- [ ] Card renders a full-bleed background image with no visible seam
      or clipping at any card width the app uses (`PackPlayerCard`'s
      default 220px and `CardStack`'s responsive width)
- [ ] Rarity pill and OVR chip are legible against every image in the
      art pool, not just dark ones
- [ ] Stat values render at `Typography.lg` or larger, full-opacity
      white — not the app's standard muted-gray supporting-text color
- [ ] No more than 3 stat chips per card; overflow stats are dropped,
      not wrapped or truncated mid-value
- [ ] Selected state (green border + checkmark) remains clearly visible
      against every image in the pool
- [ ] Flip animation (`PackRevealSequence.tsx`) shows no visual glitch
      on iOS or Android with the new photo-backed card face
- [ ] `CARD_ART_POOL` art source is either finalized product-approved
      art or clearly stubbed placeholders — not silently AI-generated
      without the branding check called out in section 4
