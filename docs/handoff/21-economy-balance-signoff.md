# Gridiron Legends — Economy Sign-Off Packet
For the product decision meeting on TODO #12/#13 (economy + rating balance).
Every value below is a `TODO_BALANCE_*` constant currently live in `src/store/dynastyStore.ts` / `src/data/packs.ts`. None of these are confirmed game balance — they're either invented placeholders or partially-reconciled proposals from different handoff docs written at different times.

**How to use this:** for each item, either check "Ship as-is" or write a new number. Nothing here is a rewrite — it's a decision list.

---

## 1. Pack costs & odds (`src/data/packs.ts` — `PACK_TIERS`)

| Tier | Cost | Odds (Common/Rare/Elite/Legend) | Guarantee |
|---|---|---|---|
| Rookie | 100 Rings | 30 / 40 / 22 / 8 | None |
| Pro | 280 Rings | 10 / 35 / 40 / 15 | 1+ Rare or better |
| Legend | 650 Rings | 0 / 10 / 45 / 45 | 1+ Elite or better |

- [x] Ship as-is — current odds approved, feels right in-game

**Open flag:** these weights were re-anchored once already (doc 19) after a math check showed a drafted roster's average rating (~90) sat inside the *old* Legend band — meaning early pack pulls were structurally guaranteed to be downgrades. The current bands (below) fixed that, but the odds curve itself is still an unverified guess.

## 2. Rarity rating bands (`RARITY_RATING_BANDS`)

| Rarity | Rating range |
|---|---|
| Common | 60–74 |
| Rare | 75–84 |
| Elite | 85–92 |
| Legend | 93–100 |

- [ ] Ship as-is  [ ] Revise bands

This directly drives #13 (player rating/tier balancing) — it's the single mapping that decides what "Legend" means across packs, retirement payouts, and the badge/rarity display.

## 2b. Retire/release payouts (rarity-based, finalized)

```ts
export const TODO_BALANCE_RETIRE_RINGS_BY_RARITY: Record<PackRarity, number> = {
  common: 5,
  rare: 10,
  elite: 30,
  legend: 100,
};
```

Deliberately **not** scaled by source pack tier — same payout for a given rarity regardless of whether it came from a Rookie, Pro, or Legend pack. Confirmed trade-off: Legend Pack buyers get a lower proportional return (46% of cost) than Rookie buyers (~100% of cost) as a direct mathematical consequence of flat-rarity payout combined with Rookie Packs' 8%-per-card Legend odds — the Legend payout can't go higher without making Rookie-pack flipping profitable again.

| Tier | Cost | Expected retire-back (odds-weighted) | % of cost |
|---|---|---|---|
| Rookie | 100 | 100.5 | ~100% (break-even, ~0.5% positive edge — noise-level, not a farmable exploit since Rookie has no guarantee floor) |
| Pro | 280 | 155 | 55% |
| Legend | 650 | 297.5 | 46% |

- [x] Approved — ship as specified

## 2c. Trophy-In-All payout (finalized)

```ts
export const TODO_BALANCE_TROPHY_ALL_RINGS_PER_CARD = 10;
```

Safe against every pack's cost-per-card (Rookie 20, Pro 56, Legend 130 — 10 is unprofitable against all three). **Open inconsistency, not blocking:** at flat 10, Trophy-In-All now pays *more* than retiring a Common card individually (10 vs. 5) and ties Rare (10 vs. 10) — meaning instant cash-in beats "keep it, roster it, retire later" at the bottom of the rarity ladder, which cuts against the original intent that Trophy-In-All should read as clearly worse than building the roster out. Not an exploit (no path to profit off pack cost), just an incentive-ordering gap. Options: bump Common retire 5→6 (closes the gap cleanly, doesn't touch the approved Rare/Elite/Legend numbers), or accept it since Common/Rare cards are the least consequential tier anyway.

- [x] Accepted as-is — Common retire stays at 5, tie with Trophy-In-All (10) accepted rather than adjusted

## 1b. `PACK_CARD_COUNT` — doc/code discrepancy, resolved

