// Dynasty mode (Rings currency, persistent roster, packs, Hall of Fame) —
// see docs/handoff/03-legacy-mode.md (referred to there as "Legacy mode",
// renamed Dynasty throughout per product direction).
export const DYNASTY_ENABLED = true;

// Leaderboard and the "Challenge" mode card (its only entry point) — pulled
// from the UI for now, confirmed with the user, not deleted: LeaderboardScreen.tsx,
// statsStore's leaderboard data, and the `Leaderboard` route registration in
// AppNavigator.tsx are all untouched. Flip back to true to restore the
// Challenge mode card/pill, the LeaderboardTeaser sidebar widget, and the
// AppShell header shortcut all at once — that's every entry point.
export const LEADERBOARD_ENABLED = false;

// Temporary, testing-only (docs/handoff/09-ovr-visibility-reversal.md) —
// gold OVR shown inline after every player name, everywhere. Gates the
// *display* only: candidate lists sort by year-then-name regardless of this
// flag (that's a permanent rule, not a testing aid — see data/players.ts
// sortRecords and GameScreen.tsx's groupedCandidates). Flip to `false` (or
// delete the display code) before launch.
export const SHOW_DEBUG_OVR = true;

// Hall of Fame (retired-player shelf) — pulled from the UI for now while
// Dynasty's roster-management flow settles, confirmed with the user, not
// deleted: HallOfFameScreen.tsx, dynastyStore's `hallOfFame` data (still
// populated by every Retire/Release in RosterManager.tsx), and the
// `HallOfFame` route registration in AppNavigator.tsx are all untouched.
// Flip back to true to restore the "Hall of Fame" entry card on
// DynastyHomeScreen and the HOF chip on HomeScreen's Dynasty banner.
export const HALL_OF_FAME_ENABLED = false;
