# 18 — Shop facelift: pack-shelf visual redesign

Grounded in a direct read of `src/screens/ShopScreen.tsx` (`TierCard`,
`PendingPackRow`, `OddsBar`, narrow/wide render branches, and their
styles), plus `DESIGN-SYSTEM.md` §8's existing badge/tier system and its
open `DECISION NEEDED` on reconciling pack rarities with that badge set.
This doc **supersedes the pending-packs banner from doc 15** — don't
implement doc 15's `PendingPacksBanner` text-pill version if it hasn't
landed yet; if it has, replace it per section 2 below.

## Direction

Move the Shop from "list of stat cards" to "shelf of packs" — each tier
and each owned pack renders as a small foil-pack-style tile (beveled
gradient fill, shield badge centered, full name below) rather than a
bordered card full of text. Odds/guarantee detail moves behind "View
odds" (already exists for the Store tab; extend the same pattern to
owned packs' era/season detail). This is a genuine layout change, not a
reskin — `TierCard`'s current markup (odds bar, guarantee text, price row
inline in the card) is replaced, not just restyled.

## 1. Shield badge component

New `PackShieldBadge.tsx` — a small beveled shield shape with a centered
icon, reused everywhere a pack needs an identity mark (Store tiles, My
Packs tiles, waiting-to-open strip, PackOpeningScreen's toolbar if useful
later).

```tsx
interface PackShieldBadgeProps {
  tierId: PackTierId;
  size?: number; // shield height in px; width derives at a fixed aspect
}
```

- **Shape:** a pentagon/shield via `clip-path: polygon(0% 0%, 100% 0%,
  100% 58%, 50% 100%, 0% 58%)` on a `View`/`div`-equivalent — matches the
  proportions of the reference badge sheet closely enough without needing
  new SVG asset files.
- **Fill:** a diagonal gradient per tier (light corner → tier accent →
  dark corner), not a flat fill — this is what gives it the metallic
  beveled look from the reference sheet. Reuse `TIER_ACCENT` for the
  midpoint color, don't introduce a second color mapping.
- **Icon:** real inline SVG paths (a proper star polygon, a proper crown
  silhouette), **never Unicode emoji glyphs** — emoji render inconsistently
  across platforms and read as low-effort next to a beveled metallic
  badge. Build these as small local SVG path constants, not an icon font
  dependency, to keep this self-contained.

**Icon-per-tier mapping** — this doc resolves the `DECISION NEEDED` open
item from `DESIGN-SYSTEM.md` §8/§10 (reconciling pack rarity tiers with
the existing 6-badge brand system), recommended default:

| Pack tier | Maps to badge | Icon | Fill accent |
|---|---|---|---|
| Rookie Pack | All Pro | Star | `TIER_ACCENT.rookie` (steel) |
| Pro Pack | Elite | Star (distinct weight/size from All Pro's, per the brand sheet's "distinct shape accent" note) | `TIER_ACCENT.pro` (blue) |
| Legend Pack | Legend | Crown | `TIER_ACCENT.legend` (gold) |

This is a recommendation, not a hard requirement — if the actual product
call differs, swap the icon/mapping table above, but don't ship with the
open question unresolved. MVP, Hall of Fame, and Icon badges stay
reserved for their existing brand-sheet contexts (leaderboard rank,
retirement, etc.) and aren't reused here.

## 2. Store tab: waiting-to-open strip + tier shelf

Replace the existing pending-packs banner (doc 15, if implemented) and
the plain tier-card list with:

```tsx
<Text style={styles.sectionLabel}>WAITING TO OPEN</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.waitingStrip}>
  {ownedPacks.slice(0, WAITING_STRIP_CAP).map((pack) => (
    <WaitingPackTile key={pack.id} pack={pack} tier={findTier(pack.tierId)} onPress={() => openPack(pack.id)} />
  ))}
  {pendingCount > WAITING_STRIP_CAP && (
    <SeeAllTile count={pendingCount} onPress={() => setTab('packs')} />
  )}
</ScrollView>

<Text style={styles.sectionLabel}>BUY A PACK</Text>
<View style={styles.tierShelfGrid}>
  {PACK_TIERS.map((tier) => (
    <PackTile
      key={tier.id}
      tier={tier}
      cost={totalCost(tier, selectedEra)}
      affordable={rings >= totalCost(tier, selectedEra)}
      onBuy={() => handleBuy(tier.id)}
      onViewOdds={() => setOddsSheetTierId(tier.id)}
    />
  ))}
</View>
```

- **`WAITING_STRIP_CAP`** — named constant, suggested default `4`. Cap
  the strip's real content at this many tiles; beyond that, the last slot
  becomes the "See all" tile instead of scrolling indefinitely. This is
  the fix for the open question from the last round of mockups: an
  unbounded horizontal strip doesn't degrade gracefully once someone owns
  a lot of packs.
- **`SeeAllTile`** — bordered dashed-style tile (not a full pack tile),
  `›` chevron + `SEE ALL {count}`, taps into `setTab('packs')`. Don't
  make this a no-op placeholder — earlier mockup passes had a faded `+`
  tile that didn't actually navigate anywhere; this one must.
