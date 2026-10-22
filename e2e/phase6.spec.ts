import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, newGame, openRoute, skipTime, trackErrors } from './helpers';

/**
 * Vertical slice: start → money → find a spot → buy drinks → plan an event
 * with a contact as DJ → the night runs → report → progress is saved.
 */
test('vertical slice: from zero to the first party', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await newGame(page);

  // Earn a bit of money with a job.
  await page.getByTestId('quickjob-job.flyer').click();
  await skipTime(page, 4 * 60_000);

  // Find the basement spot in Ostend.
  for (let i = 0; i < 14; i++) {
    await openRoute(page, '/karte', !!isMobile);
    if (await page.getByTestId('district-panel').getByText('Gemeinschaftskeller Block 9').count()) break;
    await page.getByTestId('explore').click();
    await skipTime(page, 6 * 60_000);
  }
  await expect(page.getByTestId('district-panel')).toContainText('Gemeinschaftskeller Block 9');

  // Buy drinks.
  await openRoute(page, '/events', !!isMobile);
  await page.getByRole('tab', { name: /Versorgung/ }).click();
  await page.getByTestId('buy-sup.discounter-item.goods-beer-1').click();
  await page.getByTestId('buy-sup.discounter-item.goods-water-1').click();

  // Plan the party.
  await page.getByRole('tab', { name: /Planen/ }).click();
  await expect(page.getByTestId('forecast')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByTestId('lineup-p.jule').click();
  await page.getByTestId('pa-pa.small').click();
  await page.getByTestId('event-name').fill('Kellerrave #1');
  await page.getByTestId('plan-event').click();
  await expect(page.getByTestId('screen-events')).toContainText('Kellerrave #1');

  // Prepare: confirm the line-up.
  const card = page.locator('[data-testid^="event-e"]').first();
  if (await card.getByTestId('task-task.lineup').count()) await card.getByTestId('task-task.lineup').click();

  // Let the night happen (up to 7 game days ahead + 12 h party).
  await skipTime(page, 7 * 24 * 60_000);
  await openRoute(page, '/events', !!isMobile);
  await page.getByRole('tab', { name: /Berichte/ }).click();
  const report = page.locator('[data-testid^="report-e"]').first();
  await expect(report).toContainText('Kellerrave #1');
  await report.click();
  await expect(page.getByTestId('event-report')).toContainText('Besucher');
  await expect(page.getByTestId('event-report')).toContainText('Reputation');

  // Saved: reload keeps the report.
  await page.reload();
  await page.evaluate(() => (location.hash = '/events'));
  await page.getByRole('tab', { name: /Berichte/ }).click();
  await expect(page.locator('[data-testid^="report-e"]').first()).toContainText('Kellerrave #1');
  expect(errors).toEqual([]);
});