Live code (`src/data/packs.ts`) has `PACK_CARD_COUNT = 5`. Doc 19's "What this doc does NOT change" section says *"`PACK_CARD_COUNT` — confirmed staying at 4, no code change needed."* **Confirmed with the user: 5 is correct, the code is right.** Doc 19 and the two shop mockup HTML files (`gridiron-legends-shop-mockups.html`, `gridiron-legends-shop-web.html`) still say "4 cards" in several places — these are stale and should be corrected to "5 cards" so future handoff work doesn't get misled by them. I don't have write access to push directly to the repo; exact fix for whoever applies it:
- `docs/handoff/19-season-flow-pack-rebalance-shop-polish_1.md` — change "confirmed staying at 4, no code change needed" to note 5 is correct and matches the shipped code
- Both shop mockup HTML files — replace "4 cards" labels with "5 cards" in each tier card

## 1c. Pool-size-per-band-per-era check — RESOLVED, ran against real data

Doc 19 flagged this as a blocker ("report actual pool-size-per-band-per-era back before this ships, don't assume it's fine") and it was never actually closed out — the only prior evidence was a code comment asserting it passed. Ran it directly against `data_generator/outputs/nfl_era_players.json` (24,515 records) rather than trusting the comment:

**Distinct players (deduped by `playerId`, not record count) per band, per era:**

| Era | Common | Rare | Elite | Legend |
|---|---|---|---|---|
| 2000–2005 | 1,869 | 431 | 346 | 322 |
| 2006–2010 | 1,896 | 479 | 335 | 312 |
| 2011–2015 | 1,978 | 522 | 411 | 354 |
| 2016–2020 | 2,070 | 512 | 466 | 332 |
| 2021–2025 | 2,109 | 572 | 404 | 366 |

Thinnest case (2006–2010 Legend band, 312 players) is still 62x the 5 needed for a single era-locked Legend Pack pull. **No thin-pool risk — cleared.**

**Side finding, non-blocking:** actual player ratings top out at 99, not 100 — `RARITY_RATING_BANDS.legend`'s `max: 100` is unreachable/cosmetic, doesn't affect band membership or pool size.

- [x] Resolved — pool sizes confirmed healthy across all eras/bands

## 3. Rings earn sources

### 3a. Current implemented values (baseline — for comparison only)

| Source | Value | Frequency |
|---|---|---|
| Daily Challenge completion | 40 | 1x/calendar day |
| Shop ad — streak table | Day1: 15 → Day7+: 100 | 1st watch/day, escalating |
| Shop ad — first-watch bonus | +50 | stacks on streak, 1st watch only |
| Shop ad — 2nd/3rd watch | = same streak value, no discount | up to 3x/day |
| **Max Rings/day (fully engaged)** | **~390** | |

**Problem:** all three daily watches pay the full streak amount, so at Day 7+ a player earns 100+150+100+100 = 350 just from ads, plus 40 from Daily Challenge = **390/day**. That funds a Legend Pack (650) in under 2 days — the reward stops feeling special almost immediately, and there's no reason to keep watching after day 2–3 since there's nothing left worth saving for.

### 3b. FINALIZED — first-watch bonus removed

Per decision: no separate first-watch bump. First watch of the day pays the plain streak value; watches 2–3 stay the flat bonus-watch top-up from before.

| Source | Value | Frequency |
|---|---|---|
| Daily Challenge completion | 40 *(unchanged)* | 1x/calendar day |
| Shop ad — streak table (1st watch of the day) | Day1: 20 → Day7+: 100 | escalating, no bonus stacked on top |
| Shop ad — bonus watch | flat 30, watches 2–3 only | up to 2 extra/day |
| Shop ad — max watches | 3/day *(unchanged)* | cap |
| **Max Rings/day (fully engaged, Day 7+)** | **200** *(100 first watch + 30 + 30 + 40 daily)* | |

