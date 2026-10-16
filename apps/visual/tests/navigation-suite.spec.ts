import AxeBuilder from '@axe-core/playwright';
import { springDurationMillis, springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Navigation suite scaffold (COMPONENT_SPEC §16): the element, React and the CSS-only adaptive
// suite at each window size class (viewport resizing), acceptance + light/dark × 3 browsers
// baselines, axe at every width, focus and selection across switches, RTL, forced colors, reduced
// motion and clock-driven show / hide traces.
const box = async (el: Locator) => (await el.boundingBox())!;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
type SuiteHost = HTMLElement & {
  type: string | null;
  hideNavigation(): void;
  showNavigation(): void;
};

/** Window sizes (CSS px): one per width class the rule distinguishes, plus a compact height. */
const SIZES = {
  compact: { width: 400, height: 900 },
  medium: { width: 700, height: 900 },
  expanded: { width: 1000, height: 900 },
  large: { width: 1300, height: 900 },
  'compact-height': { width: 1000, height: 440 },
} as const;
const EXPECTED: Record<keyof typeof SIZES, string> = {
  compact: 'short-navigation-bar-compact',
  medium: 'wide-navigation-rail-collapsed',
  expanded: 'wide-navigation-rail-collapsed',
  large: 'wide-navigation-rail-expanded',
  'compact-height': 'short-navigation-bar-medium',
};
const NAV_CLASS: Record<string, string> = {
  'short-navigation-bar-compact': 'm3e-short-navigation-bar',
  'short-navigation-bar-medium': 'm3e-short-navigation-bar m3e-short-navigation-bar--horizontal',
  'wide-navigation-rail-collapsed': 'm3e-wide-navigation-rail',
  'wide-navigation-rail-expanded': 'm3e-wide-navigation-rail m3e-wide-navigation-rail--expanded',
};

const suiteOf = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-navigation-suite');
const elementSuite = (page: Page) => suiteOf(page, 'element-suite');
const reactSuite = (page: Page) => page.getByTestId('react-suite');
const navOf = (suite: Locator) => suite.locator(':scope > nav');
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const visibilitySpring = async (page: Page) => ({
  dampingRatio: Number(
    await token(page, '--m3e-comp-navigation-suite-scaffold-visibility-damping-ratio'),
  ),
  stiffness: Number(await token(page, '--m3e-comp-navigation-suite-scaffold-visibility-stiffness')),
});
const rests = (el: Locator) =>
  expect.poll(() => el.evaluate((node) => node.hasAttribute('data-animating'))).toBe(false);

async function open(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.goto('/components/navigation-suite/');
  await page.evaluate(() => document.fonts.ready);
  await expect(
    reactSuite(page).locator('.m3e-navigation-item, .m3e-navigation-drawer-item'),
  ).toHaveCount(4);
}

for (const [name, size] of Object.entries(SIZES) as [
  keyof typeof SIZES,
  (typeof SIZES)[keyof typeof SIZES],
][]) {
  test.describe(`${name} window (${String(size.width)}×${String(size.height)})`, () => {
    // The page starts at this size (a setViewportSize right before the load can race the first
    // render in Chromium, which then switches type once and shows "last switch" in the demo).
    test.use({ viewport: size });

    test.beforeEach(async ({ page }) => {
      await open(page, size);
    });

    test('element, React and the CSS-only suite show the same navigation', async ({ page }) => {
      const type = EXPECTED[name];
      expect(
        await page.getByTestId('element-suite').evaluate((host) => (host as SuiteHost).type),
      ).toBe(type);
      await expect(page.getByTestId('element-type')).toHaveText(type);
      await expect(navOf(elementSuite(page))).toHaveAttribute('class', NAV_CLASS[type]!);
      await expect(navOf(reactSuite(page))).toHaveAttribute('class', NAV_CLASS[type]!);
      const visible = await suiteOf(page, 'static-frame')
        .locator(':scope > nav')
        .evaluateAll((navs: Element[]) =>
          navs
            .filter((n) => getComputedStyle(n).display !== 'none')
            .map((n) => n.getAttribute('class') ?? ''),
        );
      expect(visible).toEqual([NAV_CLASS[type]]);
    });

    test('has no axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
    });

    // Element frames, not the full page: a full-page capture resizes the viewport, which is what
    // the suite reacts to.
    test('matches the visual baselines (element and CSS-only suites)', async ({ page }) => {
      await page.mouse.move(0, 0);
      await expect(page.getByTestId('element-frame')).toHaveScreenshot(
        `navigation-suite-${name}-element.png`,
      );
      await expect(page.getByTestId('static-frame')).toHaveScreenshot(
        `navigation-suite-${name}-static.png`,
      );
    });

    test('48dp targets for every item', async ({ page }) => {
      for (const id of ['element-suite', 'react-frame', 'static-frame']) {
        const items = page
          .getByTestId(id)
          .locator('.m3e-navigation-suite > nav .m3e-navigation-item:visible');
        expect(await items.count(), id).toBe(4);
        for (const item of await items.all()) {
          const b = await box(item);
          expect(b.width, id).toBeGreaterThanOrEqual(48);
          expect(b.height, id).toBeGreaterThanOrEqual(48);
        }
      }
    });
  });
}

