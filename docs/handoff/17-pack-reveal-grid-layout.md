# 17 — Pack reveal: grid layout replaces carousel

Grounded in a direct read of `src/screens/PackOpeningScreen.tsx` and
`src/components/CardStack.tsx`. This doc replaces the post-reveal
decision screen's layout; it does not touch `PackRevealSequence.tsx`'s
tap→rip→flip animation (doc 15 already covers that screen's skip
behavior) or the tap-to-keep selection mechanic itself, which stays as-is
per an earlier decision in this project.

## What's changing and why

Today, once `PackRevealSequence` finishes, `PackOpeningScreen` renders a
top-half/bottom-half layout: `CardStack.tsx`'s one-card-at-a-time
horizontal snap-scroll carousel on top, the full current roster (starters
+ bench) as a scrollable reference list on the bottom.

Two problems with this, confirmed with the user:

1. **The carousel doesn't scale.** Reviewing pulls one swipe at a time is
   fine at today's `PACK_CARD_COUNT` of 4, but a card-count increase to 6
   (under separate consideration, not part of this doc) makes that
   materially more tedious, and even at 4 it's not the best use of the
   available screen space.
2. **The roster reference block doesn't earn its place.** Every kept
   card is auto-placed by `resolvePackPulls` (starts if the slot's open,
   otherwise benches — no manual start/bench choice today), so the full
   roster list is detailed context in service of a decision the player
   isn't actually making on this screen. It's dead weight competing with
   the cards for space and attention.

Replace both: a **grid of all pulled cards, small enough that
`PACK_CARD_COUNT` cards fit without scrolling**, with the roster
reference block removed entirely, plus an explicit way to decline every
pull with nothing added (see section 3 — currently missing).

## 1. Replace `CardStack.tsx` with a grid

New component, e.g. `PackPullGrid.tsx` — a 3-column grid (adjust to
whatever comfortably fits `PACK_CARD_COUNT` cards without scrolling at
common device widths; 3 columns fits 4 cards at 2 rows-worth of height or
6 cards at exactly 2 full rows, so 3 is a reasonable default to build
against even before the 4→6 count decision lands).

Per-cell content, reusing `PackPlayerCard.tsx`'s photo-background redesign
from doc 16 at a smaller `width` (that component already derives height
from width via `HEIGHT_RATIO`, so sizing down is just passing a smaller
`width` prop — no new sizing logic needed):

- Checkmark badge moves to **top-left** at this size (doc 16 put it
  top-left already for the full-size card; keep that, don't reintroduce
  the old top-left-floating-off-the-card position from the original
  flat-card layout).
- Rarity pill stays top-right, same as doc 16.
- **Drop the stat-chip row entirely at grid size** — doc 16's larger
  stats treatment was sized for the single full-width card; there isn't
  room for it in a grid cell this small without becoming illegible.
  Show only name, team, and position at grid size. Don't shrink the
  stat chips to fit — omit them, matching the "don't cram more text into
  a cell this small" call already made when this was mocked up.
- **Duplicate cards** render visually dimmed (reduced opacity, e.g.
  `0.75`) and non-interactive (`onPress={undefined}`, matching existing
  `PackPlayerCard` behavior for duplicates), with the Rings refund amount
  shown inline in place of the checkmark/select affordance — e.g. a
  small centered pill reading `DUPLICATE` / `+{refund} 💍` instead of
  team/position text. This is a presentation change only; duplicate
  auto-resolution logic itself (`card.duplicate`, `ringsRefund`) is
  unchanged.

```tsx
// PackOpeningScreen.tsx — replaces <CardStack .../>
<View style={styles.grid}>
  {pulls.map((card, i) => (
    <PackPlayerCard
      key={i}
      card={card}
      width={gridCardWidth} // derived from useWindowDimensions, 3-col + gaps
      selected={!!checked[i]}
      onPress={card.duplicate ? undefined : () => toggleChecked(i)}
      compact // new prop — drops the stat-chip row, see PackPlayerCard changes below
    />
  ))}
</View>
```

`PackPlayerCard.tsx` needs a new `compact?: boolean` prop (default
`false`) that skips rendering the `StatRow` from doc 16 — don't fork a
second card component for the grid, extend the existing one, since
everything else about the card face (photo background, scrim, rarity
pill, name/meta) is identical between the full-size reveal card and the
grid cell.

## 2. Remove the roster reference block

Delete the entire `bottomHalf` section (`"Current roster"` heading,
starter rows, bench rows) from `PackOpeningScreen.tsx`'s post-reveal
render branch. The grid now occupies the screen on its own, with the
action bar (section 3) pinned at the bottom.

This also removes the now-unused `DRAFT_POSITIONS`/roster-row-rendering
code in this screen specifically — `roster` and `bench` store reads may
still be needed elsewhere in the file (verify against the rest of the
component before deleting the `useDynastyStore` selectors outright).

