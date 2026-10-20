import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Canonical layouts (COMPONENT_SPEC §16a): list-detail, supporting pane and feed sized by their
// own width (container queries; the docs page's frames stand in for the window size classes),
// acceptance + light/dark × 3 browsers baselines, axe at every width, single-pane navigation with
// keyboard and pointer, focus, RTL, forced colors, reduced motion, the drag handle and
// clock-driven pane motion traces.
const box = async (el: Locator) => (await el.boundingBox())!;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
type LayoutHost = HTMLElement & {
  navigateTo(pane: string, key?: unknown): void;
  navigateBack(): boolean;
  scaffoldValue: Record<string, string>;
};

/** Frame widths (CSS px), one per window size class. */
const WIDTHS = {
  compact: 360,
  medium: 700,
  expanded: 1000,
  large: 1300,
  'extra-large': 1700,
} as const;
type WidthClass = keyof typeof WIDTHS;
/**
 * Panes side by side with an extra pane present: by default m3.material.io's Breakpoints (owner
 * decision 2026-10-18); `pane-rule="compose"` / `--compose` follows Compose's
 * calculatePaneScaffoldDirective (three from large).
 */
const PANES: Record<WidthClass, number> = {
  compact: 1,
  medium: 1,
  expanded: 2,
  large: 2,
  'extra-large': 3,
};
const COMPOSE: Record<WidthClass, number> = { ...PANES, large: 3 };

// Wide enough for the widest frame: the layouts follow their frames, not the window.
test.use({ viewport: { width: 1800, height: 1000 } });

const panesOf = (page: Page, frame: string) =>
  page
    .getByTestId(frame)
    .locator('.m3e-pane-scaffold')
    .first()
    .locator(':scope > .m3e-pane-scaffold__pane');
const visiblePanes = (page: Page, frame: string) =>
  panesOf(page, frame).evaluateAll((panes: Element[]) =>
    panes
      .filter((p) => getComputedStyle(p).display !== 'none')
      .map((p) => p.className.replace(/^.*--/, '')),
  );
const scaffoldOf = (page: Page, id: string) =>
  page.getByTestId(id).locator('.m3e-pane-scaffold').first();
const rests = (el: Locator) =>
  expect.poll(() => el.evaluate((node) => node.hasAttribute('data-animating'))).toBe(false);

async function open(page: Page, width: number = WIDTHS.expanded) {
  await page.goto('/components/canonical-layouts/');
  await page.evaluate(() => document.fonts.ready);
  await expect(scaffoldOf(page, 'react-frame')).toHaveAttribute('data-managed', '');
  await expect(scaffoldOf(page, 'react-supporting-frame')).toHaveAttribute('data-managed', '');
  await expect(page.getByTestId('react-feed')).toBeVisible();
  // The pane motion and drag handle entries load right after the layouts start.
  await page.waitForLoadState('networkidle');
  await setWidth(page, width);
}

async function setWidth(page: Page, width: number) {
  await page.locator(`.docs-layout-widths button[data-width="${String(width)}"]`).click();
  await expect(page.getByTestId('list-detail-frame')).toHaveCSS('width', `${String(width)}px`);
  await rests(scaffoldOf(page, 'list-detail'));
}

