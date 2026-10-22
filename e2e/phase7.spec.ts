import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, loadGame, openRoute, skipTime, trackErrors } from './helpers';
import { addItem } from '../src/game/systems/inventory/logic';
import { meetPerson } from '../src/game/systems/people/logic';

test('bank, loan, merch from design to stock, trade with a contact', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  const errors = trackErrors(page);
  await loadGame(page, (s) => {
    s.finance.cash = 3000;
    s.progression.reputation = 200;
    s.crew.founded = true;
    s.crew.name = 'Rabbit Sound';
    meetPerson(s, 'p.lena', 'test', { trust: 30, silent: true });
    meetPerson(s, 'p.lukas', 'test', { trust: 30, silent: true });
    addItem(s, 'item.tr-66', { condition: 80 });
  });

  // Bank account and a small loan.
  await openRoute(page, '/finanzen', !!isMobile);
  await page.getByTestId('bank-amount').fill('1000');
  await page.getByTestId('bank-deposit').click();
  await expect(page.getByTestId('bank')).toContainText('1.000');
  await page.getByTestId('loan-loan.small').click();
  await expect(page.getByTestId('loans')).toContainText('noch 2.300');
  await expect(page.getByTestId('loan-loan.medium')).toBeDisabled();
  await expectNoHorizontalScroll(page);

  // Merch: a design by Lena, then a print run.
  await openRoute(page, '/merch', !!isMobile);
  await expect(page.getByTestId('screen-merch')).toBeVisible();
  await page.getByRole('tab', { name: /Designs/ }).click();
  await expect(page.getByTestId('design-p.lena')).toBeDisabled();
  await page.getByTestId('design-name').fill('Hafenhase');
  await page.getByTestId('design-p.lena').click();
  await expect(page.getByTestId('screen-merch')).toContainText('Hafenhase');

  await page.getByRole('tab', { name: /Produktion/ }).click();
  await page.getByTestId('prod-merch.shirt').click();
  await page.getByTestId('order-qty').fill('20');
  await page.getByTestId('order-merch').click();
  await expect(page.getByTestId('merch-order')).toContainText('20× T-Shirt');
  await expectNoHorizontalScroll(page);

  await skipTime(page, 31 * 60_000);
  await openRoute(page, '/merch', !!isMobile);
  await expect(page.locator('[data-testid^="stock-"]').first()).toContainText('×20');
  await page.getByTestId('price-merch.shirt').fill('25');
  await expect(page.getByTestId('price-merch.shirt')).toHaveValue('25');
  await expect(page.getByTestId('open-shop')).toBeDisabled();

  // Trade: Lukas pays more than the dealer.
  await openRoute(page, '/inventar', !!isMobile);
  await page.getByTestId('item-item.tr-66').click();
  await expect(page.getByTestId('sell-contact-p.lukas')).toBeEnabled();
  await page.getByTestId('sell-contact-p.lukas').click();
  await expect(page.getByTestId('item-item.tr-66')).toHaveCount(0);

  // Everything survives a reload.
  await page.reload();
  await page.evaluate(() => (location.hash = '/merch'));
  await expect(page.locator('[data-testid^="stock-"]').first()).toContainText('×20');
  expect(errors).toEqual([]);
});
