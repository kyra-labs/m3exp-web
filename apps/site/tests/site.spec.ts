import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { PAGES } from './pages';

/** Scrolls through the page so every island mounts, then waits for fonts and idle network. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForLoadState('networkidle');
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

for (const path of PAGES) {
  test.describe(path, () => {
    test('has no axe violations and no console errors', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await settle(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('renders every icon from the subset font', async ({ page }) => {
      await page.goto(path);
      await settle(page);
      // An unresolved ligature renders its name as text, wider than the icon's fixed box
      // (.m3e-icon clips it with overflow: hidden, so compare the content width).
      const unresolved = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.m3e-icon')]
          .filter((el) => el.offsetParent !== null && el.textContent.trim().length > 1)
          .filter((el) => el.scrollWidth > el.clientWidth * 1.5)
          .map((el) => el.textContent.trim()),
      );
      expect(unresolved).toEqual([]);
    });

    test('does not scroll sideways', async ({ page }) => {
      await page.goto(path);
      await settle(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of PAGES) {
    test(`${path} reads and reaches the navigation`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('#site-nav')).toBeVisible();
      await expect(page.locator('.site-brand')).toBeVisible();
    });
  }
});

test.describe('shell', () => {
  test('the menu button opens the modal drawer and Escape returns focus', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'compact', 'modal drawer below the large size class');
    await page.goto('/');
    const button = page.locator('#site-menu-button');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-drawer')).toHaveAttribute('data-open', '');
    await expect(page.locator('#site-nav :focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-drawer')).not.toHaveAttribute('data-open', '');
    await expect(button).toBeFocused();
  });

  test('the theme menu forces light and dark', async ({ page }) => {
    await page.goto('/');
    await page.locator('#site-theme-button').click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#site-theme-button').click();
    await page.getByRole('menuitemradio', { name: 'System' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  });

  test('search finds pages', async ({ page }) => {
    await page.goto('/');
    const input = page.getByRole('combobox', { name: 'Search the docs' });
    await input.click();
    await input.fill('springs');
    await expect(page.getByRole('option').first()).toBeVisible();
  });

  test('a seed theme from the hero applies on every page', async ({ page }, info) => {
    test.skip(info.project.name !== 'light', 'once is enough');
    await page.goto('/');
    await settle(page);
    await page.getByRole('radio', { name: 'Vibrant' }).click();
    await expect(page.locator('style#site-theme')).toHaveCount(1);
    await page.goto('/404.html');
    await expect(page.locator('style#site-theme')).toHaveCount(1);
  });
});