for (const [name, width] of Object.entries(WIDTHS) as [WidthClass, number][]) {
  test.describe(`${name} layout (${String(width)}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, width);
    });

    test('element, React and the CSS-only layout show the panes the directive allows', async ({
      page,
    }) => {
      const n = PANES[name];
      for (const frame of ['list-detail-frame', 'react-frame', 'static-frame']) {
        expect((await visiblePanes(page, frame)).length, frame).toBe(n);
      }
      // One pane: the list (element, React: their first destination) / the detail (CSS-only).
      if (n === 1) {
        expect(await visiblePanes(page, 'list-detail-frame')).toEqual(['secondary']);
        expect(await visiblePanes(page, 'react-frame')).toEqual(['secondary']);
        expect(await visiblePanes(page, 'static-frame')).toEqual(['primary']);
      }
      // Compose's rule (opt-in): three panes from large, element and CSS-only alike.
      await page.getByTestId('list-detail').evaluate((host) => {
        host.setAttribute('pane-rule', 'compose');
      });
      await expect(scaffoldOf(page, 'list-detail')).toHaveClass(/\bm3e-pane-scaffold--compose\b/);
      await page
        .getByTestId('static-frame')
        .locator('.m3e-pane-scaffold')
        .evaluate((el) => {
          el.classList.add('m3e-pane-scaffold--compose');
        });
      for (const frame of ['list-detail-frame', 'static-frame']) {
        await expect
          .poll(async () => (await visiblePanes(page, frame)).length, frame)
          .toBe(COMPOSE[name]);
      }
    });

    test('pane widths: preferred 360 / 412dp, the detail takes the rest, 24dp apart', async ({
      page,
    }) => {
      if (PANES[name] === 1) {
        const pane = await box(panesOf(page, 'list-detail-frame').first());
        expect(pane.width).toBeCloseTo(width, 0);
        return;
      }
      const [list, detail] = await Promise.all(
        [0, 1].map((i) => box(panesOf(page, 'list-detail-frame').nth(i))),
      );
      // 360dp, 412dp from large; the detail takes what is left beside the other panes.
      const preferred = name === 'expanded' ? 360 : 412;
      const others = PANES[name] - 1;
      expect(list!.width).toBeCloseTo(preferred, 0);
      expect(detail!.width).toBeCloseTo(width - others * (preferred + 24), 0);
      expect(detail!.x - (list!.x + list!.width)).toBeCloseTo(24, 0);
    });

    test('has no axe violations', async ({ page }) => {
      await page.getByTestId('list-detail').evaluate((host) => {
        (host as LayoutHost).navigateTo('detail', '1');
      });
      await rests(scaffoldOf(page, 'list-detail'));
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
    });

    // Frames, not the full page: a full-page capture resizes the viewport.
    test('matches the visual baselines (list only / detail shown)', async ({ page }) => {
      await page.mouse.move(0, 0);
      await expect(page.getByTestId('list-detail-frame')).toHaveScreenshot(
        `canonical-layouts-${name}-list.png`,
      );
      await page.getByTestId('list-detail').evaluate((host) => {
        (host as LayoutHost).navigateTo('detail', '1');
      });
      await rests(scaffoldOf(page, 'list-detail'));
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
      await expect(page.getByTestId('list-detail-frame')).toHaveScreenshot(
        `canonical-layouts-${name}-detail.png`,
      );
      if (name === 'medium' || name === 'expanded') {
        await expect(page.getByTestId('supporting-frame')).toHaveScreenshot(
          `canonical-layouts-${name}-supporting.png`,
        );
      }
      if (name === 'compact' || name === 'medium' || name === 'large') {
        await expect(page.getByTestId('feed-frame')).toHaveScreenshot(
          `canonical-layouts-${name}-feed.png`,
        );
      }
    });
  });
}

test.describe('single-pane navigation (list → detail → back)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, WIDTHS.compact);
  });

  test('keyboard: Enter on an item shows and focuses the detail; Enter on back returns', async ({
    page,
  }) => {
    const host = page.getByTestId('list-detail');
    const item = host.locator('.docs-layout-item').nth(1);
    const back = page.getByTestId('list-detail-back');
    await expect(back).toBeHidden();
    await item.focus();
    await page.keyboard.press('Enter');
    await rests(scaffoldOf(page, 'list-detail'));
    expect(await visiblePanes(page, 'list-detail-frame')).toEqual(['primary']);
    await expect(host.locator('.m3e-pane-scaffold__pane--primary')).toBeFocused();
    await expect(page.getByTestId('list-detail-title')).toHaveText('Summer BBQ');
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    await page.keyboard.press('Enter');
    await rests(scaffoldOf(page, 'list-detail'));
    expect(await visiblePanes(page, 'list-detail-frame')).toEqual(['secondary']);
    await expect(item).toBeFocused();
    await expect(back).toBeHidden();
  });

  test('pointer: the React navigator, the supporting pane and the extra pane', async ({ page }) => {
    const react = page.getByTestId('react-frame');
    await react.locator('.docs-layout-item').first().click();
    await rests(scaffoldOf(page, 'react-frame'));
    expect(await visiblePanes(page, 'react-frame')).toEqual(['primary']);
    await page.getByTestId('react-back').click();
    await rests(scaffoldOf(page, 'react-frame'));
    expect(await visiblePanes(page, 'react-frame')).toEqual(['secondary']);

    await page.getByTestId('supporting-open').click();
    await rests(scaffoldOf(page, 'supporting'));
    expect(await visiblePanes(page, 'supporting-frame')).toEqual(['secondary']);

    await page.getByTestId('list-detail').locator('.docs-layout-item').first().click();
    await page.getByTestId('list-detail-extra').click();
    await rests(scaffoldOf(page, 'list-detail'));
    expect(await visiblePanes(page, 'list-detail-frame')).toEqual(['tertiary']);
  });

  test('two panes: the item shows in the detail, the list marks it', async ({ page }) => {
    await setWidth(page, WIDTHS.expanded);
    const item = page.getByTestId('list-detail').locator('.docs-layout-item').nth(2);
    await item.click();
    await expect(page.getByTestId('list-detail-title')).toHaveText('Oui oui');
    await expect(item).toHaveAttribute('aria-current', 'true');
    // Back has nothing to go to (the scaffold value would not change): hidden.
    await expect(page.getByTestId('list-detail-back')).toBeHidden();
  });
});

test.describe('container queries read the layout’s own width', () => {
  test('inside a navigation suite beside the expanded rail: one pane at a 1000px frame', async ({
    page,
  }) => {
    await open(page, WIDTHS.expanded);
    expect((await visiblePanes(page, 'list-detail-frame')).length).toBe(2);
    expect((await visiblePanes(page, 'suite-frame')).length).toBe(1);
    const content = await box(page.getByTestId('suite-frame').locator('.m3e-layout'));
    expect(content.width).toBeLessThan(840);
  });
});

test.describe('landmarks and targets', () => {
  test('every pane is a named region; the drag handle is a named separator ≥ 48dp', async ({
    page,
  }) => {
    await open(page, WIDTHS.expanded);
    const panes = panesOf(page, 'list-detail-frame');
    await expect(panes.nth(0)).toHaveAttribute('role', 'region');
    await expect(panes.nth(0)).toHaveAttribute('aria-label', 'Inbox');
    await expect(panes.nth(1)).toHaveAttribute('aria-label', 'Message');
    const handle = page.getByRole('separator', { name: 'Pane expansion drag handle' });
    await expect(handle).toBeVisible();
    const b = await box(handle);
    expect(b.width).toBeGreaterThanOrEqual(48);
    expect(b.height).toBeGreaterThanOrEqual(48);
    // Centred on the spacer between the panes (getSpacerMiddleOffsetX).
    const list = await box(panes.nth(0));
    expect(b.x + b.width / 2).toBeCloseTo(list.x + list.width + 12, 0);
  });
});

test.describe('drag handle (PaneExpansionState)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, WIDTHS.expanded);
  });

  test('dragging moves the split; releasing settles on the closest anchor', async ({ page }) => {
    const handle = page.getByRole('separator', { name: 'Pane expansion drag handle' });
    const frame = await box(page.getByTestId('list-detail-frame'));
    const b = await box(handle);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(frame.x + 470, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await rests(scaffoldOf(page, 'list-detail'));
    // The closest anchor to 470px is 50 % (500px): the list is 500 − 12 = 488px wide.
    const list = await box(panesOf(page, 'list-detail-frame').nth(0));
    expect(list.width).toBeCloseTo(488, 0);
    await expect(handle).toHaveAttribute('aria-valuenow', '50');
  });

  test('keyboard: End / Home collapse a pane, Enter moves to the next anchor', async ({ page }) => {
    const handle = page.getByRole('separator', { name: 'Pane expansion drag handle' });
    await handle.focus();
    await page.keyboard.press('End');
    await rests(scaffoldOf(page, 'list-detail'));
    expect(await visiblePanes(page, 'list-detail-frame')).toEqual(['secondary']);
    await page.keyboard.press('Home');
    await rests(scaffoldOf(page, 'list-detail'));
    expect(await visiblePanes(page, 'list-detail-frame')).toEqual(['primary']);
    await page.keyboard.press('Enter');
    await rests(scaffoldOf(page, 'list-detail'));
    // From 0 the next anchor is 240dp from the start.
    const list = await box(panesOf(page, 'list-detail-frame').nth(0));
    expect(list.width).toBeCloseTo(228, 0);
  });
});

test.describe('RTL', () => {
  test('panes mirror: the list at the inline start (right)', async ({ page }) => {
    await open(page, WIDTHS.expanded);
    await page.getByTestId('list-detail-frame').evaluate((el) => {
      el.setAttribute('dir', 'rtl');
    });
    const frame = await box(page.getByTestId('list-detail-frame'));
    const list = await box(panesOf(page, 'list-detail-frame').nth(0));
    expect(list.x + list.width).toBeCloseTo(frame.x + frame.width, 0);
    expect(list.width).toBeCloseTo(360, 0);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('pane boundaries stay visible', async ({ page }) => {
    await open(page, WIDTHS.expanded);
    const pane = panesOf(page, 'list-detail-frame').nth(0);
    expect(await pane.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('navigation jumps (no frames)', async ({ page }) => {
    await open(page, WIDTHS.compact);
    const frames = await page.getByTestId('list-detail').evaluate(async (host) => {
      const scaffold = host.querySelector('.m3e-pane-scaffold')!;
      (host as LayoutHost).navigateTo('detail', '1');
      let n = 0;
      while (scaffold.hasAttribute('data-animating') && n < 100) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        n++;
      }
      return n;
    });
    expect(frames).toBe(0);
  });
});

test.describe('pane motion (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await open(page, WIDTHS.compact);
  });

  const token = (page: Page, name: string) =>
    page.evaluate(
      (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
      name,
    );

  /** Navigates inside a frame and records the detail / list pane x (px) every 16ms frame. */
  async function trace(page: Page, frames: number, backAt?: number) {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([n, at]) => {
        const host = document.querySelector<LayoutHost>('[data-testid="list-detail"]')!;
        const read = (role: string) => {
          const v = host
            .querySelector<HTMLElement>(`.m3e-pane-scaffold__pane--${role}`)!
            .style.getPropertyValue('--_m3e-pane-x');
          return v === '' ? Number.NaN : Number.parseFloat(v);
        };
        const out: [number, number][] = [];
        (window as unknown as { paneTrace: [number, number][] }).paneTrace = out;
        const frame = () => {
          out.push([read('primary'), read('secondary')]);
          if (at === out.length) host.navigateBack();
          if (out.length < n) requestAnimationFrame(frame);
        };
        requestAnimationFrame(() => {
          host.navigateTo('detail', '1');
          requestAnimationFrame(frame);
        });
      },
      [frames, backAt ?? -1] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { paneTrace: [number, number][] }).paneTrace);
  }

  test('list → detail: the detail enters from the right, the list exits left, on spring(0.8, 380)', async ({
    page,
  }) => {
    const spec = {
      dampingRatio: Number(await token(page, '--m3e-comp-pane-scaffold-motion-damping-ratio')),
      stiffness: Number(await token(page, '--m3e-comp-pane-scaffold-motion-stiffness')),
    };
    expect(spec).toEqual({ dampingRatio: 0.8, stiffness: 380 });
    const frames = await trace(page, 70);
    // Frame i is 16·(i + 1)ms after the navigation (it ran one frame before the first record).
    for (let i = 0; i < 20; i++) {
      const t = 16 * (i + 1);
      expect(frames[i]![0], `detail, frame ${String(i)}`).toBeCloseTo(
        springValue(spec, t, 360, 0),
        -0.5,
      );
      expect(frames[i]![1], `list, frame ${String(i)}`).toBeCloseTo(
        springValue(spec, t, 0, -360),
        -0.5,
      );
    }
    // Overshoot (ζ < 1): the detail passes 0 before settling, then the scaffold rests.
    expect(frames.some(([x]) => x < 0)).toBe(true);
    expect(Number.isNaN(frames.at(-1)![0])).toBe(true);
  });

  test('interruptible: going back mid-flight reverses from the current position and velocity', async ({
    page,
  }) => {
    const frames = await trace(page, 40, 6);
    const xs = frames.map(([x]) => x);
    // Moving left until the back, then (after keeping its velocity briefly) back to the right.
    expect(xs[5]!).toBeLessThan(xs[0]!);
    const after = xs.slice(6, 20).filter(Number.isFinite);
    const min = Math.min(...after);
    expect(min).toBeLessThanOrEqual(xs[5]!); // keeps going left for a moment (velocity kept)
    expect(after.at(-1)!).toBeGreaterThan(min); // then heads back out to the right
    // No jump at the reversal.
    expect(Math.abs(xs[6]! - xs[5]!)).toBeLessThan(80);
  });
});

test.describe('no layout thrash', () => {
  test('animating reads no layout', async ({ page }) => {
    await open(page, WIDTHS.compact);
    const reads = await page.evaluate(async () => {
      const host = document.querySelector<LayoutHost>('[data-testid="list-detail"]')!;
      const scaffold = host.querySelector('.m3e-pane-scaffold')!;
      let count = 0;
      host.navigateTo('detail', '1');
      for (const name of ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight']) {
        const d =
          Object.getOwnPropertyDescriptor(Element.prototype, name) ??
          Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)!;
        Object.defineProperty(HTMLElement.prototype, name, {
          ...d,
          get(this: unknown) {
            count++;
            return (d.get as (this: unknown) => unknown).call(this);
          },
        });
      }
      const original = Object.getOwnPropertyDescriptor(Element.prototype, 'getBoundingClientRect')!
        .value as (this: Element) => DOMRect;
      Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
        configurable: true,
        value(this: Element) {
          count++;
          return original.call(this);
        },
      });
      let frames = 0;
      while (scaffold.hasAttribute('data-animating') && frames < 600) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        frames++;
      }
      return { count, frames };
    });
    expect(reads.frames).toBeGreaterThan(2);
    expect(reads.count).toBe(0);
  });
});
