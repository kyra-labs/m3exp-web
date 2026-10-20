import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { runningSpatialAnimations } from './reduced-motion.js';
import { expectTargetSizes } from './target-size.js';

// M1 fixtures: the docs shell pages. Component specs (apps/visual/tests/<component>.spec.ts)
// follow the same pattern: every state × light/dark × 3 browsers, axe-clean.
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/components/', name: 'components-index' },
  { path: '/theme/', name: 'theme' },
  { path: '/typography/', name: 'typography' },
  { path: '/icons/', name: 'icons' },
  { path: '/motion/', name: 'motion' },
  { path: '/shapes/', name: 'shapes' },
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

/** A system color as the page resolves it. */
const systemColor = (page: Page, name: string) =>
  page.evaluate((c) => {
    const probe = document.createElement('div');
    probe.style.color = c;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

/** The visible keyboard-reachable controls of the page. */
const CONTROLS = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex="0"]';

// Forced colors and reduced motion on the shell pages (M11 a11y audit coverage gaps: the
// component specs covered component pages only). Chromium is the only engine Playwright emulates
// forced colors in.
test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  for (const { path, name } of PAGES) {
    test(`${name}: system colors, every control visible`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium only');
      await page.goto(path);
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
      const canvas = await systemColor(page, 'Canvas');
      const canvasText = await systemColor(page, 'CanvasText');
      const root = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return { background: s.backgroundColor, color: s.color };
      });
      expect(root).toEqual({ background: canvas, color: canvasText });
      const controls = await page.locator(CONTROLS).evaluateAll((els) =>
        els
          .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              control: `${el.localName}${el.id ? `#${el.id}` : ''} ${el.textContent.trim().slice(0, 30)}`,
              color: getComputedStyle(el).color,
              size: Math.min(r.width, r.height),
            };
          }),
      );
      for (const c of controls) {
        expect(c.size, c.control).toBeGreaterThan(0);
        expect(c.color, c.control).not.toBe(canvas);
      }
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const { path, name } of PAGES) {
    test(`${name}: spatial motion is off; nothing moves while tabbing through`, async ({
      page,
    }) => {
      await page.goto(path);
      expect(
        await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      ).toBe(true);
      const duration = await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--m3e-sys-motion-spring-default-spatial-duration')
          .trim(),
      );
      expect(duration).toMatch(/^0m?s$/);
      const moving = () => runningSpatialAnimations(page);
      expect(await moving()).toEqual([]);
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        expect(await moving(), `after Tab ${String(i + 1)}`).toEqual([]);
      }
    });
  }
});

// Docs-only native controls (M11 a11y audit L6): the playgrounds' selects were 19–25px tall and
// the checkboxes 13 × 13 in 24px labels. They get 48px rows (docs.css); a checkbox's label is its
// target.
test('docs native selects and checkboxes have 48 × 48 hit areas (hit testing)', async ({
  page,
}) => {
  test.slow();
  for (const path of [
    '/theme/',
    '/shapes/',
    '/components/button/',
    '/components/bottom-sheet/',
    '/components/carousel/',
    '/components/docked-toolbar/',
    '/components/navigation-suite/',
    '/components/pull-to-refresh/',
    '/components/search/',
    '/components/slider/',
    '/components/snackbar/',
    '/components/top-app-bar/',
  ]) {
    await page.goto(path);
    const controls = page.locator('select:not([class]), input[type="checkbox"]:not([class])');
    // The playgrounds are client-only islands: wait for them to render.
    await expect(controls.first()).toBeVisible();
    await expectTargetSizes(controls, path);
  }
});

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

test('the shapes playground scrubs the morph (M3 review item)', async ({ page }) => {
  await page.goto('/shapes/');
  await expect(page.locator('.docs-shapes li')).toHaveCount(35);
  const path = page.locator('#morph-path');
  const atHalf = await path.getAttribute('d');
  await page.locator('#morph-progress').fill('0');
  await expect(page.locator('output[name="value"]')).toHaveText('0.00');
  const atStart = await path.getAttribute('d');
  expect(atStart).not.toBe(atHalf);
  await page.locator('select[name="end"]').selectOption('Heart');
  await page.locator('#morph-progress').fill('1');
  await expect(path).not.toHaveAttribute('d', atStart ?? '');
});
