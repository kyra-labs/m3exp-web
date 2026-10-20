import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { runningSpatialAnimations } from './reduced-motion.js';
import { expectComposePlacement, placement } from './badge-placement.js';

// Navigation bar (COMPONENT_SPEC §13): short navigation bar + legacy (D4) bar.
// Acceptance + light/dark × 3 browsers baselines, axe.
const box = async (el: Locator) => (await el.boundingBox())!;
const part = (item: Locator, name: string) => item.locator(`.m3e-navigation-item__${name}`);
/** The element is painted on top at its center (not covered by the indicator). */
const onTop = (el: Locator) =>
  el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit !== null && (hit === node || node.contains(hit));
  });

const layerOpacity = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node, '::before').opacity));
const sys = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/components/navigation-bar/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-bar').locator('.m3e-navigation-item')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('navigation-bar.png', { fullPage: true });
});

test('only one item per bar has aria-current', async ({ page }) => {
  for (const nav of await page.locator('nav[class*="navigation-bar"]').all()) {
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  }
});

test('short bar geometry follows ShortNavigationBar (vertical items)', async ({ page }) => {
  const bar = page.getByTestId('short-vertical');
  const barBox = await box(bar);
  expect(barBox.height).toBeCloseTo(64, 1);
  const items = await bar.locator('.m3e-navigation-item').all();
  for (const item of items) {
    const itemBox = await box(item);
    expect(itemBox.width).toBeCloseTo(barBox.width / items.length, 0);
    const pill = await box(part(item, 'state'));
    expect(pill.width).toBeCloseTo(56, 1);
    expect(pill.height).toBeCloseTo(32, 1);
    expect(pill.y - itemBox.y).toBeCloseTo(6, 1);
    expect((await box(part(item, 'label'))).y - (pill.y + pill.height)).toBeCloseTo(4, 1);
  }
  const selected = await box(part(items[0]!, 'indicator'));
  expect(selected.width).toBeCloseTo(56, 1);
  expect(selected.height).toBeCloseTo(32, 1);
  expect((await box(part(items[1]!, 'indicator'))).width).toBeCloseTo(0, 1);
});

test('selected icons are filled; disabled items dim', async ({ page }) => {
  const fill = (item: Locator) =>
    part(item, 'icon').evaluate((el) => getComputedStyle(el).fontVariationSettings);
  const bar = page.getByTestId('short-disabled');
  expect(await fill(bar.locator('[aria-current]'))).toContain('"FILL" 1');
  expect(await fill(bar.locator('.m3e-navigation-item').first())).toContain('"FILL" 0');
  const disabled = bar.locator('[aria-disabled="true"]');
  const color = await part(disabled, 'label').evaluate((el) => getComputedStyle(el).color);
  expect(color).toMatch(/color\(srgb [\d.]+ [\d.]+ [\d.]+ \/ 0\.38\)|rgba\(.*0\.38\)/);
});

test('horizontal items: centered, the pill hugs icon + label', async ({ page }) => {
  const bar = page.getByTestId('short-horizontal');
  const barBox = await box(bar);
  const items = await bar.locator('.m3e-navigation-item').all();
  const first = await box(items[0]!);
  const last = await box(items.at(-1)!);
  expect(first.x - barBox.x).toBeCloseTo(barBox.x + barBox.width - (last.x + last.width), 0);
  for (const item of items) {
    const itemBox = await box(item);
    expect(itemBox.width).toBeGreaterThanOrEqual(barBox.width * 0.175 - 0.5);
    expect(itemBox.width).toBeLessThanOrEqual(barBox.width * 0.25 + 0.5);
    const pill = await box(part(item, 'state'));
    const icon = await box(part(item, 'icon'));
    const label = await box(part(item, 'label'));
    expect(pill.height).toBeCloseTo(40, 1);
    expect(await onTop(part(item, 'icon'))).toBe(true);
    expect(await onTop(part(item, 'label'))).toBe(true);
    expect(icon.x - pill.x).toBeCloseTo(16, 1);
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(4, 1);
    expect(pill.x + pill.width - (label.x + label.width)).toBeCloseTo(16, 0);
  }
});

