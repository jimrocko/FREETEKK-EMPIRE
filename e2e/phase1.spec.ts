import { expect, test, type Page } from '@playwright/test';

/** Collects console errors and uncaught exceptions for the whole test. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function newGame(page: Page, name = 'Testi') {
  await page.goto('/?debug');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug');
  await page.getByTestId('start-name').fill(name);
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('screen-dashboard')).toBeVisible();
}

async function expectNoHorizontalScroll(page: Page) {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function openRoute(page: Page, path: string, isMobile: boolean) {
  if (!isMobile) {
    await page.evaluate((p) => (location.hash = p), path);
    return;
  }
  const primary = page.getByTestId(`nav-${path}`);
  if (await primary.count()) {
    await primary.click();
  } else {
    await page.getByTestId('nav-more').click();
    await page.getByTestId(`more-${path}`).click();
  }
}

test('start screen requires a name', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('start-game')).toBeDisabled();
  await page.getByTestId('start-name').fill('A');
  await expect(page.getByTestId('start-game')).toBeDisabled();
  await page.getByTestId('start-name').fill('Acid Anne');
  await expect(page.getByTestId('start-game')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('every screen renders without errors or horizontal scrolling', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  const screens: [string, string][] = [
    ['/', 'screen-dashboard'],
    ['/jobs', 'screen-jobs'],
    ['/markt', 'screen-market'],
    ['/inventar', 'screen-inventory'],
    ['/finanzen', 'screen-finance'],
    ['/fortschritt', 'screen-progress'],
    ['/neuigkeiten', 'screen-feed'],
    ['/einstellungen', 'screen-settings'],
  ];
  for (const [path, testId] of screens) {
    await openRoute(page, path, !!isMobile);
    await expect(page.getByTestId(testId)).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});

test('a job pays out, survives a reload and shows up in finances', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openRoute(page, '/jobs', !!isMobile);
  await page.getByTestId('start-job.flyer').click();
  await expect(page.getByTestId('activity')).toHaveCount(1);
  // The second job is blocked with an explanation.
  await expect(page.getByTestId('start-job.aufbau')).toBeDisabled();

  await page.reload();
  await openRoute(page, '/jobs', !!isMobile);
  await expect(page.getByTestId('activity')).toHaveCount(1);

  await openRoute(page, '/einstellungen', !!isMobile);
  await page.getByTestId('debug-+10 Min').click();
  await expect(page.getByTestId('offline-report')).toBeVisible();
  await expect(page.getByTestId('offline-report')).toContainText('Flyer verteilen');
  await page.getByTestId('offline-continue').click();

  await expect(page.getByTestId('cash')).toContainText('545');
  await page.reload();
  await expect(page.getByTestId('cash')).toContainText('545');
  await openRoute(page, '/finanzen', !!isMobile);
  await expect(page.getByTestId('screen-finance')).toContainText('Flyer verteilen');
  expect(errors).toEqual([]);
});

test('buying, listing and selling items', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openRoute(page, '/markt', !!isMobile);
  await page.getByRole('tab', { name: /Shop/ }).click();
  await page.getByTestId('buynew-item.powerbank').click();
  await expect(page.getByTestId('cash')).toContainText('465');

  await openRoute(page, '/inventar', !!isMobile);
  await page.getByTestId('item-item.powerbank').click();
  await expect(page.getByTestId('item-detail')).toBeVisible();
  await page.getByTestId('list-quick').click();
  await expect(page.getByTestId('item-item.powerbank')).toContainText('Inseriert');

  await openRoute(page, '/inventar', !!isMobile);
  await page.getByTestId('item-item.headphones-cheap').click();
  await page.getByTestId('sell-dealer').click();
  await expect(page.getByTestId('item-item.headphones-cheap')).toHaveCount(0);

  await openRoute(page, '/markt', !!isMobile);
  await page.getByRole('tab', { name: /Inserate/ }).click();
  await expect(page.getByTestId('activity')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('offline progress is reported after the game was closed', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await page.getByTestId('quickjob-job.aufbau').click();
  // Simulate being away for 3 hours: move the debug clock and reload.
  await page.evaluate(() => {
    const key = 'tekklife.debug.offset';
    localStorage.setItem(key, String(Number(localStorage.getItem(key) ?? 0) + 3 * 3600_000));
  });
  await page.reload();
  const report = page.getByTestId('offline-report');
  await expect(report).toBeVisible();
  await expect(report).toContainText('3 Std');
  await expect(report).toContainText('Aufbauhelfer');
  await page.getByTestId('offline-continue').click();
  await expect(report).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('export, reset and import a save', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await newGame(page, 'Exporteur');
  await openRoute(page, '/einstellungen', !!isMobile);
  await page.getByTestId('save-now').click();

  // Build an export code from the stored save the same way the game does.
  const exportCode = await page.evaluate(() => {
    const raw = localStorage.getItem('tekklife.save.main')!;
    const bytes = new TextEncoder().encode(raw);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return 'TEKKLIFE1:' + btoa(bin);
  });

  await page.getByTestId('reset-open').click();
  await page.getByTestId('reset-confirm').click();
  await expect(page.getByTestId('screen-start')).toBeVisible();

  await page.getByRole('button', { name: /Spielstand importieren/ }).click();
  await page.locator('textarea').fill(exportCode);
  await page.getByRole('button', { name: /^Importieren$/ }).click();
  await expect(page.getByTestId('screen-dashboard')).toContainText('Exporteur');
  expect(errors).toEqual([]);
});
