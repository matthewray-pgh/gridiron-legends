import { test, expect } from '@playwright/test';
import { completeDraft, openFirstAvailablePack, goToFreshDynastyHome, ensureBenchPlayer } from './helpers';

test('Dynasty: draft, edit roster between seasons, and run season 2', async ({ page }) => {
  test.setTimeout(240_000);

  // Season 1 — the one-time initial draft.
  await goToFreshDynastyHome(page);
  await page.getByText('Draft Team', { exact: true }).click();
  await expect(page.getByText('GAME SETUP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start Game' }).click();

  await completeDraft(page);

  // Auto-committed the instant the reveal finishes (no button tap needed) —
  // season is now 2 with 2 free draft-bonus packs waiting. Resetting to a
  // fresh Home/DynastyHome here (rather than tapping "ENTER DYNASTY →")
  // sidesteps react-navigation's stale-hidden-screen duplication; Dynasty
  // state itself survives the reload via AsyncStorage (see helpers.ts).
  await expect(page.getByText('FINAL RECORD', { exact: true })).toBeVisible({ timeout: 30_000 });
  await goToFreshDynastyHome(page);

  // Open packs (starting with the 2 free draft-bonus ones, buying more with
  // the __DEV__ Rings grant if every card so far landed on a player already
  // owned) until there's a bench player to work with for the roster edit
  // below.
  await ensureBenchPlayer(page);

  // Roster edit between seasons — select a bench player and take the first
  // available action (a swap/start; "Retire" is always appended last, so
  // .first() naturally avoids it), then commit via the staged-edit save bar.
  await page.getByTestId('roster-bench-row').first().click();
  await page.getByTestId('roster-action-btn').first().click();
  await page.getByText('Save Changes', { exact: true }).click();

  // Season 2 — no re-draft, just simulate and take the reward.
  await page.getByText(/Start season 2/).click();
  await expect(page.getByText('FINAL RECORD', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByText('ROOKIE PACK', { exact: true }).click();

  // Open the season-2 reward pack.
  await goToFreshDynastyHome(page);
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await openFirstAvailablePack(page);

  await goToFreshDynastyHome(page);
  await expect(page.getByText(/Start season 3/)).toBeVisible();
});
