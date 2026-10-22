import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, newGame, openRoute, skipTime, trackErrors } from './helpers';

test('explore a district, find places and check a spot', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openRoute(page, '/karte', !!isMobile);
  await expect(page.getByTestId('city-map')).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Ostend is selected by default and partly known.
  await expect(page.getByTestId('district-panel')).toContainText('Ostend');
  // Finds are random – explore until the basement spot shows up (it is the easiest find in Ostend).
  for (let i = 0; i < 14; i++) {
    await openRoute(page, '/karte', !!isMobile);
    if (await page.getByTestId('district-panel').getByText('Gemeinschaftskeller Block 9').count()) break;
    await page.getByTestId('explore').click();
    await skipTime(page, 6 * 60_000);
  }
  await openRoute(page, '/karte', !!isMobile);
  await expect(page.getByTestId('district-panel')).not.toContainText('20 % erkundet');

  // The basement spot in Ostend is found early.
  await page.getByRole('tab', { name: /Spots/ }).click();
  const spotCard = page.getByTestId('spot-spot.keller-block9');
  await expect(spotCard).toBeVisible();
  await spotCard.click();
  await expect(page.getByTestId('spot-detail')).toContainText('Schätzungen');
  await page.getByTestId('check-spot').click();
  await skipTime(page, 10 * 60_000);
  await page.evaluate(() => (location.hash = '/karte/spot/spot.keller-block9'));
  await expect(page.getByTestId('spot-detail')).toContainText('60 Leute');

  // Places: visit the Späti.
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Orte/ }).click();
  await page.getByTestId('place-poi.spaeti').click();
  await page.getByTestId('visit-poi').click();
  await expect(page.getByTestId('poi-detail')).toBeVisible();
  expect(errors).toEqual([]);
});

test('locked districts explain why', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => (location.hash = '/karte'));
  await page.getByTestId('district-steinhafen.stadtwald').click({ force: true });
  await expect(page.getByTestId('district-panel')).toContainText('Stadtwald');
  await expect(page.getByTestId('explore')).toBeDisabled();
  await expect(page.getByTestId('district-panel')).toContainText('Fahrrad');
  expect(errors).toEqual([]);
});
