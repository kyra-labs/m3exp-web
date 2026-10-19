import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Carousel (COMPONENT_SPEC §36; owner decisions M9 #22–#26): multi-browse, interactive items,
// uncontained, hero, center-aligned hero, full screen, CSS only, React. Acceptance ("keyboard
// scrolls item by item") + CAC: axe, light/dark × 3 browsers baselines, forced colors, reduced
// motion (one size, no masks). Scroll positions are set programmatically (page.mouse does not
// scroll) and every check waits for the carousel's own scroll spring to rest.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

type CarouselHost = HTMLElement & {
  rootElement?: HTMLElement;
  scrollToItem(index: number, animate?: boolean): void;
  readonly currentItem: number;
};

const rootOf = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-carousel');
const itemsOf = (root: Locator) => root.locator('.m3e-carousel__item');
/** The keyline layout has run (it loads on first render). */
const laidOut = (root: Locator) =>
  expect.poll(() => root.evaluate((n) => n.hasAttribute('data-keylines'))).toBe(true);
/** The carousel's own scroll spring has stopped. */
const rests = (root: Locator) =>
  expect.poll(() => root.evaluate((n) => n.hasAttribute('data-scrolling'))).toBe(false);
const scrollPosition = (root: Locator) =>
  root.locator('.m3e-carousel__viewport').evaluate((n) => Math.abs(n.scrollLeft));

/** Each item's visible part (the mask's box less its clip inset), in client coordinates. */
const visible = (root: Locator) =>
  itemsOf(root).evaluateAll((items) =>
    items.map((item) => {
      const mask = item.firstElementChild!.getBoundingClientRect();
      const inset =
        parseFloat(getComputedStyle(item).getPropertyValue('--_m3e-carousel-inset')) || 0;
      return { start: mask.left + inset, end: mask.right - inset };
    }),
  );

const IDS = ['multi-browse', 'interactive', 'uncontained', 'hero', 'centered-hero'];

test.beforeEach(async ({ page }) => {
  await page.goto('/components/carousel/');
  await page.evaluate(() => document.fonts.ready);
  for (const id of IDS) await laidOut(rootOf(page, id));
  await expect(page.getByTestId('react-carousel').locator('.m3e-carousel')).toHaveAttribute(
    'data-keylines',
    '',
  );
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baselines', async ({ page }) => {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot('carousel-page.png', { fullPage: true });

  // Scrolled: the multi-browse carousel on its second item, the uncontained one between rests.
  const browse = rootOf(page, 'multi-browse');
  await page.getByTestId('multi-browse').evaluate((n) => {
    (n as CarouselHost).scrollToItem(1, false);
  });
  const uncontained = rootOf(page, 'uncontained');
  await uncontained.locator('.m3e-carousel__viewport').evaluate((n) => {
    n.scrollLeft = 120;
  });
  await expect.poll(() => scrollPosition(uncontained)).toBe(120);
  await expect.poll(() => scrollPosition(browse)).toBeGreaterThan(100);
  await expect(page.getByTestId('multi-browse').locator('..')).toHaveScreenshot(
    'carousel-multi-browse-scrolled.png',
  );
  await expect(page.getByTestId('uncontained').locator('..')).toHaveScreenshot(
    'carousel-uncontained-scrolled.png',
  );

  // Keyboard focus: the ring on the focused item's mask (drawn inward).
  const interactive = rootOf(page, 'interactive');
  await itemsOf(interactive).first().locator('.m3e-carousel__action').focus();
  await page.keyboard.press('ArrowRight');
  await rests(interactive);
  await expect(itemsOf(interactive).nth(1).locator('.m3e-carousel__action')).toBeFocused();
  await expect(page.getByTestId('interactive').locator('..')).toHaveScreenshot(
    'carousel-interactive-focus.png',
  );

  // Hover: the state layer over an interactive item's content.
  await page.keyboard.press('Home');
  await rests(interactive);
  await itemsOf(interactive).first().locator('.m3e-carousel__action').blur();
  const first = (await itemsOf(interactive).first().boundingBox())!;
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await expect(page.getByTestId('interactive').locator('..')).toHaveScreenshot(
    'carousel-interactive-hover.png',
  );
});

test('multi-browse at 412dp: Compose’s keylines pin the items together inside the padding', async ({
  page,
}) => {
  const root = rootOf(page, 'multi-browse');
  const frame = (await root.boundingBox())!;
  // HorizontalMultiBrowseCarouselSample: 186dp preferred → 178dp large items, a 40dp small one.
  await expect(root).toHaveCSS('--_m3e-carousel-item-size', '178px');
  const parts = (await visible(root)).filter(
    (p) => p.end > frame.x + 1 && p.start < frame.x + frame.width - 1,
  );
  expect(parts).toHaveLength(3);
  // The padding step: the first item starts 16dp in, the last ends at the edge, 8dp apart.
  expect(parts[0]!.start - frame.x).toBeCloseTo(16, 0);
  expect(parts[1]!.start - parts[0]!.end).toBeCloseTo(8, 0);
  expect(parts[2]!.start - parts[1]!.end).toBeCloseTo(8, 0);
  expect(parts[2]!.end).toBeCloseTo(frame.x + frame.width, 0);
  expect(parts[2]!.end - parts[2]!.start).toBeLessThan(parts[1]!.end - parts[1]!.start);
  // Every item snaps one at a time to its keyline.
  const viewport = root.locator('.m3e-carousel__viewport');
  await expect(viewport).toHaveCSS('scroll-snap-type', 'x mandatory');
  await expect(itemsOf(root).first()).toHaveCSS('scroll-snap-stop', 'always');
  await expect(itemsOf(root).last()).toHaveCSS('scroll-margin-inline-start', '234px');
  // The uncontained layout does not snap.
  await expect(rootOf(page, 'uncontained').locator('.m3e-carousel__viewport')).toHaveCSS(
    'scroll-snap-type',
    'none',
  );
});

test('keyboard scrolls item by item; every item keeps its tab stop (owner decision M9 #26)', async ({
  page,
}) => {
  const host = page.getByTestId('multi-browse');
  const root = rootOf(page, 'multi-browse');
  const items = itemsOf(root);
  await expect(items).toHaveCount(8);
  for (let i = 0; i < 8; i++) await expect(items.nth(i)).toHaveAttribute('tabindex', '0');
  await items.first().focus();
  let previous = await scrollPosition(root);
  for (let i = 1; i < 4; i++) {
    await page.keyboard.press('ArrowRight');
    await expect(items.nth(i)).toBeFocused();
    await rests(root);
    const position = await scrollPosition(root);
    expect(position).toBeGreaterThan(previous);
    previous = position;
  }
  await page.keyboard.press('End');
  await expect(items.last()).toBeFocused();
  await rests(root);
  await page.keyboard.press('ArrowRight');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(items.first()).toBeFocused();
  await rests(root);
  expect(await scrollPosition(root)).toBeLessThan(1);
  expect(await host.evaluate((n) => (n as CarouselHost).currentItem)).toBe(0);
  // Tab leaves an item for the next one.
  await page.keyboard.press('Tab');
  await expect(items.nth(1)).toBeFocused();
});

test('APG carousel semantics', async ({ page }) => {
  const root = rootOf(page, 'multi-browse');
  await expect(root).toHaveAttribute('role', 'region');
  await expect(root).toHaveAttribute('aria-roledescription', 'carousel');
  await expect(root).toHaveAttribute('aria-label', 'Featured');
  const second = itemsOf(root).nth(1);
  await expect(second).toHaveAttribute('role', 'group');
  await expect(second).toHaveAttribute('aria-roledescription', 'slide');
  await expect(second).toHaveAttribute('aria-label', '2 of 8');
});

test('hero layouts: the large item fills the carousel but for the small items', async ({
  page,
}) => {
  await expect(rootOf(page, 'hero')).toHaveCSS(
    '--_m3e-carousel-item-size',
    `${String(412 - 40 - 8)}px`,
  );
  // HorizontalCenteredHeroCarouselSample: 412dp less 2 × 24dp, two small items.
  await expect(rootOf(page, 'centered-hero')).toHaveCSS(
    '--_m3e-carousel-item-size',
    `${String(364 - 2 * 40 - 2 * 8)}px`,
  );
});

test('full screen: one item per screen, ArrowDown moves on (CSS layout)', async ({ page }) => {
  const root = rootOf(page, 'full-screen');
  const viewport = root.locator('.m3e-carousel__viewport');
  await expect(viewport).toHaveCSS('scroll-snap-type', 'y mandatory');
  const items = itemsOf(root);
  expect((await items.first().boundingBox())!.height).toBeCloseTo(360, 0);
  await items.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await rests(root);
  expect(await viewport.evaluate((n) => n.scrollTop)).toBeCloseTo(360 + 16, 0);
});

test('React: presses reach onPress; scrollToItem from the ref', async ({ page }) => {
  const react = page.getByTestId('react-carousel');
  await react.locator('.m3e-carousel__action').first().click();
  await expect(page.getByTestId('react-last')).toHaveText('1');
  await page.getByTestId('react-scroll').click();
  const root = react.locator('.m3e-carousel');
  await rests(root);
  await expect.poll(() => scrollPosition(root)).toBeGreaterThan(400);
});

test('reduced motion: every item at one size, no masks (owner decision M9 #24)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const root = rootOf(page, 'multi-browse');
  await expect(root).toHaveCSS('--_m3e-carousel-item-size', '178px');
  await expect(root).not.toHaveAttribute('data-keylines');
  const sizes = (await visible(root)).slice(0, 3).map((p) => Math.round(p.end - p.start));
  expect(sizes).toEqual([178, 178, 178]);
  await expect(page.getByTestId('multi-browse').locator('..')).toHaveScreenshot(
    'carousel-reduced-motion.png',
  );
});

test('forced colors: every item keeps a visible boundary', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  const item = itemsOf(rootOf(page, 'multi-browse')).first();
  const border = await item.evaluate((n) => getComputedStyle(n, '::after').borderTopStyle);
  expect(border).toBe('solid');
});
