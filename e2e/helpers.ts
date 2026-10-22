import { expect, type Page } from '@playwright/test';

/** Collects console errors and uncaught exceptions for the whole test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function newGame(page: Page, name = 'Testi') {
  await page.goto('/?debug');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug');
  await page.getByTestId('start-name').fill(name);
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('screen-dashboard')).toBeVisible();
}

export async function expectNoHorizontalScroll(page: Page) {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

export async function openRoute(page: Page, path: string, isMobile: boolean) {
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

/** Moves the debug clock forward and reloads (simulates being away). */
export async function skipTime(page: Page, ms: number) {
  await page.evaluate((delta) => {
    const key = 'tekklife.debug.offset';
    localStorage.setItem(key, String(Number(localStorage.getItem(key) ?? 0) + delta));
  }, ms);
  await page.reload();
  const report = page.getByTestId('offline-continue');
  if (await report.isVisible().catch(() => false)) await report.click();
}
