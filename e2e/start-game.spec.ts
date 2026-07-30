import { test, expect } from '@playwright/test';

test('starting a Classic game opens the setup modal and lands on the Spin screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Classic', { exact: true })).toBeVisible({ timeout: 45_000 });

  await page.getByText('Classic', { exact: true }).click();
  await expect(page.getByText('GAME SETUP', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByText('GAME SETUP', { exact: true })).toBeHidden();
  await expect(page.getByText(/ROUND 1\//)).toBeVisible();
});
