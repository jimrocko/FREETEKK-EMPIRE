import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, newGame, openRoute, skipTime, trackErrors } from './helpers';

test('contacts, profile, writing and meeting up', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openRoute(page, '/netzwerk', !!isMobile);
  await expect(page.getByTestId('screen-network')).toBeVisible();
  await expect(page.getByTestId('contact-p.miro')).toBeVisible();
  await expect(page.getByTestId('contact-p.jule')).toBeVisible();
  await expect(page.getByTestId('contact-p.kemal')).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByTestId('contact-p.miro').click();
  await expect(page.getByTestId('person-detail')).toContainText('Miro');
  await page.getByTestId('write').click();
  await expect(page.getByTestId('write')).toBeDisabled();
  await page.getByTestId('meetup').click();
  await expect(page.getByTestId('meetup')).toBeDisabled();

  await skipTime(page, 10 * 60_000);
  await page.evaluate(() => (location.hash = '/netzwerk/person/p.miro'));
  await expect(page.getByTestId('person-detail')).toContainText('1 Treffen');
  await expect(page.getByTestId('person-detail')).toContainText('Zuverlässigkeit');

  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Netz$/ }).click();
  await expect(page.getByTestId('network-graph')).toBeVisible();
  await expect(page.getByTestId('node-p.miro')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a message with a decision can be answered', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openRoute(page, '/einstellungen', !!isMobile);
  await page.getByTestId('debug-message').click();
  await page.waitForTimeout(1500);
  await openRoute(page, '/netzwerk', !!isMobile);
  await page.getByRole('tab', { name: /Nachrichten/ }).click();
  const thread = page.locator('[data-testid^="thread-"]').first();
  await expect(thread).toBeVisible();
  await thread.click();
  await expect(page.getByTestId('chat')).toBeVisible();

  const choices = page.getByTestId('choices');
  if (await choices.count()) {
    const enabled = choices.locator('button:not([disabled])').first();
    const label = (await enabled.textContent())!.trim();
    await enabled.click();
    await expect(page.getByTestId('chat').locator('.bubble--mine').last()).toContainText(label);
  }
  expect(errors).toEqual([]);
});
