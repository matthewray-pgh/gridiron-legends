import { test, expect } from '@playwright/test';

test('can navigate to Dynasty and back to Home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Classic', { exact: true })).toBeVisible({ timeout: 45_000 });

  await page.getByRole('button', { name: 'Dynasty', exact: true }).click();
  await expect(page.getByText('DYNASTY', { exact: true })).toBeVisible();

  await page.getByRole('img', { name: 'Undefeated Gridiron Legends' }).click();
  // react-navigation's native-stack keeps prior screens mounted (hidden) on
  // web, so a plain getByText('Classic') matches both the live Home screen
  // and a stale, zero-size leftover from before the Dynasty navigation.
  // `:visible` filters that stale match out.
  await expect(page.locator(':text-is("Classic"):visible')).toBeVisible();
});