```ts
export const TODO_BALANCE_SHOP_AD_STREAK_RINGS = {
  day1: 20, day2: 30, day3: 40, day4: 55, day5: 70, day6: 85, day7Plus: 100,
} as const;

// TODO_BALANCE_SHOP_AD_FIRST_WATCH_BONUS removed per decision — first
// watch pays plain streak value, no separate stacked bonus.

export const TODO_BALANCE_SHOP_AD_BONUS_WATCH_RINGS = 30;
```

`watchShopAdForRings()`: first watch of the day pays `shopAdStreakRingsForDay()` only; watches 2 and 3 pay flat `BONUS_WATCH_RINGS`. `computeShopAdPreview()` needs the same branch.

- [x] Finalized — ship as specified above

### 3c. Progression pace this produces

| Player type | Days to afford Rookie (100) | Pro (280) | Legend (650) |
|---|---|---|---|
| Passive only (Daily Challenge, no ads) | 2.5 days | 7 days | 16 days |
| Engaged ad-watcher (all 3 watches, streak maxed) | <1 day | ~1.4 days | **~3.25 days** |

That's a **5x** compression for a fully engaged ad-watcher over passive play (200 vs. 40 Rings/day) — still a strong, legible incentive without collapsing the Legend tier to a same-day unlock. Passive-only players still see real, steady movement (a Rookie every ~2.5 days) so nobody feels ad-gated.

Other earn sources (dupe refund 25, Trophy-In-All 10/card, retire payouts 5/10/30/100 — see §2b/2c) stay unchanged from their finalized values above — they're already small relative to the new 200/day ceiling and don't need adjustment on account of the ad redesign.

- [x] Finalized

### 3d. Making the ad *feel* important — presentation, not just numbers

The numbers only do half the job. Three things in the existing UI already support this and should stay/lean in; two are gaps worth closing:

- **Keep and lean into:** the streak badge (`DAY N STREAK`) and the pop-in `+R EARNED` animation already give the reward a moment — don't compress that timing to save a screen-tap.
- **Keep:** the pre-watch preview text (`"Day N · +R Rings"`) — telling the player the number *before* they commit is what makes it feel like a deliberate choice/reward rather than a random drip.
- **Gap — differentiate the first watch visually, not just numerically.** Right now all 3 watches use the same `ShopAdCard` treatment. Since watch #1 is now the "event" (streak + bonus) and watches #2–3 are a smaller top-up, the UI should say so: first watch gets the full card treatment; watches 2–3 can show a smaller "+30 bonus watch available" affordance so the size difference is legible, not just felt as "the number went down."
- **Gap — a Day 7+ streak-maxed moment.** Hitting the cap currently just plateaus silently. A one-time "Streak Maxed!" badge or banner the first time a player reaches Day 7+ gives the escalation an actual payoff moment instead of fading into a flat number — and it's a natural first entry for the achievements/badges system (#10) once that's built, so it's worth wiring the hook now even if the badge UI ships later.

## 4. Pack awards (non-purchase)

| Event | Award | Notes |
|---|---|---|
| Season-end (normal) | 1 Rookie Pack | free, every season |
| Season-end (watch ad) | upgrades to 1 Pro Pack | same count, tier only |
| Initial draft completion | 2 packs (one-time) | bonus for empty bench on season 1 |

- [x] Ship as-is — keep current values

| Item | Value |
|---|---|
- [x] Ship as-is — keep current value

## 6. Not implemented — confirm out of scope for MVP

These appear in the docs but have no attachment point in the current codebase (game modes are `daily / classic / offense / timer / dynasty` — no "common level" concept exists), and were already confirmed skipped in doc 13:

- Common-level completion ad-boosted rewards
- Dynasty XP/leveling curve — **note: this system was fully replaced.** `dynastyLevel`/`dynastyXP` no longer exist in `dynastyStore.ts`; Dynasty progression is now just `currentSeason`, incrementing by 1 per season simulated. Any doc still referencing `TODO_BALANCE_DYNASTY_SEASON_XP` is stale — no decision needed here, it's resolved by the rewrite.

- [x] Confirmed out of scope for MVP

## 7. Badge/rarity mapping (blocks #10 — achievements/badges)

