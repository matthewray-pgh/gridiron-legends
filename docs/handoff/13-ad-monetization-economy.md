# 09 — Ad-based monetization economy

Reference: `docs/handoff/03-legacy-mode.md` (Rings currency, Packs) and
`src/store/dynastyStore.ts` (`TODO_BALANCE_RINGS_SOURCES`,
`TODO_BALANCE_SEASON_END_PACKS`). This doc resolves the open
`DECISION NEEDED` items around ad-based Rings earning and season-end
pack tiering; it does not touch pack costs or direct-purchase Rings
(no premium/purchasable currency has been added — rewarded ads only).

## Philosophy

Rewarded ads only, no interstitials. Every placement is opt-in and
player-initiated — nothing is gated behind a forced ad. The existing
`dailyChallengeCompletion: 40` Rings/day (see `dynastyStore.ts`) was
the original non-ad baseline this was calibrated against, but that
turned out to undervalue ads as an incentive — a per-watch reward that's
1-2% of a Rookie pack cost isn't worth the interruption. Ads are now
tuned to be a **real, competitive earn path**, not a token gesture, on
the understanding that this trades toward more ad revenue and faster
non-paying progression, not toward keeping ads strictly secondary to
play.

> DECISION NEEDED (confirmed direction, not yet re-confirmed against
> final numbers below): ads are allowed to match or exceed normal-play
> earn rate for a fully engaged daily watcher. If that's not the
> intended trade-off, the streak curve in section 1 needs to be
> flattened back down before implementation.

## 1. Shop — anytime ad watch → Rings

Always-available "Watch an ad for Rings" button in the Shop. Reward
scales on a **daily login/watch streak**, not a flat per-watch amount —
resets to Day 1 if a calendar day is missed. Softening the reset (e.g.
dropping back a few tiers instead of a full reset to Day 1) is an open
question, not decided:

```ts
// Proposed — not yet implemented, no TODO_BALANCE constant exists yet
export const TODO_BALANCE_SHOP_AD_STREAK_RINGS = {
  day1: 15,
  day2: 25,
  day3: 35,
  day4: 50,
  day5: 65,
  day6: 80,
  day7Plus: 100, // caps here; see open question below
} as const;

export const TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY = 3;
```

At the day-7+ cap and max watches, this is 300 Rings/day from this
placement alone — enough to fund a Legend pack (650-700) in roughly
2-3 days of sustained daily engagement.

> DECISION NEEDED: streak-break behavior (full reset to Day 1 vs. a
> softer partial rollback, e.g. day 7 → day 4) — not decided.

> DECISION NEEDED: whether the Day 7+ plateau holds flat forever or
> creeps slowly upward (e.g. +5/week) so long-streak players don't
> feel the reward has "solved" and gone static — not decided.

## 2. Common level completion → ad-boosted reward

Base reward per common level completion needs its own `TODO_BALANCE`
constant — none currently exists anywhere in `dynastyStore.ts` or
elsewhere; this was invented for this doc and needs product sign-off
before implementation, per the existing "don't invent real numbers"
convention in `03-legacy-mode.md`.

