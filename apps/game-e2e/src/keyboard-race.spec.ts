import { expect, test } from '@playwright/test';

// 키보드 모드로 시작부터 결과 화면까지 (기획 10.7).
// 사람이 운전할 수 없으니 디버그 빌드의 자동 주행(?debug=autopilot)으로 1랩(?laps=1)을 돈다.
test('키보드 모드로 1랩을 완주하면 결과 화면이 나온다', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?debug=autopilot&laps=1');
  await page.getByRole('button', { name: '키보드로 플레이' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 하기' })).toBeVisible({ timeout: 150_000 });
  await expect(page.getByText('완주!')).toBeVisible();
  await expect(page.getByText('키보드 기록')).toBeVisible();
});