Six brand badges exist (MVP, All-Pro, Legend, Hall of Fame, Elite, Icon) with no confirmed mapping onto the four pack rarities (common/rare/elite/legend).

- [x] **Deferred — achievements/badges (#10) is a future release, not MVP.** No mapping decision needed right now; the §3d note about wiring a "Streak Maxed" hook now for a later badge to consume is optional, not required for launch.

## 8. Two-Minute Drill — "Lock It In" rewards (finalized)

Resolves the `DECISION NEEDED` in `docs/handoff/02-spin-mechanic-and-two-minute-drill.md`: no Rings connection for this mode. Rewards stay entirely in-run/mechanical, additive across all three outcomes — never a downgrade for hitting more.

| Outcome | Reward | Scope |
|---|---|---|
| Team lock hit | +1 reroll *(unchanged)* | that round only |
| Era lock hit | +3 OVR boost on next pick *(unchanged)* | that round only |
| **Both hit (NEW)** | **Draft suggestion** — highest-rated candidate in that round's actual eligible pool (`currentCandidates()`) is visually flagged | that round only |

**Additive by design, not a replacement:** hitting both keeps the +1 reroll *and* the +3 OVR *and* adds the suggestion. Deliberately not consolidated into one bigger reward — a single-reward version would mean hitting both nets *less* than hitting one and missing the other, which would make deliberately whiffing a lock the "optimal" skilled play. Additive avoids that trap entirely.

**Why "highest-rated candidate" instead of a tier-based highlight (e.g. Legend/GOAT):** checked both against the real generated data. Tier-based (`Tier: 'GOAT'|'Legend'|'Elite'`, ratings 85+) has a real availability gap — 2 of 60 team/era combos have zero Legend+/GOAT candidates at the QB position, 1 of 60 at TE — so the reward would occasionally have nothing to highlight. "Highest-rated in the actual pool" has zero empty cases across all 360 position/team/era combos checked, and the median pool size (14 candidates) confirms it's a meaningful suggestion, not a trivial one-candidate reveal.

**Implementation note:** doesn't literally display the OVR number — stays consistent with the existing rule that OVR/ratings are hidden by default everywhere and only ever surface as an earned reveal, not a baseline display.

- [x] Finalized — no Rings involved, no new economy surface, no tier-naming ambiguity with the Shop's separate `PackRarity` "legend" band (93–100 rating — different scale from the draft flow's `Tier` type, worth remembering these are two unrelated systems that happen to share vocabulary)

---

## MVP scope — confirmed final

**In scope for initial release (economy work covered by this packet):**
- Pack costs & odds (§1) — current values
- Rarity rating bands (§2)
- Retire/release payouts (§2b) — 5/10/30/100
- Trophy-In-All (§2c) — flat 10
- Ad economy (§3) — 200 Rings/day ceiling, no first-watch bonus
- Season-end pack awards (§4) and era-lock surcharge (§5) — current values
- `PACK_CARD_COUNT = 5` (§1b) — code is correct, docs need the fix noted there

**Out of scope for initial release** (pulling together everything flagged across this whole review, not just this packet):
- Achievements/badges (#10) and the Hall of Fame badge/rarity mapping (§7) — future release, per today's decision
- Hall of Fame viewer screen (#6 on the original TODO list) — already pulled behind a feature flag pending roster-management work, unaffected by this economy pass
- Challenge a friend (#7) — needs backend/matchmaking infrastructure not built
- Single-card purchase / guaranteed-legend shop option (#11) — new economy surface area on top of an economy that's only now being locked; revisit once live data exists
- More animations/polish (#4 on the original list) — nice-to-have
- Common-level ad-boosted rewards — no attachment point in the current mode set (§6 on the old numbering), confirmed skip
- Full E2E/unit test coverage beyond what already exists — the repo does have a Playwright e2e suite (`npm run test:e2e`) already wired up per the README; expanding coverage is real work but isn't new infrastructure

**Everything in this packet is now finalized.** The economy blocker (#12/#13) is closed pending implementation.
