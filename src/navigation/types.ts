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
  Shop: undefined;
  // Buying happens in Shop; PackOpening is reached from there with the id
  // of the specific pack instance that was tapped in "My Packs" (packs are
  // tracked individually since an era lock makes two packs of the same tier
  // not interchangeable — see store/dynastyStore.ts OwnedPack).
  PackOpening: { packId: string };
  HallOfFame: undefined;
};