- **Only render the strip section at all when `pendingCount > 0`** —
  same guard the old banner had, no empty "WAITING TO OPEN" header over
  nothing.
- **`WaitingPackTile`** — smaller variant of the tile (roughly 64px vs.
  the full shelf's ~110–120px), shield badge only (no full name — space
  doesn't allow it at this size), gold "OPEN" bar pinned to the tile's
  bottom edge.
- **`PackTile`** (replaces `TierCard`'s visual, keeps its prop surface:
  `tier`, `cost`, `affordable`, `onBuy`, `onViewOdds`) — shield badge
  centered in a beveled gradient tile, **full tier name below** (`tier.label`
  as-is, e.g. `"Rookie Pack"` — not `tier.shortCode`), price below that.
  Odds bar and guarantee text move entirely into the existing "View odds"
  sheet (`PackOddsSheet.tsx`, unchanged) — don't render them inline on the
  tile anymore, that detail no longer needs to live at a glance. Tapping
  the tile body (not just a separate button) can open the odds sheet if
  that reads better than a tiny inline link at this size — Buy stays as
  its own explicit action either way, don't make the whole tile a buy
  button.
- **Grid, not list:** `tierShelfGrid` is a 2-column grid
  (`flexDirection: 'row', flexWrap: 'wrap'`, each tile ~`48%` width), not
  the old `tierList`'s single-column stack. A 3rd/odd tier centers on its
  own row rather than stretching full-width.

## 3. My Packs tab: matching shelf, not a list

Replace `PendingPackRow`'s plain list rows with the same `PackTile`
visual family, in "owned" mode:

```tsx
<View style={styles.tierShelfGrid}>
  {ownedPacks.map((pack) => (
    <OwnedPackTile
      key={pack.id}
      pack={pack}
      tier={findTier(pack.tierId)}
      onPress={() => openPack(pack.id)}
    />
  ))}
</View>
```

- **`OwnedPackTile`** — same shield-and-gradient tile as `PackTile`, but
  the bottom shows a gold `OPEN` bar instead of a price, and beneath the
  tile: tier name, then `${SOURCE_LABEL[pack.source]} · Season
  ${pack.acquiredSeason}` plus the era-lock tag if present — this is the
  metadata `PendingPackRow` already surfaced, carried forward rather than
  dropped. Don't lose the season/source/era-lock info the old row had
  just because the tile is more visual.
- Empty state (`pendingCount === 0`) keeps existing copy/CTA pointing
  back to the Store tab — no visual change needed there.

## 4. Wide layout

`sidebarCardWide`'s always-visible "My Packs" sidebar should adopt the
same tile treatment at a smaller scale (2-up or a vertical single-column
of the smaller `WaitingPackTile` size, whichever fits the existing 300px
sidebar width better — check against real content before deciding).
`tierGridWide`'s 3-up grid of `TierCard` becomes 3-up `PackTile`s, same
component as narrow just laid out via the existing `tierCardWide` flex
basis. Don't fork a second wide-specific tile component — same pattern
`TierCard` already followed (shared markup, layout-specific `style`
prop).

## What this doc does NOT change

- `PackOddsSheet.tsx` — unchanged, now the sole place odds/guarantee
  detail is shown (previously also duplicated inline on the tier card).
- Buy/open logic, `buyPack`/`openPack`/store selectors — purely a
  presentation change to `ShopScreen.tsx`'s render layer.
- Era filter chips, ad-watch card — unaffected, still render above/around
  the shelf sections as before.
- The back-arrow toolbar glyph — still a logged, un-actioned open item
  from doc 17, not part of this doc either.

## Acceptance criteria

- [ ] No Unicode emoji anywhere in the new components — icons are inline
      SVG paths
- [ ] Shield badge shape/gradient renders consistently across
      `PackTile`, `WaitingPackTile`, `OwnedPackTile` (one shared
      `PackShieldBadge` component, not three separate implementations)
- [ ] Tier names render in full (`"Rookie Pack"`, `"Legend Pack"`) —
      no `shortCode` abbreviations used as the primary label anywhere in
      the new tile UI (shortCode may still back the shield icon choice
      internally if useful, just not shown as text)
- [ ] Waiting-to-open strip caps at `WAITING_STRIP_CAP` real tiles, with
      a functional "See all" tile beyond that — the strip does not
      scroll unboundedly for players with many pending packs
      - Verify with a test state with count = 10+ pending packs
- [ ] "See all" tile navigates to the My Packs tab
- [ ] My Packs tab shows the same tile family as the Store tab, with
      season/source/era-lock metadata preserved beneath each tile
- [ ] Odds/guarantee detail appears only in `PackOddsSheet`, not
      duplicated inline on the shelf tile
- [ ] Wide layout's sidebar and 3-up grid both use the new tile
      components, not a separate visual system
- [ ] Icon-per-tier mapping (§1 table) is implemented as specified or
      explicitly confirmed changed with the user — not left ambiguous
