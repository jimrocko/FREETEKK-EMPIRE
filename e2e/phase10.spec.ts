import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loadGame, newGame, openRoute, trackErrors } from './helpers';

test('title screen looks like a game and starts one', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?debug');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug');
  await expect(page.locator('.title-logo')).toContainText('TEKK');
  await expect(page.locator('.title-tagline')).toBeVisible();
  await expect(page.getByTestId('start-name')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await newGame(page, 'Acid Anne');
  await expect(page.getByTestId('hq-hero')).toContainText('Acid Anne');
  await expect(page.getByTestId('action-tiles')).toBeVisible();
  expect(errors).toEqual([]);
});

test('HUD, money pop-ups, celebrations, center button and sound setting', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await loadGame(page, (s) => {
    s.happenings.nextRollAt = s.clock.now + 1e9;
    s.progression.points = 5;
    s.progression.pointsTotal = 5;
    s.finance.cash = 1000;
  });
  await expect(page.getByTestId('cash')).toContainText('1.000');

  // An unlock is a big moment: overlay, then it fades away by itself.
  await page.evaluate(() => (location.hash = '/fortschritt/baum'));
  await page.getByTestId('buy-u.lightdesign').click();
  await expect(page.getByTestId('celebration')).toContainText('Lichtdesign');
  await expect(page.getByTestId('celebration')).toHaveCount(0, { timeout: 6000 });

  // Spending money shows a floating delta at the cash pill.
  await page.evaluate(() => (location.hash = '/markt/shop'));
  await page.locator('[data-testid^="buynew-"]').first().click();
  await expect(page.locator('.hud-delta--down')).toBeVisible();

  // The big round button in the bottom bar opens the events.
  if (isMobile) {
    await page.getByTestId('nav-/events').click();
    await expect(page.getByTestId('screen-events')).toBeVisible();
  }

  // Sound can be switched off and stays off after a reload.
  await openRoute(page, '/einstellungen', !!isMobile);
  await expect(page.getByTestId('sound-toggle')).toContainText('Sound an');
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toContainText('Sound aus');
  await page.reload();
  await page.evaluate(() => (location.hash = '/einstellungen'));
  await expect(page.getByTestId('sound-toggle')).toContainText('Sound aus');

  for (const path of ['/', '/karte', '/events', '/fortschritt']) {
    await page.evaluate((p) => (location.hash = p), path);
    await expectNoHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});
