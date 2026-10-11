import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// M1 fixtures: the docs shell pages. Component specs (apps/visual/tests/<component>.spec.ts)
// follow the same pattern: every state × light/dark × 3 browsers, axe-clean.
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/components/', name: 'components-index' },
  { path: '/theme/', name: 'theme' },
  { path: '/typography/', name: 'typography' },
];

for (const { path, name } of PAGES) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('has no axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('matches the visual baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
    });
  });
}

test('the umbrella package loads the elements layer in the browser', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#elements-status')).toHaveText('ready');
});

test('fonts load offline from the package (M2 DoD)', async ({ page }) => {
  const external: string[] = [];
  const fonts: string[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost') {
      external.push(url.href);
      return route.abort();
    }
    if (url.pathname.endsWith('.woff2')) fonts.push(url.pathname);
    return route.continue();
  });
  await page.goto('/typography/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
  expect(fonts.some((path) => path.includes('google-sans-flex-latin'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Google Sans Flex"'))).toBe(true);
});
