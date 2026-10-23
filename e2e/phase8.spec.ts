import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loadGame, openRoute, trackErrors } from './helpers';
import { fireHappening, happeningDef } from '../src/game/systems/happenings/logic';

test('scene: rival crews, their parties, a visit and random events', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  const errors = trackErrors(page);
  await loadGame(page, (s) => {
    s.finance.cash = 2000;
    s.progression.reputation = 150;
    s.happenings.nextRollAt = s.clock.now + 1e9;
    // A party of the Acid Kollektiv is running right now.
    s.rivals.events.push({ id: 'r900', crewId: 'rival.acidkollektiv', spotId: 'spot.garagenhof', startsAt: s.clock.now - 60_000, durationH: 8, status: 'scheduled' });
    fireHappening(s, happeningDef('h.wallet'), {});
  });

  // A decision waits on the dashboard.
  await expect(page.getByTestId('happening-h.wallet')).toBeVisible();
  await page.getByTestId('happening-h.wallet').getByTestId('answer-return').click();
  await expect(page.getByTestId('happening-h.wallet')).toHaveCount(0);

  // The scene: crews and their parties.
  await openRoute(page, '/szene', !!isMobile);
  await expect(page.getByTestId('screen-scene')).toBeVisible();
  await expect(page.getByTestId('crew-rival.bunkerkinder')).toBeVisible();
  await expect(page.getByTestId('crew-rival.hafenlaerm')).toBeVisible();
  await expect(page.getByTestId('rival-event-r900')).toContainText('Läuft gerade');
  await expectNoHorizontalScroll(page);
  await page.getByTestId('visit-r900').click();
  await expect(page.getByTestId('visit-r900')).toBeDisabled();

  // Crew detail with actions that explain why they are locked.
  await page.getByTestId('crew-rival.bunkerkinder').click();
  await expect(page.getByTestId('crew-detail')).toContainText('Bunkerkinder');
  await expect(page.getByTestId('propose-coop')).toBeDisabled();
  await expect(page.getByTestId('crew-actions')).toContainText('machen nichts gemeinsam');
  await expectNoHorizontalScroll(page);

  // Back from the party after a while (and the scene moved on meanwhile).
  await page.evaluate(() => localStorage.setItem('tekklife.debug.offset', String(Number(localStorage.getItem('tekklife.debug.offset') ?? 0) + 3 * 24 * 60_000)));
  await page.reload();
  await expect(page.getByTestId('offline-scene')).toBeVisible();
  await page.getByTestId('offline-continue').click();
  await page.evaluate(() => (location.hash = '/szene/crew/rival.acidkollektiv'));
  // The visit made you known to their leader.
  await expect(page.getByTestId('crew-detail')).toContainText('Jonte');

  // Past decisions show up in the news.
  await openRoute(page, '/neuigkeiten', !!isMobile);
  await expect(page.getByTestId('happening-log')).toContainText('Portemonnaie');
  expect(errors).toEqual([]);
});
