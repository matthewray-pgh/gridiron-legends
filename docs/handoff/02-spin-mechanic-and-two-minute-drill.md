# 02 — "Lock It In" spin mechanic + Two-Minute Drill mode

Reference: section 3 of `gridiron-legends-redesign-concepts.html`
(interactive demo in that file shows the intended feel — open it in a
browser and try it before implementing).

## Design decision (already made, don't re-litigate)

Lock It In is **not** a replacement for the existing random spin, and
it's **not** a per-run toggle on Classic/Gridiron IQ. It ships as a new
standalone mode called **Two-Minute Drill**. Reasons, for context:

- The Daily Challenge guarantees identical spins for every player — a
  skill-timing mechanic breaks that fairness guarantee, so it can't be
  the default/Daily spin.
- It's a real attention/time cost per round (watching two timing bars,
  12 rounds a season) — fine for players opting in, bad if forced onto
  people speed-running Classic.

Working name is **Two-Minute Drill**. Alternatives considered: Snap
Count, Hot Read, Play Clock — swap the label in one place
(`GameMode` display name mapping) if the user picks a different one
later; don't hardcode the string in multiple screens.

## Mechanic

Each round, instead of `SpinScreen`'s current single blind spin
(`rollSpin()` in `gameStore.ts`), Two-Minute Drill shows two independent
timing tracks: **Team** and **Era**.

- Each track has a marker sweeping back and forth on its own duration
  (mockup uses 1.5s for Team, 1.9s for Era — deliberately offset so both
  can't be locked with the same timing).
- A "sweet zone" is marked on each track (mockup: 41%–56% of track
  width).
- Player taps **LOCK TEAM** / **LOCK ERA** independently. Locking freezes
  that track's marker at its current position.
- **The actual team/era outcome is still fully random and independent of
  where the marker lands** — do not let lock position influence which
  team/era is selected. This preserves fairness/balance; the mockup's JS
  demo (`lockReel()`) shows this pattern: marker position only determines
  bonus/no-bonus, a separate `Math.random()` pick determines the actual
  team/era.
- Landing inside the sweet zone on a track grants a small bonus:
  - Team lock hit → +1 reroll for that round
  - Era lock hit → one-time OVR boost applied to the next pick in that
    round

> DECISION NEEDED: exact bonus values above are placeholders carried
> from the mockup, not finalized game balance. Also decide whether these
> bonuses pay out in-run only, or also mint Rings if Legacy mode (doc 03)
> is live — that would make Two-Minute Drill relevant even for players
> not actively pursuing Legacy. Don't decide this unilaterally in code.

## Implementation approach

### State (`gameStore.ts`)

- Extend `GameMode` — decide whether to repurpose the existing unused
  `'timer'` value for this mode (cleanest, since `MAX_PASSES_BY_MODE`
  already has a `timer: 3` placeholder) or add a new `'twoMinuteDrill'`
  value and treat `'timer'` as dead code to remove. Repurposing `'timer'`
  is recommended unless there's a reason it was reserved for something
  else — check git history / commit messages for context before
  reusing it blindly.
- `rollSpin()` currently picks a random combo synchronously and sets
  `spinState: 'revealed'` immediately. Two-Minute Drill needs the spin
  result pre-determined but *not revealed* until both tracks are locked
  — i.e. call the existing random-combo selection logic to get the
  result, hold it, and only surface it to the UI after both locks
  resolve. Don't reveal-then-hide; the result should not be computed
  visibly early where a player could infer it from render timing.
- Add lock-state tracking, e.g.:
  ```ts
  teamLockResult: 'pending' | 'hit' | 'miss';
  eraLockResult: 'pending' | 'hit' | 'miss';
  ```

### New screen or variant of `SpinScreen.tsx`?

Recommend a **new screen** (`TwoMinuteDrillSpinScreen.tsx`) rather than
branching heavily inside the existing `SpinScreen.tsx` — the animation
model is fundamentally different (two independently-timed tracks with
tap-to-lock vs. the current single reveal animation using
`Animated.Value` reels). Forking avoids a screen with two unrelated
animation systems tangled together. Share the result/reveal panel
component between both if the visual pattern is similar enough.

- Add `TwoMinuteDrillSpin: undefined` (or with params) to
  `RootStackParamList` in `navigation/types.ts`.
- Register the route in `AppNavigator.tsx`.
- Home screen's Two-Minute Drill mode card routes here instead of the
  standard `SpinScreen`.

### Timing/lock implementation

The HTML mockup's JS trick — reading `getComputedStyle(marker).left`
mid-animation to get the interpolated position at lock time — works in
a DOM/web context but has no direct equivalent in React Native's
`Animated` API. For React Native, use `Animated.Value.addListener()` (or
`Animated.Value.stopAnimation(callback)`, which returns the current
value at the moment it's called) to read the marker's position when the
player taps Lock, then compare against the sweet-zone range. If the web
conversion is what's actually being built against, the mockup's
`getComputedStyle` approach ports directly.

### Acceptance criteria

- [ ] Team/era outcome is provably independent of lock timing (write a
      test that locks at a fixed bad position N times and confirms the
      resulting team/era distribution is still uniform-random)
- [ ] Both tracks must be locked before the round can advance
- [ ] Bonus values are behind a named constant, not inlined magic
      numbers, so balance can be tuned without touching layout code
- [ ] Daily Challenge mode is unaffected — confirm `mode === 'daily'`
      still routes to the existing `SpinScreen`, never
      `TwoMinuteDrillSpinScreen`
