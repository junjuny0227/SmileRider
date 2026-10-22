import { test, expect } from '@playwright/test';

test('게임 이름을 보여 준다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('WinkRider');
});
