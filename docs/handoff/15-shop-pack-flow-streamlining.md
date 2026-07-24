# 15 — Shop / Pack flow streamlining

Grounded in a direct read of `src/screens/ShopScreen.tsx`,
`src/screens/PackOpeningScreen.tsx`, `src/components/PackRevealSequence.tsx`,
and `src/store/dynastyStore.ts` (see `06-phase1-codebase-audit.md` for the
original audit). This doc covers a scoped set of five UX changes to the
Shop → Pack Opening flow, confirmed with the user one-by-one — implement
exactly these, not a broader Shop redesign.

## Status of each item (confirmed with user)

| # | Change | Decision |
|---|---|---|
| 1 | "Open Now" nudge after a purchase | **Implement** |
| 2 | Skip / fast-forward the pack reveal animation | **Implement** |
| 3 | Tap-to-keep card selection mechanic | **No change** — keep as-is |
| 4 | Pending-packs banner on the Store tab | **Implement** |
| 5 | Collapse the ad-for-Rings card into a compact pill | **Implement** |
| 6 | Displaced-starter resolution flow (`08-dynasty-gameplay-redesign.md`) | **No change** — keep current functionality, not in scope here |

Items 3 and 6 are listed for completeness only — do not touch that code
as part of this doc.

---

## 1. "Open Now" nudge after purchase

**Problem:** buying a pack drops the player back in the Shop; opening it is
a separate tab-switch + scroll + tap, even immediately after purchase.

**`src/store/dynastyStore.ts`**
- Change `buyPack`'s return type from `boolean` to `string | null` — return
  the newly created `OwnedPack.id` on success, `null` on failure (can't
  afford it / tier not found / etc).
- Every existing caller that does `if (!buyPack(...))` continues to work
  unchanged (`null` is falsy, a string id is truthy) — confirm no caller
  does a strict `=== false` check before landing this.

**`src/screens/ShopScreen.tsx`**
- Add `const [justBoughtPackId, setJustBoughtPackId] = useState<string | null>(null);`
- Update `handleBuy`:
  ```tsx
  function handleBuy(tierId: PackTierId) {
    if (!hasCompletedInitialDraft) return;
    const newPackId = buyPack(tierId, selectedEra ?? undefined);
    setOddsSheetTierId(null);
    if (newPackId) setJustBoughtPackId(newPackId);
  }
  ```
- Feeds directly into the banner component built in item 4 below — there is
  no separate toast/modal for this, the banner *is* the nudge. Clear
  `justBoughtPackId` when the banner is tapped (navigating to
  `PackOpening`) so it doesn't linger stale after the pack's been opened.

---

## 2. Skip / fast-forward the pack reveal

**Problem:** `PackRevealSequence.tsx`'s rip/flip animation is cosmetic only
— `onOpen()` already committed the real pull result before the animation
starts (see the existing code comment above `PackOpeningScreen`'s reveal
handling). Forcing the full sequence on every pack, including repeat opens
in the same session, adds friction with no informational value after the
first time.

**`src/components/PackRevealSequence.tsx`**
- Add a module-level flag (persists for the app session, not per-mount):
  ```tsx
  let hasRevealedOnceThisSession = false;
  ```
- Add local state: `const [skipRequested, setSkipRequested] = useState(false);`
- Wherever the sequence currently calls `onDone(result)` after the last
  card's flip completes, first set `hasRevealedOnceThisSession = true`.
- Add a skip handler:
  ```tsx
  function handleSkip() {
    if (!pulls) return;
    setSkipRequested(true);
    onDone(pulls);
  }
  ```
- Render a skip control only once unlocked, only during the `'reveal'`
  phase, and only before it's been pressed:
  ```tsx
  {phase === 'reveal' && hasRevealedOnceThisSession && !skipRequested && (
    <TouchableOpacity
      style={styles.skipBtn}
      onPress={handleSkip}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.skipBtnText}>SKIP ›</Text>
    </TouchableOpacity>
  )}
  ```
- Styles:
  ```ts
  skipBtn: { position: 'absolute', top: 8, right: 8, padding: 8, zIndex: 10 },
  skipBtnText: { color: Colors.textMuted, fontFamily: Font.mono, fontSize: Typography.xs, letterSpacing: 1 },
  ```

**Acceptance criteria**
- [ ] First pack opened in a fresh app session always plays the full
      tap→rip→flip sequence with no skip control visible
- [ ] Every pack opened after that shows the skip control once `phase ===
      'reveal'` starts, and skipping jumps straight to the same `pulls`
      payload the full sequence would have ended with — no difference in
      downstream state between skipped and fully-played reveals
- [ ] `hasRevealedOnceThisSession` resets on a fresh app load (module-level
      var, not persisted to `AsyncStorage` — confirm this is acceptable;
      it intentionally does NOT survive app restarts)

---

## 3. Tap-to-keep mechanic — no change

Leave `PackOpeningScreen.tsx`'s existing keep/check → "Add Selected to
Roster" flow exactly as-is. Do not change the default-unchecked state or
add an "Add All" shortcut — explicitly declined by the user.

---

## 4. Pending-packs banner on the Store tab

**Problem:** the only signal that packs are waiting to be opened is the
`MY PACKS · N` tab label — easy to miss, easy to keep buying without
opening what's already owned.

