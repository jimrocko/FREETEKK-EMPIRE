import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loadGame, openRoute, trackErrors } from './helpers';

test('lifestyle: buy fun things, use them, go on a trip, move house', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await loadGame(page, (s) => {
    s.happenings.nextRollAt = s.clock.now + 1e9;
    s.finance.cash = 5000;
  });

  await page.getByTestId('tile-lifestyle').click();
  await expect(page.getByTestId('screen-lifestyle')).toBeVisible();
  await expect(page.getByTestId('style-card')).toContainText('Abgerockt');
  await expectNoHorizontalScroll(page);

  // Buy a hat and a dog.
  await page.getByTestId('buy-fun.buckethat').click();
  await expect(page.getByTestId('cash')).toContainText('4.975');
  await expect(page.getByTestId('loot-fun.buckethat')).toContainText('Deins');
  await page.getByTestId('lifestyle-cat-tiere').click();
  await page.getByTestId('buy-fun.dog').click();
  await expect(page.getByTestId('loot-fun.dog')).toContainText('Deins');

  // Walk the dog – then it needs a break.
  await page.getByRole('tab', { name: /Meine Sachen/ }).click();
  await page.getByTestId('use-fun.dog').click();
  await expect(page.getByTestId('use-fun.dog')).toBeDisabled();
  await expect(page.getByTestId('owned-fun.dog')).toContainText('Wieder möglich');

  // A night at the movies runs in the background.
  await page.getByRole('tab', { name: /Shop/ }).click();
  await page.getByTestId('lifestyle-cat-erlebnisse').click();
  await page.getByTestId('buy-fun.cinema').click();
  await expect(page.getByTestId('style-card')).toContainText('Unterwegs: Kinoabend');

  // Move out of the shared flat.
  await page.getByRole('tab', { name: /Wohnen/ }).click();
  await page.getByTestId('move-home.einzimmer').click();
  await expect(page.getByTestId('home-home.einzimmer')).toContainText('Hier wohnst du');
  await expectNoHorizontalScroll(page);

  // The menu lists the new screen.
  await openRoute(page, '/lifestyle', !!isMobile);
  await expect(page.getByTestId('screen-lifestyle')).toBeVisible();
  expect(errors).toEqual([]);
});

test('hack menu: secret door, buttons, typed commands, time jump', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await loadGame(page, (s) => {
    s.happenings.nextRollAt = s.clock.now + 1e9;
  });

  // Five quick taps on the emblem open the terminal.
  for (let i = 0; i < 5; i++) await page.getByTestId('hud-emblem').click();
  const menu = page.getByTestId('hack-menu');
  await expect(menu).toBeVisible();
  await expect(page.getByTestId('hack-log')).toContainText('ACCESS GRANTED');
  await expectNoHorizontalScroll(page);

  await page.getByTestId('hack-geld-10k').click();
  await expect(page.getByTestId('hack-log')).toContainText('10.000 € überwiesen');
  await expect(menu).toContainText('KONTO 10.500');

  await page.getByTestId('hack-input').fill('rep 500');
  await page.getByTestId('hack-input').press('Enter');
  await expect(page.getByTestId('hack-log')).toContainText('+500 Reputation');

  await page.getByTestId('hack-input').fill('fliegen');
  await page.getByTestId('hack-input').press('Enter');
  await expect(page.locator('.hack__line--err')).toContainText('Unbekannter Befehl');

  await page.getByTestId('hack-input').fill('help');
  await page.getByTestId('hack-input').press('Enter');
  await expect(page.getByTestId('hack-log')).toContainText('zeit [8h|2d|1w]');

  await page.getByTestId('hack-close').click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByTestId('cash')).toContainText('10.500');

  // From the settings: a day jumps by, the offline report takes over.
  await openRoute(page, '/einstellungen', !!isMobile);
  await page.getByTestId('open-hack').click();
  await page.getByTestId('hack-zeit-1d').click();
  await expect(page.getByTestId('offline-report')).toBeVisible();
  await expect(menu).toHaveCount(0);
  await page.getByTestId('offline-continue').click();

  // Cheats survive a reload.
  await page.reload();
  await expect(page.getByTestId('cash')).toContainText('10.');
  expect(errors).toEqual([]);
});
