import { test, expect } from '@playwright/test';

test('day 2 Condor call-sign gate', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('body');
  await expect(page.locator('.title-menu__title')).toBeVisible();
  await page.locator('.title-menu__btn--primary').first().click();
  await page.locator('.intro-overlay__skip').click();
  await expect(page.locator('#current-frequency')).toBeVisible({ timeout: 5000 });

  await page.evaluate(() => {
    const game = window.game!;
    game.state.currentDay = 2;
    game.campaign.loadDay(2);
    game.narrative.loadDay(2);
    game.state.addKnownCode('SIERRA');
    if (!game.state.radioOn) {
      game.tunePower(1);
    }
    for (let i = 0; i < 48; i++) {
      if (game.state.currentFrequency === 96.4) {
        break;
      }
      game.tune(1);
    }
  });

  await expect(page.locator('.transmission-info')).toContainText('AUTHENTICATE');
  await page.getByRole('button', { name: 'SIERRA' }).click();
  await expect(page.locator('.transmission-info .acp-slip')).toContainText('LOW ON WATER');
  await page.getByRole('button', { name: 'Log the cry — wait for a cleaner window' }).click();
  await expect(
    page.locator('.log-entry.response', { hasText: 'Reply: Log the cry' })
  ).toBeVisible();
});
