export type RootStackParamList = {
  Home: undefined;
  Spin: undefined;
  TwoMinuteDrillSpin: undefined;
  Game: undefined;
  // dynastyContinuation distinguishes Dynasty's one-time initial-draft
  // completion (undefined/false — roster comes from gameStore, see
  // ResultScreen.tsx) from an ongoing season simulation triggered by
  // DynastyHomeScreen's "Start season" button (true — roster comes from
  // dynastyStore directly, no draft involved). Deliberately a route param
  // rather than inferred from roster emptiness, which is ambiguous once a
  // Dynasty roster can go back to empty (e.g. every starter retired).
  Result: { dynastyContinuation?: boolean } | undefined;
  Leaderboard: undefined;
  DynastyHome: undefined;
  PackOpening: undefined;
  HallOfFame: undefined;
};
