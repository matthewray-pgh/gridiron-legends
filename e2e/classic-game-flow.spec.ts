import { test, expect } from '@playwright/test';
import { completeDraft } from './helpers';

test('Classic mode: draft a full roster, simulate the season, and return home', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('/');
  await expect(page.getByText('Classic', { exact: true })).toBeVisible({ timeout: 45_000 });

  await page.getByText('Classic', { exact: true }).click();
  await expect(page.getByText('GAME SETUP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start Game' }).click();

  await completeDraft(page);

  await expect(page.getByText('FINAL RECORD', { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.getByText('←', { exact: true }).click();
  await expect(page.locator(':text-is("Classic"):visible')).toBeVisible();
});
