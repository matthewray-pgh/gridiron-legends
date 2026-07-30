import { test, expect } from '@playwright/test';
import { completeDraft, openFirstAvailablePack, goToFreshDynastyHome } from './helpers';

test('Shop: purchase a pack with Rings and open it', async ({ page }) => {
  test.setTimeout(180_000);

  await goToFreshDynastyHome(page);

  // Dynasty's one-time initial draft — Shop is gated behind currentSeason > 1.
  await page.getByText('Draft Team', { exact: true }).click();
  await expect(page.getByText('GAME SETUP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start Game' }).click();

  await completeDraft(page);

  // ResultScreen's reveal-complete effect commits completeInitialDraft()
  // (season -> 2, 2 free packs) the instant "FINAL RECORD" appears, with no
  // button tap required — resetting straight to Home here (rather than
  // tapping "ENTER DYNASTY →") avoids the stale-DynastyHome-instance
  // duplication that replace() navigation causes (see helpers.ts).
  await expect(page.getByText('FINAL RECORD', { exact: true })).toBeVisible({ timeout: 30_000 });
  await goToFreshDynastyHome(page);

  // Fresh Dynasty save has 0 Rings; __DEV__-only grant (present because the
  // Playwright webServer runs `expo start --web`, a dev bundle) unblocks
  // affording a pack without grinding Daily Challenge/ad-watch currency.
  await page.getByText('DEV +500', { exact: true }).click();

  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByTestId('buy-pack-rookie').click();

  await openFirstAvailablePack(page);

  // PackOpeningScreen replaces itself with a *new* Shop mount on close,
  // leaving the original Shop instance stale-but-mounted underneath (same
  // react-navigation quirk documented in helpers.ts) — :visible picks out
  // the live one.
  await expect(page.locator(':text-is("BUY A PACK"):visible')).toBeVisible();
});
