import { test, expect } from '@playwright/test';

async function startWatch(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('body');

  await expect(page.locator('.title-menu__title')).toBeVisible();
  await page.locator('.title-menu__btn--primary').first().click();
  await page.locator('.intro-overlay__skip').click();
  await expect(page.locator('#current-frequency')).toBeVisible({ timeout: 5000 });
}

async function tuneTo(page: import('@playwright/test').Page, mhz: number): Promise<void> {
  await page.evaluate((target) => {
    const game = window.game!;
    if (!game.state.radioOn) {
      game.tunePower(1);
    }
    for (let i = 0; i < 48; i++) {
      if (game.state.currentFrequency === target) {
        break;
      }
      game.tune(1);
    }
  }, mhz);
}

test('day 1 switchboard smoke', async ({ page }) => {
  await startWatch(page);
  await tuneTo(page, 93.2);

  await expect(page.locator('.transmission-info')).toBeVisible({ timeout: 5000 });
  await page.locator('.choice-button').first().click();
  await expect(page.locator('.log-entry.response', { hasText: 'Reply:' })).toBeVisible();
});

test('day 1 HQ slip, clue page, and decode book', async ({ page }) => {
  await startWatch(page);

  await tuneTo(page, 98.8);
  await expect(page.locator('.transmission-info .acp-slip')).toContainText('MANAUS HQ');
  await page.getByRole('button', { name: 'Confirm on station' }).click();
  await expect(page.locator('.log-entry.clue', { hasText: 'Search the Negro mouth' })).toBeVisible();

  await page.getByRole('button', { name: 'Clues' }).click();
  await expect(page.locator('.clue-card-title', { hasText: 'Search the Negro mouth' })).toBeVisible();
  await page.getByRole('button', { name: 'Field Notes' }).click();

  await tuneTo(page, 93.2);
  await page.getByRole('button', { name: 'Log only — do not relay' }).click();

  await tuneTo(page, 91.0);
  await expect(page.locator('.transmission-info .acp-slip')).toContainText('CIPHER');
  await page.locator('.choice-button', { hasText: 'Open decode book' }).click();
  await expect(page.locator('#decode-overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('.decode-pager-label')).toHaveText('Night 1 of 15');
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.locator('.decode-pager-label')).toHaveText('Night 2 of 15');
  await page.getByRole('button', { name: 'Prev' }).click();
  await page.locator('.decode-try-btn').click();
  await expect(page.locator('.transmission-info .acp-slip')).toContainText('SEARCH THE NEGRO');
  await page.getByRole('button', { name: 'Keep the decode in the book only' }).click();
  await expect(
    page.locator('.log-entry.response', { hasText: 'Reply: Keep the decode in the book only' })
  ).toBeVisible();
});
