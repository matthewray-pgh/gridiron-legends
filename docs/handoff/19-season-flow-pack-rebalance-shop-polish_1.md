# 19 — Season flow, pack rebalance, retire rewards, shop polish

Five independent changes, grouped because they landed in the same
planning pass. Grounded in direct reads of `ResultScreen.tsx`,
`data/packs.ts`, `dynastyStore.ts`, `PackRevealSequence.tsx`, and
`ShopScreen.tsx`'s `ShopAdCard`. **Section 3 supersedes doc 18's "My
Packs tab" plan** — if doc 18 hasn't been built yet, skip its tab
version and build this doc's bottom-sheet version instead; if it has
already shipped, this doc replaces that specific piece of it.

## 1. Season-reward choice → straight to Dynasty Home

**Current:** `ResultScreen.tsx`'s `handleAcceptSeasonPack` and
`handleWatchSeasonRewardAd` both set `phase('done')` after the player
picks base-Rookie or watch-ad-for-Pro. `'done'` re-renders the same
results screen (final record, win/loss grid, share button) with an
"ENTER DYNASTY →" button (`handlePlayAgain`) as a separate tap. For a
Dynasty continuation season, the player has already watched the full
game-by-game reveal — this repeats a static summary of what they just
saw before letting them continue.

**Change:** both handlers call `navigation.replace('DynastyHome')`
directly instead of setting `phase('done')`:

```tsx
function handleAcceptSeasonPack() {
  applyNextSeasonResults(results, TODO_BALANCE_SEASON_END_PACK_TIER.base);
  navigation.replace('DynastyHome');
}

async function handleWatchSeasonRewardAd() {
  const watched = await requestSeasonRewardAd();
  applyNextSeasonResults(
    results,
    watched ? TODO_BALANCE_SEASON_END_PACK_TIER.adUpgrade : TODO_BALANCE_SEASON_END_PACK_TIER.base,
  );
  navigation.replace('DynastyHome');
}
```

- This only affects the `seasonReward` phase path (Dynasty
  continuation seasons with `SEASON_END_AD_UPGRADE_ENABLED`). The
  one-time initial draft and every non-Dynasty mode still land on the
  normal `'done'` screen with "PLAY AGAIN →" — unaffected.
- `resetGame()` (currently called inside `handlePlayAgain`) still needs
  to run before/with this navigation — don't drop that call, Dynasty's
  `gameStore` state needs clearing the same as the existing "ENTER
  DYNASTY" path does.
- `seasonRewardAdModalProps`/`RewardedAdModal` unaffected — this only
  changes what happens after the choice resolves, not the ad flow
  itself.

## 2. Pack rarity rebalance

**Problem, confirmed via the code's own `TODO_BALANCE` flags:** pull
quality is a flat, static rating-band mapping that never scales with
anything. Since a drafted roster's `avgRating` fallback is ~90, a
meaningful share of the *starting* roster already sits at the top of
the old `legend` band — every `common`/`rare` pull after that is
structurally guaranteed to be worse than what's already rostered,
making Rookie and Pro packs feel useless by season 3–4.

**`data/packs.ts` — `RARITY_RATING_BANDS`:**

```ts
const RARITY_RATING_BANDS: Record<PackRarity, { min: number; max: number }> = {
  common: { min: 60, max: 74 },
  rare: { min: 75, max: 84 },
  elite: { min: 85, max: 92 },
  legend: { min: 93, max: 100 },
};
```

**`PACK_TIERS` weights** (shift toward higher rarities across all three
tiers, not just Legend):

```ts
export const PACK_TIERS: PackTier[] = [
  {
    id: 'rookie',
    // ...unchanged fields...
    weights: { common: 30, rare: 40, elite: 22, legend: 8 },
  },
  {
    id: 'pro',
    // ...unchanged fields...
    weights: { common: 10, rare: 35, elite: 40, legend: 15 },
  },
  {
    id: 'legend',
    // ...unchanged fields...
    weights: { common: 0, rare: 10, elite: 45, legend: 45 },
  },
];
```

> **Check before locking these in:** run the actual generated player
> pool (`GENERATED_RECORDS` → `PACK_PLAYER_POOL`) against the new
> `legend` band (93–100) and confirm there are enough distinct players
> in that range, especially per-era once `eraLock` narrows the pool.
> `pickOne()`'s existing fallback (any not-yet-pulled player, regardless
> of rarity, if the target rarity has no candidates) will silently mask
> a too-thin pool by quietly downgrading pulls — so a thin pool won't
> error, it'll just fail to deliver on this change without anyone
> noticing. Report actual pool-size-per-band-per-era back before this
> ships, don't assume it's fine.

These are still placeholder numbers pending real playtesting — same
`TODO_BALANCE` status as before, just re-anchored to the direction
confirmed here (higher floors, more high-tier weight per pack) rather
than left at the original placeholder values.

## 3. Retire-for-Rings (replaces doc 18's My Packs tab plan — see §5 too)

