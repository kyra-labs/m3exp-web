import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Top app bar, small (COMPONENT_SPEC §11): acceptance + light/dark × 3 browsers baselines, axe.
const box = (el: Locator) =>
  el.evaluate((node) => {
    const { left, right, top, height } = node.getBoundingClientRect();
    return { left, right, top, height };
  });
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
/** A color token resolved to rgb(), for comparing with computed backgrounds. */
const color = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
const offset = (bar: Locator) =>
  bar.evaluate((el) => el.style.getPropertyValue('--_m3e-top-app-bar-offset'));
const scrollTo = (scroller: Locator, top: number) =>
  scroller.evaluate((el, t) => {
    el.scrollTo({ top: t, behavior: 'instant' });
  }, top);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/top-app-bar/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-scroll').locator('.m3e-top-app-bar')).toBeVisible();
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('top-app-bar.png', { fullPage: true });
});

test('expanded height matches AppBarSmallTokens.ContainerHeight', async ({ page }) => {
  const height = Number.parseFloat(await token(page, '--m3e-comp-app-bar-small-container-height'));
  for (const id of ['title-only', 'full', 'subtitle']) {
    expect((await box(page.getByTestId(id))).height, id).toBe(height);
  }
});

test('layout follows TopAppBarLayout (title inset, 48dp icon slots, 4dp edge padding)', async ({
  page,
}) => {
  const titleOnly = page.getByTestId('title-only');
  const bar = await box(titleOnly);
  // No navigation icon: title box at TopAppBarTitleInset (12) + title padding (4).
  expect((await box(titleOnly.locator('.m3e-top-app-bar__title'))).left - bar.left).toBe(16);

  const full = page.getByTestId('full');
  const fullBox = await box(full);
  // Navigation: 4dp padding + a 48dp slot holding the 40dp button; title after it + 4dp padding.
  expect((await box(full.getByRole('button', { name: 'Menu' }))).left - fullBox.left).toBe(8);
  expect((await box(full.locator('.m3e-top-app-bar__title'))).left - fullBox.left).toBe(56);
  // Actions: last button's 48dp slot ends 4dp from the edge.
  expect(fullBox.right - (await box(full.getByRole('button', { name: 'Favorite' }))).right).toBe(8);
});

test('container color changes when content scrolls under the bar', async ({ page }) => {
  const scroller = page.getByTestId('scroll-pinned');
  const bar = scroller.locator('.m3e-top-app-bar');
  const background = () => bar.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background()).toBe(await color(page, '--m3e-comp-app-bar-container-color'));
  await scrollTo(scroller, 120);
  await expect(bar).toHaveAttribute('data-scrolled', '');
  const scrolled = await color(page, '--m3e-comp-app-bar-on-scroll-container-color');
  await expect.poll(background, { timeout: 3000 }).toBe(scrolled);
  // Pinned bars never move.
  expect(await offset(bar)).toBe('');
  await scrollTo(scroller, 0);
  await expect(bar).not.toHaveAttribute('data-scrolled');
});

test('enter-always: collapses to 0 and expands back to the token height', async ({ page }) => {
  const scroller = page.getByTestId('scroll-enter-always');
  const bar = scroller.locator('.m3e-top-app-bar');
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-64px');
  // Fully clipped: nothing of the bar is hit-testable at its top edge.
  const barBox = (await bar.boundingBox())!;
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('.m3e-top-app-bar') !== null,
    { x: barBox.x + barBox.width / 2, y: barBox.y + 2 },
  );
  expect(hit).toBe(false);
  // Scrolling up any amount brings it back; the settle snaps it fully open or closed.
  await scrollTo(scroller, 360);
  await expect.poll(() => offset(bar), { timeout: 3000 }).toMatch(/^(0|-64)px$/);
  await scrollTo(scroller, 300);
  await expect.poll(() => offset(bar), { timeout: 3000 }).toBe('0px');
});

test('enter-always: focus brings a hidden bar back', async ({ page }) => {
  const scroller = page.getByTestId('scroll-enter-always');
  const bar = scroller.locator('.m3e-top-app-bar');
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-64px');
  await bar.getByRole('button', { name: 'Menu' }).focus();
  await expect.poll(() => offset(bar), { timeout: 3000 }).toBe('0px');
});

test('React: same behavior through <TopAppBar scrollBehavior>', async ({ page }) => {
  const scroller = page.getByTestId('react-scroll');
  const bar = scroller.locator('.m3e-top-app-bar');
  await expect(bar).toHaveAttribute('data-scroll-behavior', 'enter-always');
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-64px');
  await expect(bar).toHaveAttribute('data-scrolled', '');
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the bar keeps a visible lower edge', async ({ page }) => {
    const style = await page
      .getByTestId('full')
      .evaluate((el) => getComputedStyle(el).borderBottomStyle);
    expect(style).toBe('solid');
  });
});
