import { test, expect } from '@playwright/test';

test('day 1 switchboard smoke', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('body');

  await expect(page.locator('.title-menu__title')).toBeVisible();
  await page.locator('.title-menu__btn--primary').first().click();
  await page.locator('.intro-overlay__skip').click();

  await expect(page.locator('#current-frequency')).toBeVisible({ timeout: 5000 });

  await page.evaluate(async () => {
    const game = window.game!;
    if (!game.state.radioOn) {
      game.tunePower(1);
    }
    for (let i = 0; i < 48; i++) {
      game.tune(1);
      if (game.state.currentFrequency === 93.2) break;
    }
  });

  await expect(page.locator('.transmission-info')).toBeVisible({ timeout: 5000 });
  await page.locator('.choice-button').first().click();
  await expect(page.locator('.log-entry.response')).toHaveCount(1);
});