Escalation is **per consecutive ad-boosted level within a session**
(there's no calendar-day concept at this granularity), proposed as:

```ts
// Proposed — no TODO_BALANCE constant exists yet, base value unconfirmed
export const TODO_BALANCE_COMMON_LEVEL_BASE_RINGS = 20;

export const TODO_BALANCE_LEVEL_AD_BOOST_RINGS = {
  streak1: 40,   // 2x
  streak2: 50,   // 2.5x
  streak3: 65,   // 3.25x
  streak4: 85,   // 4.25x
  streak5Plus: 100, // 5x, caps here
} as const;
```

> DECISION NEEDED: what resets the within-session streak — completing
> a level *without* watching the ad (aggressive, punishes any skip),
> or only a full session end/app close (gentler, allows skipping one
> level's ad without losing progress). Leaning toward the gentler
> option to avoid the mechanic feeling coercive, but not decided.

> DECISION NEEDED: whether this streak counter is scoped to "common
> levels" specifically (as currently spec'd) or should generalize
> across difficulty tiers if/when non-common levels are added later.

## 3. Dynasty season-end pack → ad-upgraded tier

This fills a real gap: `TODO_BALANCE_SEASON_END_PACKS = 1` currently
has no tier logic at all — it's a flat pack count with the tier
implicitly whatever `applySeasonOutcome` defaults to. Proposed rule:

- Base, unconditional: **1 Rookie pack**
- Watch ad → upgrade to **1 Pro pack** (same count, tier only — not 2
  packs, to avoid this also functioning as a quantity-inflation lever
  stacked on top of `TODO_BALANCE_INITIAL_DRAFT_BONUS_PACKS`)
- No ad path to Elite/Legend from this placement — top tiers stay
  reserved for milestone/HOF-retirement progression so they don't feel
  ad-farmable once per season

```ts
// Proposed replacement for the existing flat TODO_BALANCE_SEASON_END_PACKS
export const TODO_BALANCE_SEASON_END_PACK_TIER = {
  base: 'rookie',
  adUpgrade: 'pro',
} as const;
```

This is a single binary choice at the season-end moment (accept
Rookie, or watch ad for Pro) — simplest to implement and playtest.

## 4. Cross-placement caps

Each placement above is individually self-limiting (Shop = daily
watch cap, level-boost = tied to play speed, season-end = once per
season), so no additional global daily Rings ceiling is applied on top
— a dedicated player's total potential earnings are not artificially
capped beyond what the three placements naturally produce.

> DECISION NEEDED: confirm this is still the intended approach once
> real numbers are playtested — a maxed Shop streak (300/day) stacked
> with a maxed level-boost session in the same day adds up quickly, and
> it's worth checking that combined total against pack costs before
> shipping rather than after.

## 5. Fallback when ads are unavailable

No ad inventory / no-fill should not produce an error or "try again"
state. Simplest version: a feature flag per placement (or one master
flag) that hides the ad-boost affordance entirely and silently falls
back to the base reward. This doubles as a manual kill switch if ads
need to be pulled for a policy or network reason.

> DECISION NEEDED: per-placement flags vs. one master flag — leaning
> toward per-placement for finer control (e.g. pull Shop ads without
> also pulling the season-end upgrade), not decided.

## Acceptance criteria

- [x] `TODO_BALANCE_SHOP_AD_STREAK_RINGS` and
      `TODO_BALANCE_SHOP_AD_MAX_WATCHES_PER_DAY` added to
      `dynastyStore.ts`, following existing `TODO_BALANCE_*` naming
      and comment-provenance convention
- [ ] `TODO_BALANCE_COMMON_LEVEL_BASE_RINGS` and
      `TODO_BALANCE_LEVEL_AD_BOOST_RINGS` — **not implemented.**
      Section 2 has no attachment point in the current codebase: game
      modes are `daily | classic | offense | timer | dynasty`, none of
      which is a "common level," and only `daily` earns Rings today.
      Confirmed with the user to skip this section rather than invent a
      mapping onto an existing mode — revisit once a real leveled-mode
      concept exists.
- [x] `TODO_BALANCE_SEASON_END_PACKS` supplemented with
      `TODO_BALANCE_SEASON_END_PACK_TIER` tier logic (count constant
      unchanged — still always 1 pack; only the tier varies)
- [x] Streak-reset behavior (Shop) decided (full reset to Day 1, per the
      doc's own constant table) and implemented
      (`nextShopAdStreakDay`/`isNextConsecutiveDay`); Day 7+ confirmed to
      hold flat forever rather than creep
- [ ] Within-session streak-reset behavior (level boost) — N/A, section 2
      out of scope for this pass
- [x] Per-placement ad-unavailable feature flag implemented
      (`SHOP_AD_RINGS_ENABLED`, `SEASON_END_AD_UPGRADE_ENABLED` in
      `config/featureFlags.ts`), falls back silently to the base reward
      with no error state (`useRewardedAd`'s `requestAd()` resolves
      `false` immediately when disabled)
- [x] Odds-disclosure ("View Odds") sheet shown before the season-end ad
      upgrade specifically — extracted the Shop's existing sheet into a
      shared `PackOddsSheet` component so both placements render the same
      odds table/guarantee box
- [ ] Combined worst-case daily Rings total (all three placements maxed)
      sanity-checked against pack costs — still needs real playtesting;
      not something to check in code

### Implementation notes

No ad SDK exists in this project yet (no AdMob, no native config).
Confirmed with the user: `components/RewardedAdModal.tsx` +
`hooks/useRewardedAd.ts` simulate watch-to-completion (a timed "ad
playing" modal) behind the same `requestAd(): Promise<boolean>`
interface a real SDK integration would need, so the streak/reward/tier
logic can be built and played against now and the simulated modal
swapped out later without touching call sites in `ShopScreen.tsx` or
`ResultScreen.tsx`.