test('hover and focus show on the indicator pill, from anywhere on the item', async ({ page }) => {
  const item = page.getByTestId('v-search');
  const state = part(item, 'state');
  await part(item, 'label').hover();
  const hover = await sys(page, '--m3e-sys-state-hover-state-layer-opacity');
  await expect.poll(() => layerOpacity(state)).toBeCloseTo(hover, 2);
  await expect(page).toHaveScreenshot('navigation-bar-hovered.png', {
    clip: await box(page.getByTestId('short-vertical')),
  });
  await page.mouse.move(0, 0);
  await page.getByTestId('v-home').focus();
  await page.keyboard.press('Tab');
  await expect(item).toBeFocused();
  // The ring grows from a zero-width outline (D19 (3)): wait for its 3dp width.
  await expect.poll(() => state.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('3px');
  const frame = await box(page.getByTestId('short-vertical'));
  await expect(page).toHaveScreenshot('navigation-bar-focused.png', {
    clip: { x: frame.x - 8, y: frame.y - 8, width: frame.width + 16, height: frame.height + 16 },
  });
});

test('the indicator animates between items (default spatial spring)', async ({ page }) => {
  const bar = page.getByTestId('react-bar');
  const items = bar.locator('.m3e-navigation-item');
  const target = part(items.nth(2), 'indicator');
  const widths = target.evaluate(
    (el) =>
      new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        const start = performance.now();
        const tick = () => {
          samples.push(el.getBoundingClientRect().width);
          if (performance.now() - start < 1200) requestAnimationFrame(tick);
          else resolve(samples);
        };
        requestAnimationFrame(tick);
      }),
  );
  await items.nth(2).click();
  const samples = await widths;
  expect(samples.at(-1)).toBeCloseTo(56, 1);
  expect(samples.some((w) => w > 0 && w < 56)).toBe(true);
  await expect(bar.locator('[aria-current]')).toHaveCount(1);
  await expect(items.nth(2)).toHaveAttribute('aria-current', 'page');
  await expect
    .poll(() => box(part(items.nth(0), 'indicator')).then((b) => b.width))
    .toBeCloseTo(0, 1);
});

test('element bar: the static geometry; a press moves aria-current and the indicator', async ({
  page,
}) => {
  const host = page.getByTestId('element-bar');
  const bar = host.locator('nav');
  await expect(bar).toHaveClass('m3e-short-navigation-bar');
  const reference = await box(page.getByTestId('short-vertical'));
  const barBox = await box(bar);
  expect(barBox.width).toBeCloseTo(reference.width, 0);
  expect(barBox.height).toBeCloseTo(reference.height, 0);
  const items = bar.locator('.m3e-navigation-item');
  const values: string[] = [];
  await page.exposeFunction('logSelection', (v: string) => values.push(v));
  await host.evaluate((el) => {
    el.addEventListener('selection-change', (e) => {
      void (window as unknown as { logSelection(v: string): Promise<void> }).logSelection(
        (e as CustomEvent<{ value: string }>).detail.value,
      );
    });
  });
  await items.nth(1).click();
  await expect(bar.locator('[aria-current]')).toHaveCount(1);
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'page');
  await expect(host).toHaveAttribute('selected', 'search');
  await expect.poll(() => values).toEqual(['search']);
  await expect
    .poll(() => box(part(items.nth(1), 'indicator')).then((b) => b.width))
    .toBeCloseTo(56, 1);
});

