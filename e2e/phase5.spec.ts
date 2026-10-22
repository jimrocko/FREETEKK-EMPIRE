import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, newGame, openRoute, trackErrors } from './helpers';

test('build a sound system, rent a van, see the crew founding requirements', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openRoute(page, '/einstellungen', !!isMobile);
  await page.getByTestId('debug-money').click();

  await page.evaluate(() => (location.hash = '/markt/shop'));
  await page.getByTestId('buynew-item.pa-active-12').first().click();
  await page.getByTestId('buynew-item.sub-active-15').first().click();
  await page.getByTestId('buynew-item.cables').first().click();
  await page.getByTestId('buynew-item.dj-mixer-2ch').first().click();

  await openRoute(page, '/crew', !!isMobile);
  await expect(page.getByTestId('found-crew')).toContainText('Newcomer');
  await expect(page.getByTestId('found')).toBeDisabled();

  await page.getByRole('tab', { name: /Soundsysteme/ }).click();
  await page.getByTestId('system-name').fill('Rabbit System');
  await page.getByTestId('create-system').click();
  const card = page.locator('[data-testid^="system-sys"]').first();
  await expect(card).toBeVisible();
  await card.locator('[data-testid^="add-parts-"]').click();
  // The list stays open while adding.
  for (const id of ['item.pa-active-12', 'item.sub-active-15', 'item.cables', 'item.dj-mixer-2ch']) {
    await card.getByTestId(`add-${id}`).click();
    await expect(card.getByTestId(`add-${id}`)).toHaveCount(0);
  }
  await expect(card).toContainText('Reichweite');
  await expect(card).not.toContainText('0 Leute');
  await expectNoHorizontalScroll(page);

  await page.getByRole('tab', { name: /Fahrzeuge/ }).click();
  await page.getByTestId('rent-rent.sprinter').click();
  await expect(page.getByTestId('vehicle-item.van-sprinter')).toContainText('Miete');
  expect(errors).toEqual([]);
});
