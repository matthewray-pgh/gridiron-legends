import { test, expect } from '@playwright/test';

test('Home screen renders the mode cards', async ({ page }) => {
  await page.goto('/');

  // First load pays for Metro's initial bundle compile, which can be slow.
  await expect(page.getByText('Classic', { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Offense Only', { exact: true })).toBeVisible();
  await expect(page.getByText('Two-Minute Drill', { exact: true })).toBeVisible();
});
