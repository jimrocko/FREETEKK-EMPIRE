import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loadGame, openRoute, trackErrors } from './helpers';

test('progression: unlock tree, open-air, travel, a project and the legacy', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await loadGame(page, (s) => {
    s.finance.cash = 50000;
    s.progression.points = 20;
    s.progression.reputation = 2000;
    for (const k of ['produktion', 'technik', 'organisation', 'netzwerk', 'business'] as const) s.progression.skills[k] = 3000;
    s.happenings.nextRollAt = s.clock.now + 1e9;
    for (const id of ['spot.baggersee', 'spot.keller-block9']) {
      const st = s.spots.spots[id];
      st.known = true;
      st.intel = 100;
      st.lastCheckedAt = s.clock.now;
    }
    s.people.people['p.jule'].met = true;
    s.people.people['p.jule'].trust = 40;
  });

  // Unlock tree.
  await openRoute(page, '/fortschritt', !!isMobile);
  await page.getByRole('tab', { name: /Freischaltungen/ }).click();
  await expect(page.getByTestId('scene-points')).toContainText('Szenepunkte');
  await page.getByTestId('buy-u.openair').click();
  await expect(page.getByTestId('unlock-u.openair')).toContainText('Frei');
  await page.getByTestId('buy-u.city-bergheim').click();
  await page.getByTestId('buy-u.location').click();
  await expect(page.getByTestId('buy-u.festival')).toBeDisabled();
  await expectNoHorizontalScroll(page);

  // The new format shows up in the planner.
  await openRoute(page, '/events', !!isMobile);
  await page.getByTestId('plan-spot').selectOption('spot.baggersee');
  await page.getByTestId('format-openair').click();
  await expect(page.getByTestId('duration-16')).toBeVisible();
  await expect(page.getByTestId('forecast')).toBeVisible();

  // A project runs in the background.
  await page.evaluate(() => (location.hash = '/fortschritt/projekte'));
  await page.getByTestId('stage-proj.location').click();
  await expect(page.getByTestId('project-proj.location')).toContainText('läuft auch');
  await expectNoHorizontalScroll(page);

  // Travel to Bergheim.
  await openRoute(page, '/karte', !!isMobile);
  await page.getByTestId('travel-city.bergheim').click();
  await page.evaluate(() => localStorage.setItem('tekklife.debug.offset', String(Number(localStorage.getItem('tekklife.debug.offset') ?? 0) + 16 * 60_000)));
  await page.reload();
  const cont = page.getByTestId('offline-continue');
  if (await cont.isVisible().catch(() => false)) await cont.click();
  await page.evaluate(() => (location.hash = '/karte'));
  await expect(page.getByTestId('screen-map')).toContainText('Bergheim');
  await expectNoHorizontalScroll(page);

  // Legacy: not yet (needs 10.000 reputation), perks explain themselves.
  await page.evaluate(() => (location.hash = '/fortschritt/vermaechtnis'));
  await expect(page.getByTestId('legacy-retire')).toContainText('10.000');
  await expect(page.getByTestId('perk-leg.money')).toBeDisabled();
  expect(errors).toEqual([]);
});
