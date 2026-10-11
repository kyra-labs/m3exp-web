import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// M1 fixtures: the docs shell pages. Component specs (apps/visual/tests/<component>.spec.ts)
// follow the same pattern: every state × light/dark × 3 browsers, axe-clean.
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/components/', name: 'components-index' },
  { path: '/theme/', name: 'theme' },
  { path: '/typography/', name: 'typography' },
  { path: '/icons/', name: 'icons' },
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

test('m3e-icons subset output renders the requested icons (M2 DoD)', async ({ page }) => {
  await page.goto('/icons/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('24px "M3E Docs Icons"'))).toBe(true);
  // A ligature renders as one square glyph; unshaped text ("arrow_back") would be several em wide.
  const boxes = await page.locator('.docs-icon').evaluateAll((els) =>
    els.map((el) => {
      const { width, height } = el.getBoundingClientRect();
      return { name: el.textContent, width, height };
    }),
  );
  expect(boxes.length).toBe(20);
  for (const box of boxes) {
    expect(box.width, box.name).toBeLessThanOrEqual(box.height * 1.1);
  }
});