**Where roster context should live instead:** not on this screen. The
planned displaced-starter resolution flow
(`08-dynasty-gameplay-redesign.md`, not yet built) is the actual future
moment that needs "who's currently in this slot" shown — right at the
point a player chooses to start a pulled card over an existing starter.
When that flow gets built, put the roster context there, scoped to just
the relevant slot, not as a permanently-visible full-roster list here.
Don't reintroduce a roster block on this screen as a substitute for that
future, more targeted context.

## 3. Add a way to decline every pull (currently missing)

**Problem, confirmed via the existing code comment in
`PackOpeningScreen.tsx`:** `"Add Selected to Roster"` is disabled at
`checkedCount === 0` by design, to prevent a no-op submit. But that means
a player who doesn't want *any* of the pulled cards has no way off this
screen today — no back arrow once `pulls` is set, no skip action, nothing.

Add a low-emphasis text action alongside (not replacing) the primary
button:

```tsx
<View style={styles.actionBar}>
  <TouchableOpacity onPress={closeReveal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
    <Text style={styles.skipAllText}>Skip — nothing will be added to your roster</Text>
  </TouchableOpacity>
  <PrimaryButton
    label={`Add Selected (${checkedCount}) to Roster`}
    onPress={handleAddSelected}
    disabled={checkedCount === 0}
  />
</View>
```

- Reuses the existing `closeReveal()` function as-is — it already
  correctly resets `pulls`/`checked`/`revealStarted` without calling
  `resolvePackPulls`, which is exactly "decline everything."
- **Deliberately not a second full-weight button.** Keep "Add Selected"
  as the one visually primary action so the two don't compete; this is a
  text link, not a button pair.
- **Deliberately not tied to the hardware/gesture back action.** An
  implicit "back = decline everything" behavior risks an accidental
  mis-tap or Android back-button press silently discarding cards the
  player meant to keep. This needs to be an explicit, clearly-labeled
  action given the consequence (nothing from this pack gets added) is
  irreversible.
- Copy should make clear nothing is being forfeited — no Rings or pack
  cost is lost by declining, since the pack itself was already consumed
  to reveal these cards; only the *cards* go unclaimed. `"Skip — nothing
  will be added to your roster"` rather than something that could read
  as "you're giving something up."

```ts
actionBar: { padding: 14, gap: 10 },
skipAllText: { color: Colors.textMuted, fontSize: Typography.sm, fontFamily: Font.secondaryMedium, textAlign: 'center' },
```

## What this doc does NOT change

- `PackRevealSequence.tsx`'s tap→rip→flip animation and its skip
  mechanic (doc 15) — unaffected, still plays before this screen
  renders.
- The tap-to-keep selection mechanic itself (checkmark toggle,
  auto-placement on submit) — explicitly kept as-is per an earlier
  decision in this project.
- `PACK_CARD_COUNT` — still 4. A bump to 6 is a separate, not-yet-decided
  change (economy/balance implications flagged separately); build the
  grid to comfortably handle 6 without a second layout pass later, but
  don't change the constant as part of this doc.
- The displaced-starter resolution flow from
  `08-dynasty-gameplay-redesign.md` — still not built. This doc
  explicitly does not attempt to reintroduce roster context as a
  workaround for that gap.

## Acceptance criteria

- [ ] Grid renders all `PACK_CARD_COUNT` pulled cards with no scrolling
      required at common device widths
- [ ] Grid comfortably extends to 6 cards without a layout rework should
      `PACK_CARD_COUNT` change later
- [ ] `PackPlayerCard`'s new `compact` prop hides the stat-chip row and
      nothing else changes about the card face at grid size
- [ ] Duplicate cards are visually dimmed, non-interactive, and show
      their Rings refund inline instead of team/position text
- [ ] Roster reference block is fully removed from this screen — no
      leftover unused imports/selectors for `DRAFT_POSITIONS`,
      roster-row rendering, etc. (verify `roster`/`bench` selectors are
      still needed elsewhere in the file before removing them from the
      component entirely)
- [ ] A "Skip" action is present whenever `pulls` is set, calls the
      existing `closeReveal()`, and does not require any card to be
      checked first
- [ ] "Add Selected" button remains the visually primary action; Skip
      reads as clearly lower-emphasis
- [ ] Declining via Skip does not call `resolvePackPulls` and does not
      refund or charge any Rings beyond what duplicate cards already
      auto-refund during reveal

## Open item, logged not actioned here

User flagged (side note, not in scope for this doc): dislikes the plain
`←` text-glyph back arrow used in every screen's `BrandBackground`
toolbar. No direction given yet on a replacement — logged here for a
future design pass, not touched as part of this doc.
