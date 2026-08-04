import { Page, expect } from '@playwright/test';
import { PACK_CARD_COUNT } from '../src/data/packs';

// react-navigation's native-stack keeps every previously-visited screen
// mounted (hidden) on web rather than unmounting it — a screen type visited
// at two different stack depths in the same page load (e.g. DynastyHome via
// an initial `navigate` and later a `replace` from Result) ends up with two
// simultaneous live instances of its static text/testIDs, which trips
// Playwright's strict-mode duplicate-match check. Since Dynasty progress is
// persisted to AsyncStorage (dynastyStore.ts), a hard reload cleanly
// collapses the stack back to just Home with no stale hidden screens, while
// keeping all game state intact — simpler and more robust than tracking
// exact stack depth or filtering every locator down to `:visible`.
export async function resetToHome(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Classic', { exact: true })).toBeVisible({ timeout: 45_000 });
}

export async function goToFreshDynastyHome(page: Page) {
  await resetToHome(page);
  await page.getByRole('button', { name: 'Dynasty', exact: true }).click();
}

// Shared by Classic and Dynasty — both drive the exact same Spin -> Game
// loop (SpinScreen.tsx / GameScreen.tsx), the only difference being how
// many rounds positionsForMode(mode) returns (12 for every mode except
// 'offense').
export async function completeDraft(page: Page, rounds = 12) {
  for (let i = 0; i < rounds; i++) {
    await page.getByText(/SPIN/).click();

    const letsGo = page.getByText(/LET.?S GO/);
    await expect(letsGo).toBeVisible({ timeout: 5_000 });
    await letsGo.click();

    await page.getByTestId('draft-candidate-row').first().click();
    await page.getByTestId('quick-assign-btn').first().click();
  }
}

// Shared by the Shop and Dynasty flows — both land on PackOpeningScreen the
// same way (tapping a waiting pack's "OPEN" tile) and go through the same
// tap-to-open / tap-to-reveal-each-card / keep-or-trophy-all sequence.
export async function openFirstAvailablePack(page: Page) {
  await page.getByText('OPEN', { exact: true }).first().click();

  const tapToOpen = page.getByText('TAP TO OPEN', { exact: true });
  await expect(tapToOpen).toBeVisible({ timeout: 10_000 });
  await tapToOpen.click();

  // "TAP TO REVEAL" is the card's back face — it never actually leaves the
  // DOM between cards (PackRevealSequence.tsx flips it via a 3D rotateY
  // transform + backfaceVisibility, which Playwright's plain visibility
  // check doesn't account for), so waiting on that text alone doesn't
  // detect real progress and re-clicking it instantly no-ops while a card
  // is mid-flip (`flipped` state briefly disables its pointer events). The
  // "TAP CARD TO REVEAL · N OF <count>" hint next to it does update per
  // card and disappears while flipped, so wait on that for genuine
  // advancement. Card count comes from the app's own PACK_CARD_COUNT
  // rather than a hardcoded number so this doesn't silently drift out of
  // sync again next time that constant changes.
  const tapToReveal = page.getByText('TAP TO REVEAL', { exact: true });
  for (let cardNum = 1; cardNum <= PACK_CARD_COUNT; cardNum++) {
    await expect(page.getByText(`TAP CARD TO REVEAL · ${cardNum} OF ${PACK_CARD_COUNT}`, { exact: true })).toBeVisible({ timeout: 5_000 });
    await tapToReveal.click();
  }

  // The grid only mounts once the last card's rarity-scaled hold timer
  // (up to 2000ms) elapses and PackOpeningScreen's `pulls` state is set —
  // wait for it explicitly instead of checking `pack-pull-card` immediately,
  // which would always read 0 and wrongly fall through to Trophy All.
  // "TROPHY ALL +<reward>" always renders once `pulls` is set (cashes in
  // every non-duplicate pull for Rings instead of rostering any of them),
  // making it a reliable "the grid is ready" signal regardless of whether
  // this particular pack has any keepable (non-duplicate) cards.
  const trophyAllBtn = page.getByText(/TROPHY ALL/);
  await expect(trophyAllBtn).toBeVisible({ timeout: 5_000 });

  const keepable = page.getByTestId('pack-pull-card');
  const keepableCount = await keepable.count();
  if (keepableCount > 0) {
    for (let i = 0; i < keepableCount; i++) await keepable.nth(i).click();
    await page.getByText(/Add Selected \(\d+\) to Roster/).click();
  } else {
    await trophyAllBtn.click();
  }
}

// Every card in a pack can land on a player already owned (roster, bench,
// or Hall of Fame — see dynastyStore.ts's isDuplicate), which auto-refunds
// to Rings instead of adding anyone new. Rather than assume any single pack
// yields a keeper, keep opening packs (topping up Rings via the __DEV__-only
// __testGrantRings hook once free ones run out) until the bench actually has
// someone — call this from a fresh DynastyHome mount.
export async function ensureBenchPlayer(page: Page, maxAttempts = 6) {
  for (let i = 0; i < maxAttempts; i++) {
    if ((await page.getByTestId('roster-bench-row').count()) > 0) return;

    await page.evaluate(() => (window as any).__testGrantRings?.(500));

    await page.getByRole('button', { name: 'Shop', exact: true }).click();
    if ((await page.getByText('OPEN', { exact: true }).count()) === 0) {
      await page.getByTestId('buy-pack-rookie').click();
    }
    await openFirstAvailablePack(page);
    await goToFreshDynastyHome(page);
  }
}
