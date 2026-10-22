import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, newGame, openRoute, skipTime, trackErrors } from './helpers';

test('studio unlocks with gear, produces and publishes a track', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);

  // Locked until the player owns an instrument – with an explanation.
  if (isMobile) {
    await page.getByTestId('nav-more').click();
    await expect(page.getByTestId('more-/studio')).toBeDisabled();
    await expect(page.getByTestId('more-/studio')).toContainText('Benötigt');
    await page.keyboard.press('Escape');
  }

  await page.evaluate(() => (location.hash = '/markt/shop'));
  await page.getByTestId('buynew-item.vulka-beats').click();
  await page.getByTestId('buynew-item.td-3').click();

  await openRoute(page, '/studio', !!isMobile);
  await expect(page.getByTestId('screen-studio')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByTestId('genre-genre.acidtek').click();
  await page.getByTestId('track-name').fill('Testpressung');
  await page.getByTestId('produce').click();
  await expect(page.getByTestId('screen-studio')).toContainText('Produktion: Testpressung');

  await skipTime(page, 11 * 60_000);
  await page.evaluate(() => (location.hash = '/studio/tracks'));
  const card = page.locator('[data-testid^="track-t"]').first();
  await expect(card).toContainText('Testpressung');
  await card.locator('[data-testid^="upload-"]').click();
  await expect(card).toContainText('Online');
  expect(errors).toEqual([]);
});