test.describe('layout (NavigationSuiteScaffoldLayout)', () => {
  test('bar types: the bar at the bottom, the content above it, the FAB 16dp above the bar at the end', async ({
    page,
  }) => {
    await open(page, SIZES.compact);
    const frame = await box(page.getByTestId('element-frame'));
    const suite = elementSuite(page);
    const bar = await box(navOf(suite));
    expect(bar.height).toBeCloseTo(64, 0);
    expect(bar.width).toBeCloseTo(frame.width, 0);
    expect(bar.y + bar.height).toBeCloseTo(frame.y + frame.height, 0);
    const content = await box(suite.locator('.m3e-navigation-suite__content'));
    expect(content.y).toBeCloseTo(frame.y, 0);
    expect(content.height).toBeCloseTo(frame.height - 64, 0);
    const fab = await box(page.getByTestId('element-fab'));
    expect(fab.x + fab.width).toBeCloseTo(frame.x + frame.width - 16, 0);
    expect(fab.y + fab.height).toBeCloseTo(bar.y - 16, 0);
  });

  test('rail types: the rail at the inline start, full height, the FAB in its header; content beside', async ({
    page,
  }) => {
    await open(page, SIZES.medium);
    const frame = await box(page.getByTestId('element-frame'));
    const suite = elementSuite(page);
    const rail = await box(navOf(suite));
    expect(rail.x).toBeCloseTo(frame.x, 0);
    expect(rail.width).toBeCloseTo(96, 0);
    expect(rail.height).toBeCloseTo(frame.height, 0);
    const content = await box(suite.locator('.m3e-navigation-suite__content'));
    expect(content.x).toBeCloseTo(rail.x + rail.width, 0);
    expect(content.width).toBeCloseTo(frame.width - 96, 0);
    await expect(
      navOf(suite).locator('.m3e-wide-navigation-rail__header').getByTestId('element-fab'),
    ).toBeVisible();
    // The FAB lines up with the item pills (20dp from the start: WNRItemHorizontalPadding).
    const fab = await box(page.getByTestId('element-fab'));
    expect(fab.x - rail.x).toBeCloseTo(20, 0);
  });

  test('large: the expanded rail (220–360dp), the content beside it', async ({ page }) => {
    await open(page, SIZES.large);
    const rail = await box(navOf(elementSuite(page)));
    expect(rail.width).toBeGreaterThanOrEqual(220);
    expect(rail.width).toBeLessThanOrEqual(360);
    const content = await box(elementSuite(page).locator('.m3e-navigation-suite__content'));
    expect(content.x).toBeCloseTo(rail.x + rail.width, 0);
  });

  test('RTL: the rail at the inline start (right)', async ({ page }) => {
    await open(page, SIZES.medium);
    await page.getByTestId('element-frame').evaluate((el) => {
      el.setAttribute('dir', 'rtl');
    });
    const frame = await box(page.getByTestId('element-frame'));
    const rail = await box(navOf(elementSuite(page)));
    expect(rail.x + rail.width).toBeCloseTo(frame.x + frame.width, 0);
  });

  test('React overrides: a fixed drawer type and the drawer at large widths', async ({ page }) => {
    await open(page, SIZES.large);
    await page.getByTestId('react-drawer').check();
    const drawer = reactSuite(page).locator(':scope > .m3e-navigation-drawer');
    await expect(drawer).toBeVisible();
    expect((await box(drawer.locator('nav'))).width).toBeCloseTo(360, 0);
    await expect(drawer.locator('.m3e-navigation-drawer-item')).toHaveCount(4);
    await expect(drawer.getByTestId('react-fab')).toBeVisible();
    await page.getByTestId('react-type').selectOption('short-navigation-bar-compact');
    await expect(navOf(reactSuite(page))).toHaveAttribute('class', 'm3e-short-navigation-bar');
  });
});