test('legacy bar geometry follows NavigationBar (D4)', async ({ page }) => {
  await expect(page.locator('[data-deprecated] .docs-deprecated')).toBeVisible();
  const bar = page.getByTestId('legacy-bar');
  const barBox = await box(bar);
  expect(barBox.height).toBeCloseTo(80, 1);
  const items = await bar.locator('.m3e-navigation-item').all();
  const first = await box(items[0]!);
  const second = await box(items[1]!);
  expect(second.x - (first.x + first.width)).toBeCloseTo(8, 0);
  const pill = await box(part(items[0]!, 'state'));
  expect(pill.y - barBox.y).toBeCloseTo(12, 1);
  expect((await box(part(items[0]!, 'label'))).y - (pill.y + pill.height)).toBeCloseTo(4, 1);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the bar keeps a boundary and the selection stays visible', async ({ page }) => {
    const bar = page.getByTestId('short-vertical');
    expect(await bar.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid');
    const indicator = part(bar.locator('[aria-current]'), 'indicator');
    expect(await indicator.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
  });

  test('badges stay visible (CanvasText)', async ({ page }) => {
    const badge = page.getByTestId('short-badges').locator('.m3e-badge').first();
    const color = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// Badges (M9 B2): a Compose Badge in the item icon, read after the label.
test.describe('badges', () => {
  const BARS = ['short-badges', 'short-badges-horizontal', 'element-badges', 'react-badges-bar'];
  /** The `<nav>`: the element hosts render it inside themselves. */
  const barOf = (page: Page, id: string) =>
    id.startsWith('element-') ? page.getByTestId(id).locator('nav') : page.getByTestId(id);

  test('Compose BadgedBox placement on the icon in every bar, the legacy bar too', async ({
    page,
  }) => {
    for (const id of [...BARS, 'legacy-badges']) {
      const badges = barOf(page, id).locator('.m3e-badged-box > .m3e-badge');
      await expect(badges, id).toHaveCount(3);
      for (const badge of await badges.all()) {
        await expectComposePlacement(badge, '.m3e-navigation-item');
      }
      await expect(barOf(page, id).locator('.m3e-badge__text')).toHaveText(['8', '999+']);
      await expect(
        barOf(page, id).locator('.m3e-badged-box > .m3e-navigation-item__icon'),
      ).toHaveCount(3);
    }
  });

  test('the badge is read after the label; the item layout is unchanged', async ({ page }) => {
    for (const id of BARS) {
      const items = barOf(page, id).locator('.m3e-navigation-item');
      await expect(items.nth(1), id).toHaveAccessibleName('Inbox 8');
      await expect(items.nth(2), id).toHaveAccessibleName('Chat New notification');
      await expect(items.nth(3), id).toHaveAccessibleName('Mail 1200 unread');
    }
    // A badged item lays out as the others: the same pill and label positions.
    const items = await page.getByTestId('short-badges').locator('.m3e-navigation-item').all();
    const pill = await box(part(items[0]!, 'state'));
    const label = await box(part(items[0]!, 'label'));
    for (const item of items.slice(1)) {
      const p = await box(part(item, 'state'));
      expect(p.y).toBeCloseTo(pill.y, 1);
      expect(p.width).toBeCloseTo(pill.width, 1);
      expect((await box(part(item, 'label'))).y).toBeCloseTo(label.y, 1);
      expect((await box(part(item, 'icon'))).y - p.y).toBeCloseTo(4, 1);
    }
  });

  test('badgeBounds(): a narrow item keeps its badge inside; RTL mirrors', async ({ page }) => {
    const bar = page.getByTestId('short-badges');
    await bar.evaluate((el) => {
      el.parentElement!.style.maxInlineSize = '240px';
    });
    const mail = bar.locator('.m3e-navigation-item').nth(3).locator('.m3e-badge');
    const clamped = await placement(mail, '.m3e-navigation-item');
    expect(clamped.overflow).toBeCloseTo(0, 0);
    expect(clamped.end).toBeLessThan(clamped.width - 12 - 1);
    expect(clamped.top).toBeCloseTo(-2, 1);
    await bar.evaluate((el) => {
      el.parentElement!.style.maxInlineSize = '';
      el.setAttribute('dir', 'rtl');
    });
    for (const badge of await bar.locator('.m3e-badge').all()) {
      await expectComposePlacement(badge, '.m3e-navigation-item');
    }
  });

  test('selection keeps the badge (Compose does not hide it); visual baselines', async ({
    page,
  }) => {
    await page.mouse.move(0, 0);
    await page.locator('#badges-heading').evaluate((el) => {
      el.scrollIntoView({ block: 'start' });
    });
    // A locator screenshot of the section: a clip computed from the frames' fractional boxes
    // came out a pixel taller or shorter between runs (Firefox).
    await expect(page.locator('section[aria-labelledby="badges-heading"]')).toHaveScreenshot(
      'navigation-bar-badges.png',
    );
    const bar = page.getByTestId('react-badges-bar');
    const inbox = bar.locator('.m3e-navigation-item').nth(1);
    await inbox.click();
    await expect(inbox).toHaveAttribute('aria-current', 'page');
    await expect(inbox.locator('.m3e-badge')).toHaveCount(1);
    await expect.poll(() => box(part(inbox, 'indicator')).then((b) => b.width)).toBeCloseTo(56, 1);
    await page.mouse.move(0, 0);
    const frame = await box(bar);
    await expect(page).toHaveScreenshot('navigation-bar-badges-selected.png', {
      clip: { x: frame.x - 8, y: frame.y - 8, width: frame.width + 16, height: frame.height + 16 },
    });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the indicator jumps between items (default spatial spring off)', async ({ page }) => {
    const bar = page.getByTestId('react-bar');
    const items = bar.locator('.m3e-navigation-item');
    await bar.scrollIntoViewIfNeeded();
    const target = part(items.nth(2), 'indicator');
    const widths = target.evaluate(
      (el) =>
        new Promise<number[]>((resolve) => {
          const samples: number[] = [];
          const start = performance.now();
          const tick = () => {
            samples.push(el.getBoundingClientRect().width);
            if (performance.now() - start < 600) requestAnimationFrame(tick);
            else resolve(samples);
          };
          requestAnimationFrame(tick);
        }),
    );
    await items.nth(2).click();
    const samples = await widths;
    expect(samples.at(-1)).toBeCloseTo(56, 1);
    // No frame between the closed pill and the full one.
    expect(samples.filter((w) => w > 0.5 && w < 55.5)).toEqual([]);
    expect(await box(part(items.nth(0), 'indicator')).then((b) => b.width)).toBeCloseTo(0, 1);
    expect(await runningSpatialAnimations(page)).toEqual([]);
  });
});