**`src/screens/ShopScreen.tsx`**
- New shared component:
  ```tsx
  function PendingPacksBanner({ count, latestPackId, onOpen }: {
    count: number;
    latestPackId: string | null;
    onOpen: (packId: string) => void;
  }) {
    if (count === 0) return null;
    return (
      <TouchableOpacity
        style={styles.pendingBanner}
        onPress={() => onOpen(latestPackId ?? '')}
        activeOpacity={0.85}
      >
        <Text style={styles.pendingBannerText}>
          {count === 1 ? '1 pack waiting' : `${count} packs waiting`} — Open now
        </Text>
        <Text style={styles.pendingBannerArrow}>›</Text>
      </TouchableOpacity>
    );
  }
  ```
- Render at the top of the narrow Store tab's `ScrollView`, above
  `{shopAdCard}` (now `<ShopAdPill />`, see item 5):
  ```tsx
  <PendingPacksBanner
    count={pendingCount}
    latestPackId={justBoughtPackId ?? ownedPacks[0]?.id ?? null}
    onOpen={(packId) => {
      setJustBoughtPackId(null);
      navigation.navigate('PackOpening', { packId });
    }}
  />
  ```
- Also render it at the top of the wide layout's `widePaneLeft` /
  tier-grid pane, above the tier list. The always-visible sidebar already
  shows pending packs on wide, but the banner still gives the one-tap
  "open what I just bought" path the sidebar doesn't (sidebar requires
  scanning the list; the banner points at the specific pack just bought).
- Styles:
  ```ts
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.gold,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  pendingBannerText: { color: Colors.gold, fontFamily: Font.primaryBold, fontSize: Typography.sm, letterSpacing: 0.4 },
  pendingBannerArrow: { color: Colors.gold, fontSize: Typography.lg },
  ```

**Acceptance criteria**
- [ ] Banner appears whenever `pendingCount > 0`, independent of whether
      the most recent action was a purchase
- [ ] Immediately after a purchase, tapping the banner opens the
      just-bought pack specifically (not an arbitrary pending pack)
- [ ] Banner renders on both narrow (Store tab) and wide (left pane) layouts

---

## 5. Collapse the ad-for-Rings card into a compact pill

**Problem:** the full `ShopAdCard` sits above the tier list and competes
with the primary Buy action for scroll priority and visual weight, despite
being a secondary economy loop.

**`src/screens/ShopScreen.tsx`**
- Add `const [adSheetOpen, setAdSheetOpen] = useState(false);`
- New compact trigger, replacing the current inline `shopAdCard` render:
  ```tsx
  function ShopAdPill({ preview, onPress, justEarned }: {
    preview: { watchesRemainingToday: number; nextReward: number };
    onPress: () => void;
    justEarned: number | null;
  }) {
    return (
      <TouchableOpacity style={styles.adPill} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.adPillText}>
          {justEarned !== null
            ? `+${justEarned} 💍 earned`
            : preview.watchesRemainingToday > 0
              ? `▶ Watch an ad · +${preview.nextReward} 💍`
              : 'No ad watches left today'}
        </Text>
      </TouchableOpacity>
    );
  }
  ```
- Replace `{shopAdCard}` with:
  ```tsx
  {SHOP_AD_RINGS_ENABLED && (
    <ShopAdPill preview={adPreview} justEarned={adRingsJustEarned} onPress={() => setAdSheetOpen(true)} />
  )}
  ```
- Render the existing full `ShopAdCard` content (streak badge, sub-copy,
  watch button) inside a bottom sheet, reusing the same
  visibility/overlay pattern already implemented for `PackOddsSheet` in
  this file — don't build a second sheet primitive. `onWatch` inside the
  sheet still calls the existing `handleWatchShopAd`; close the sheet
  either explicitly or automatically once a watch completes (match
  whatever `PackOddsSheet`'s existing close behavior does for
  consistency).
- Styles:
  ```ts
  adPill: {
    alignSelf: 'flex-start', backgroundColor: Colors.bgCardDeep, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10,
  },
  adPillText: { color: Colors.textMuted, fontFamily: Font.mono, fontSize: Typography.xs },
  ```

**Acceptance criteria**
- [ ] Store tab (narrow) and left pane (wide) show the compact pill, not
      the full ad card, by default
- [ ] Tapping the pill opens a bottom sheet with the full existing ad-card
      content and watch button — no functional change to the ad-watch
      logic itself, purely a presentation change
- [ ] `justEarned` state still surfaces correctly — reflected in the pill
      label per the ternary above, without requiring the sheet to be open

---

## Cross-cutting notes for Claude Code

- None of these five changes touch `dynastyStore.ts`'s persistence layer
  except the `buyPack` return-type change in item 1 — confirm that change
  compiles cleanly against every existing call site before considering
  item 1 done.
- Items 1 and 4 share the same banner component and the same
  `justBoughtPackId` state — implement them together, don't land item 4
  without item 1's return-type change since the banner's "open the pack I
  just bought" behavior depends on it.
- Item 2's skip control and item 5's ad-pill sheet are independent of
  everything else in this doc and can be implemented/reviewed in either
  order.
- Do not touch `PackOpeningScreen.tsx`'s keep/commit logic (item 3) or
  begin building the displaced-starter resolution flow (item 6) as part of
  this doc — both are explicitly out of scope here.