test.describe('switching on resize', () => {
  test('keeps the selection and the focused item (element, React)', async ({ page }) => {
    await open(page, SIZES.medium);
    for (const suite of [elementSuite(page), reactSuite(page)]) {
      const search = navOf(suite).locator('.m3e-navigation-item').nth(1);
      await search.click();
      await expect(search).toHaveAttribute('aria-current', 'page');
    }
    await expect(page.getByTestId('element-selected')).toHaveText('search');
    await expect(page.getByTestId('react-selected')).toHaveText('search');
    // Keyboard focus on the element's item, then the window narrows to a bar and widens again.
    const item = navOf(elementSuite(page)).locator('.m3e-navigation-item').nth(1);
    await item.focus();
    const handle = await item.elementHandle();
    for (const size of [SIZES.compact, SIZES.large, SIZES['compact-height'], SIZES.medium]) {
      await page.setViewportSize(size);
      await expect
        .poll(() => page.evaluate((el) => document.activeElement === el, handle))
        .toBe(true);
      for (const suite of [elementSuite(page), reactSuite(page)]) {
        await expect(navOf(suite).locator('[aria-current="page"]')).toHaveCount(1);
        await expect(navOf(suite).locator('.m3e-navigation-item').nth(1)).toHaveAttribute(
          'aria-current',
          'page',
        );
      }
    }
  });

  test('Tab order: the navigation, then the content', async ({ page }) => {
    await open(page, SIZES.compact);
    const items = navOf(elementSuite(page)).locator('.m3e-navigation-item');
    await items.nth(3).focus();
    await page.keyboard.press('Tab');
    // A bar's primary action follows the navigation, then the content.
    await expect(page.getByTestId('element-fab')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('element-toggle')).toBeFocused();
  });
});