**Problem, already flagged in `08-dynasty-gameplay-redesign.md`:** HOF
retirement mechanics have "no payout currently implemented." Retiring a
starter or releasing a bench player just moves them to `hallOfFame`
with zero economic effect today.

**`dynastyStore.ts`:**

```ts
// Reuses the same rarity bands packs.ts pulls from, so a retired
// player's payout is graded the same way a pack pull's rarity is —
// one shared notion of "how good is this player," not two.
export const TODO_BALANCE_RETIRE_RINGS_BY_RARITY: Record<PackRarity, number> = {
  common: 20,
  rare: 50,
  elite: 120,
  legend: 300,
};
```

Wherever `retirePlayer` / the release path inside `commitLineup` (or
`resolvePackPulls`'s auto-release-when-bench-is-full case — check both
call sites, not just the manual roster-tab retire action) currently
just appends to `hallOfFame`, add:

```ts
const reward = TODO_BALANCE_RETIRE_RINGS_BY_RARITY[ratingToRarity(player.rating)];
earnRings(reward, 'player_retired');
```

`ratingToRarity` already exists in `data/packs.ts` — import and reuse
it rather than re-deriving rarity from rating a second time.

**Surface the reward in the UI** wherever the retire/release confirmation
currently happens (`RosterManager.tsx`'s commit flow) — the player
should see what they earned, not have Rings silently increment in the
background.

## 4. Drop the My Packs tab — "See all" opens a bottom sheet instead

Doc 18 built a waiting-to-open strip on the Store tab plus a "See all"
tile for when `pendingCount` exceeds the strip's cap, originally
specced to navigate into a separate "My Packs" tab. That tab is now
redundant — the strip already surfaces pending packs on the screen
players are on by default, so a whole second tab for the same data is
extra navigation for no new capability.

**Change:** `ShopScreen.tsx` drops the `tab` state / `Pack Store` vs.
`My Packs` tab bar entirely — Store becomes the only view. `SeeAllTile`
from doc 18 opens a bottom sheet (reuse the existing `PackOddsSheet`
overlay pattern — same `sheetOverlay`/`sheet` styles, new content):

```tsx
const [packsSheetOpen, setPacksSheetOpen] = useState(false);

// SeeAllTile onPress:
onPress={() => setPacksSheetOpen(true)}

// Sheet content — same tile family as the strip/shelf (doc 18's
// OwnedPackTile), just laid out as a scrollable grid inside the sheet
// rather than a full-screen tab.
{packsSheetOpen && (
  <Modal transparent animationType="slide" onRequestClose={() => setPacksSheetOpen(false)}>
    <Pressable style={styles.sheetOverlay} onPress={() => setPacksSheetOpen(false)}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>My Packs</Text>
        <ScrollView contentContainerStyle={styles.tierShelfGrid}>
          {ownedPacks.map((pack) => (
            <OwnedPackTile key={pack.id} pack={pack} tier={findTier(pack.tierId)} onPress={() => { setPacksSheetOpen(false); openPack(pack.id); }} />
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>
)}
```

- Wide layout: the always-visible sidebar (`sidebarCardWide`) already
  shows every pending pack without needing a tab or a sheet — unaffected
  by this change, no sheet needed at wide widths since the sidebar
  already is the "see all" view.
- Doc 18's `WAITING_STRIP_CAP` and `WaitingPackTile` are unchanged —
  only what "See all" navigates to is different (sheet, not a tab).

## 5. Skip button — real button, not a bare text link

**`PackRevealSequence.tsx`:** the skip control added in doc 15 is
currently a plain `TouchableOpacity` around small muted mono text
(`SKIP ›`) with no visible chrome — easy to miss, small tap target.
Replace with the app's existing `SecondaryButton` component (same one
used elsewhere, e.g. `ResultScreen`'s Share button) instead of a raw
text link:

```tsx
{phase === 'reveal' && hasRevealedOnceThisSession && !skipRequested && (
  <SecondaryButton
    label="SKIP ›"
    onPress={handleSkip}
    style={styles.skipBtn}
  />
)}
```

Update `skipBtn` positioning to accommodate a real button's size
(padding, min tap height) rather than the small text-link footprint —
keep it top-right/absolute-positioned as before, just sized for a
proper button now.

## 6. Ad button — more visual prominence

**`ShopAdCard`'s collapsed pill (doc 15, §5):** deliberately muted at
the time since the Store tab was crowded with full-detail tier cards.
Doc 18's shelf redesign frees up enough visual room that the ad pill can
read as "worth tapping" instead of "secondary and optional," without
reintroducing a full card.

Keep the same collapsed pill *shape* (`adPill`/`adPillText` from doc
15), swap the color treatment from muted gray to gold-accented:

```ts
adPill: {
  alignSelf: 'flex-start', backgroundColor: 'rgba(212,160,23,0.12)',
  borderWidth: 1, borderColor: Colors.gold, borderRadius: Radius.full,
  paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10,
},
adPillText: { color: Colors.gold, fontFamily: Font.secondarySemiBold, fontSize: Typography.xs },
```

## 7. Ad reward curve — first-watch bonus, stacked (not a rescale)

**Constraint that ruled out a flat "+100 on Day 1":** the existing
`TODO_BALANCE_SHOP_AD_STREAK_RINGS` table escalates `Day 1: 15 → Day
7+: 100` specifically so sticking with the daily habit pays off over
time. Making Day 1 itself worth 100 would equal today's *best* streak
day immediately, collapsing the entire reason to keep the streak going.

**Resolution: stack a one-time first-watch-of-the-day bonus on top of
the existing table, rather than rescaling it.** This is the
conservative option — it preserves the escalation's intent (streaks
still matter, still climb toward a bigger number) while still making
the very first watch of a session feel like a bigger payoff than today.
Flagging this choice explicitly since it wasn't the only option
discussed — confirm this is the direction wanted, not the alternative
full-curve rescale, before treating it as final:

```ts
export const TODO_BALANCE_SHOP_AD_FIRST_WATCH_BONUS = 50;
```

**`watchShopAdForRings()`:**

```ts
watchShopAdForRings: () => {
  const { lastShopAdWatchDate, shopAdStreakDay, shopAdWatchesToday, rings } = get();
  const today = todaySeedBase();
  const isNewDay = lastShopAdWatchDate !== today;
  const watchesToday = isNewDay ? 0 : shopAdWatchesToday;
  if (watchesToday >= TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY) return 0;

  const nextStreakDay = nextShopAdStreakDay(lastShopAdWatchDate, shopAdStreakDay, today);
  const isFirstWatchToday = watchesToday === 0;
  const reward = shopAdStreakRingsForDay(nextStreakDay)
    + (isFirstWatchToday ? TODO_BALANCE_SHOP_AD_FIRST_WATCH_BONUS : 0);

  set({
    rings: rings + reward,
    lastShopAdWatchDate: today,
    shopAdWatchesToday: watchesToday + 1,
    shopAdStreakDay: nextStreakDay,
  });
  return reward;
},
```

`computeShopAdPreview()` needs the same bonus folded into its
`nextReward` calculation so the Shop UI's pre-watch preview
(`"Day N · +R Rings"`) matches what actually gets paid out — don't let
the preview and the real payout drift apart.

With this stacked on top: Day 1 = 15+50 = **65**, Day 7+ = 100+50 =
**150** (only on that day's first watch; subsequent same-day watches get
the base streak amount with no bonus, per `isFirstWatchToday`). Full
resulting table, for reference:

| Day | Base | +First-watch bonus | Total (1st watch) |
|---|---|---|---|
| 1 | 15 | +50 | 65 |
| 2 | 25 | +50 | 75 |
| 3 | 35 | +50 | 85 |
| 4 | 50 | +50 | 100 |
| 5 | 65 | +50 | 115 |
| 6 | 80 | +50 | 130 |
| 7+ | 100 | +50 | 150 |

## What this doc does NOT change

- Duplicate-pull Rings refund (`TODO_BALANCE_DUPE_REFUND_RINGS`) —
  unaffected by the rarity-band rebalance in §2; still a flat refund
  regardless of the duplicate's rarity. Worth a future look now that
  rarity bands are shifting, but out of scope here.
- `PACK_CARD_COUNT` — confirmed staying at 4, no code change needed.
- Doc 18's shield badges, waiting-strip cap/tile, and shelf tile
  components — unaffected structurally by dropping the tab; the same
  tiles are just reused inside a sheet instead of a tab's content area.

## Acceptance criteria

- [ ] Choosing either season-reward option navigates directly to
      Dynasty Home; the static "done" results screen no longer appears
      for a Dynasty continuation season
- [ ] Non-Dynasty modes and the initial draft still reach the normal
      "done" screen unchanged
- [ ] New `RARITY_RATING_BANDS` and `PACK_TIERS` weights are in place,
      with confirmed pool-size-per-band-per-era before considering this
      done (not just code-complete)
- [ ] Retiring or releasing a player (both the manual roster-tab path
      and the pack-pull-triggered auto-release-when-bench-full path)
      awards Rings scaled by `ratingToRarity(player.rating)`, and the
      player sees the amount earned
- [ ] `ShopScreen.tsx` has no `tab` state / tab bar; Store is the only
      view
- [ ] "See all" opens a bottom sheet listing every owned pack via the
      existing tile components; wide layout is unaffected (sidebar
      already shows everything)
- [ ] Skip button on the reveal screen is a real `SecondaryButton`, not
      a bare text link
- [ ] Ad pill uses the gold-accented treatment, same collapsed shape as
      before
- [ ] First watch of each calendar day pays streak-amount +
      `TODO_BALANCE_SHOP_AD_FIRST_WATCH_BONUS`; subsequent same-day
      watches pay streak-amount only
- [ ] `computeShopAdPreview()`'s displayed preview matches the actual
      payout including the first-watch bonus