test.describe('show / hide', () => {
  test('hides and shows: the content takes the space; hidden navigation is not focusable', async ({
    page,
  }) => {
    await open(page, SIZES.compact);
    const suite = elementSuite(page);
    await page.getByTestId('element-toggle').click();
    await expect(page.getByTestId('element-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(suite).toHaveClass(/m3e-navigation-suite--navigation-hidden/);
    await rests(suite);
    await expect(navOf(suite)).toBeHidden();
    const frame = await box(page.getByTestId('element-frame'));
    const content = await box(suite.locator('.m3e-navigation-suite__content'));
    expect(content.height).toBeCloseTo(frame.height, 0);
    // The FAB stays, 16dp above the bottom.
    const fab = await box(page.getByTestId('element-fab'));
    expect(fab.y + fab.height).toBeCloseTo(frame.y + frame.height - 16, 0);
    await expect(page.getByTestId('element-frame')).toHaveScreenshot('navigation-suite-hidden.png');
    await page.getByTestId('element-toggle').click();
    await rests(suite);
    await expect(navOf(suite)).toBeVisible();
    expect((await box(navOf(suite))).y + 64).toBeCloseTo(frame.y + frame.height, 0);
  });

  test('React: isNavigationHidden hides the rail', async ({ page }) => {
    await open(page, SIZES.medium);
    await page.getByTestId('react-toggle').click();
    await rests(reactSuite(page));
    await expect(navOf(reactSuite(page))).toBeHidden();
    const frame = await box(page.getByTestId('react-frame'));
    const content = await box(reactSuite(page).locator('.m3e-navigation-suite__content'));
    expect(content.x).toBeCloseTo(frame.x, 0);
  });

  test('animating reads no layout', async ({ page }) => {
    await open(page, SIZES.medium);
    await page.evaluate(() => {
      const w = window as unknown as { layoutReads: number };
      w.layoutReads = 0;
      for (const name of ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop']) {
        const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)!;
        Object.defineProperty(HTMLElement.prototype, name, {
          ...d,
          get(this: unknown) {
            w.layoutReads++;
            return (d.get as (this: unknown) => unknown).call(this);
          },
        });
      }
      for (const name of ['getBoundingClientRect', 'getClientRects'] as const) {
        const original = Object.getOwnPropertyDescriptor(Element.prototype, name)!.value as (
          this: Element,
        ) => unknown;
        Object.defineProperty(Element.prototype, name, {
          configurable: true,
          value(this: Element) {
            w.layoutReads++;
            return original.call(this);
          },
        });
      }
    });
    const { frames, reads } = await page.evaluate(async () => {
      const host = document.querySelector<SuiteHost>('[data-testid="element-suite"]')!;
      const suite = host.querySelector('.m3e-navigation-suite')!;
      const w = window as unknown as { layoutReads: number };
      host.hideNavigation();
      await new Promise((resolve) => setTimeout(resolve, 0));
      let count = 0;
      while (suite.hasAttribute('data-animating') && count < 600) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        count++;
      }
      return { frames: count, reads: w.layoutReads };
    });
    expect(frames).toBeGreaterThan(2);
    expect(reads).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('show / hide jump (no frames)', async ({ page }) => {
    await open(page, SIZES.medium);
    const frames = await page.getByTestId('element-suite').evaluate(async (host) => {
      const suite = host.querySelector('.m3e-navigation-suite')!;
      const count = async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        let n = 0;
        while (suite.hasAttribute('data-animating') && n < 100) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          n++;
        }
        return n;
      };
      (host as SuiteHost).hideNavigation();
      const hiding = await count();
      (host as SuiteHost).showNavigation();
      const showing = await count();
      return { hiding, showing };
    });
    expect(frames).toEqual({ hiding: 0, showing: 0 });
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the bar and the rail keep a boundary against the content', async ({ page }) => {
    await open(page, SIZES.compact);
    expect(
      await navOf(elementSuite(page)).evaluate((el) => getComputedStyle(el).borderTopStyle),
    ).toBe('solid');
    await page.setViewportSize(SIZES.medium);
    await expect(navOf(elementSuite(page))).toHaveClass('m3e-wide-navigation-rail');
    expect(
      await navOf(elementSuite(page)).evaluate((el) => getComputedStyle(el).borderInlineEndStyle),
    ).toBe('solid');
  });
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await open(page, SIZES.medium);
  });

  /**
   * Calls `action` on the element suite inside a frame and records `--_m3e-ns-offset` (px) each
   * 16ms frame after it; `then` runs at frame `at` (e.g. the opposite action).
   */
  async function trace(
    page: Page,
    action: 'hideNavigation' | 'showNavigation',
    frames: number,
    then?: { at: number; action: 'hideNavigation' | 'showNavigation' },
  ): Promise<number[]> {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([first, n, second]) => {
        const host = document.querySelector<SuiteHost>('[data-testid="element-suite"]')!;
        const out: number[] = [];
        (window as unknown as { suiteTrace: number[] }).suiteTrace = out;
        const frame = () => {
          const suite = host.querySelector<HTMLElement>('.m3e-navigation-suite')!;
          const value = suite.style.getPropertyValue('--_m3e-ns-offset');
          out.push(value === '' ? Number.NaN : Number.parseFloat(value));
          if (second?.at === out.length) host[second.action]();
          if (out.length < n) requestAnimationFrame(frame);
        };
        requestAnimationFrame(() => {
          host[first]();
          queueMicrotask(() => {
            requestAnimationFrame(frame);
          });
        });
      },
      [action, frames, then ?? null] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { suiteTrace: number[] }).suiteTrace);
  }

  test('hide: the rail leaves on spring(0.9, 700) from the frame after the state moves', async ({
    page,
  }) => {
    const spec = await visibilitySpring(page);
    expect(spec).toEqual({ dampingRatio: 0.9, stiffness: 700 });
    const frames = await trace(page, 'hideNavigation', 30);
    // Frame 0: currentValue just left Visible, the layout's spring starts at progress 1.
    expect(frames[0]).toBe(0);
    for (let i = 1; i < 12; i++) {
      expect(frames[i]!, `frame ${String(i)}`).toBeCloseTo(
        96 - Math.trunc(96 * springValue(spec, 16 * i, 1, 0)),
        -0.5,
      );
    }
    expect(frames.slice(20).some((f) => Number.isNaN(f))).toBe(true);
  });

  test('show: the rail waits for the state spring to settle, then slides in', async ({ page }) => {
    const spec = await visibilitySpring(page);
    await page.getByTestId('element-suite').evaluate((host) => {
      (host as SuiteHost).hideNavigation();
    });
    await page.clock.runFor(1000);
    await rests(elementSuite(page));
    const frames = await trace(page, 'showNavigation', 40);
    const wait = springDurationMillis(spec, 0, 1, 0, 0.01);
    const out = frames.filter((f) => f === 96).length;
    // Out for the state spring's duration (Compose's currentValue stays Hidden until exactly 1).
    expect(out * 16).toBeGreaterThanOrEqual(wait - 32);
    expect(out * 16).toBeLessThanOrEqual(wait + 32);
    const after = frames.slice(out + 1).filter(Number.isFinite);
    expect(after.length).toBeGreaterThan(3);
    expect(after[0]!).toBeLessThan(96);
    expect(frames.at(-1)).toBeNaN();
  });

  test('a show during the hide keeps the layout spring going (velocity kept, no jump)', async ({
    page,
  }) => {
    const frames = await trace(page, 'hideNavigation', 40, { at: 5, action: 'showNavigation' });
    // The layout keeps moving out after the reversal (currentValue is still Hidden).
    for (let i = 5; i < 9; i++) {
      expect(frames[i + 1]!, `frame ${String(i + 1)}`).toBeGreaterThanOrEqual(frames[i]!);
    }
    expect(Math.max(...frames.filter(Number.isFinite))).toBeLessThanOrEqual(96);
    expect(frames.at(-1)).toBeNaN();
  });
});
