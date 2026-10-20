import AxeBuilder from '@axe-core/playwright';
import { springValue, springVelocity } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { expectComposePlacement, placement } from './badge-placement.js';

// Tabs (COMPONENT_SPEC §17): static primary / secondary rows (fixed, scrollable; text, icon,
// icon + text, leading icon), the element rows with panels and React. Acceptance + light/dark ×
// 3 browsers baselines, axe, keyboard, scrolling and clock-driven spring traces.
const box = async (el: Locator) => (await el.boundingBox())!;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const spring = async (page: Page, name: string) => ({
  dampingRatio: Number(await token(page, `--m3e-sys-motion-spring-${name}-damping-ratio`)),
  stiffness: Number(await token(page, `--m3e-sys-motion-spring-${name}-stiffness`)),
});
type TabsHost = HTMLElement & { selected: string | null };
const row = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-tabs');
const tabs = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-tab');
/** Waits until a row rests (TabsLayout removed data-animating). */
const rests = (el: Locator) =>
  expect.poll(() => el.evaluate((node) => node.hasAttribute('data-animating'))).toBe(false);
/** A resolved color, for comparing with computed styles. */
const color = (page: Page, value: string) =>
  page.evaluate((v) => {
    const el = document.createElement('div');
    el.style.color = v;
    document.body.append(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }, value);

/**
 * The indicator the selected tab of `rowLocator` draws (primary: under its content; secondary:
 * across the tab), in page coordinates, from the pseudo element's used values.
 */
const indicator = (rowLocator: Locator) =>
  rowLocator.evaluate((root) => {
    const tab = root.querySelector<HTMLElement>('.m3e-tab[aria-selected="true"]')!;
    const host = root.classList.contains('m3e-tabs--secondary')
      ? tab
      : tab.querySelector<HTMLElement>('.m3e-tab__content')!;
    const s = getComputedStyle(host, '::after');
    const r = host.getBoundingClientRect();
    const t = getComputedStyle(tab).borderBottomWidth;
    return {
      x: r.left + Number.parseFloat(s.left) + (Number.parseFloat(s.translate) || 0),
      width: Number.parseFloat(s.width),
      height: Number.parseFloat(s.height),
      bottom: r.bottom - Number.parseFloat(s.bottom),
      radius: s.borderTopLeftRadius,
      color: s.backgroundColor,
      tab: tab.getBoundingClientRect().toJSON() as DOMRect,
      content: tab.querySelector('.m3e-tab__content')!.getBoundingClientRect().toJSON() as DOMRect,
      border: t,
    };
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/tabs/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-tabs').locator('.m3e-tab')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('tabs.png', { fullPage: true });
});

test('fixed rows: equal tabs; heights 48 (text / icon / leading), 72 (icon + text), 60 (two lines)', async ({
  page,
}) => {
  for (const [id, height] of [
    ['static-primary-icon', 48],
    ['static-primary-icon-text', 72],
    ['static-primary-leading', 48],
    ['static-secondary-icon', 48],
    ['static-secondary-icon-text', 72],
    // "Tab 3 with lots of text" wraps: the content (40) + IconDistanceFromBaseline (20).
    ['static-primary-text', 60],
  ] as const) {
    const frame = await box(page.getByTestId(id));
    const all = await tabs(page, id).all();
    for (const [i, tab] of all.entries()) {
      const b = await box(tab);
      expect(b.width, `${id} ${String(i)}`).toBeCloseTo(frame.width / all.length, 0);
      expect(b.x).toBeCloseTo(frame.x + (i * frame.width) / all.length, 0);
      expect(b.height, `${id} ${String(i)}`).toBeCloseTo(height, 0);
    }
  }
});

test('icon + text: icon 11dp from the top (LargeTabHeight − icon − line − 17dp); label at the bottom', async ({
  page,
}) => {
  const tab = tabs(page, 'static-primary-icon-text').first();
  const t = await box(tab);
  const icon = await box(tab.locator('.m3e-tab__icon'));
  const label = await box(tab.locator('.m3e-tab__label'));
  expect(icon.y - t.y).toBeCloseTo(11, 0);
  expect(icon.height).toBeCloseTo(24, 0);
  // The label line box (20dp) ends 17dp − (its baseline-to-bottom distance) above the tab bottom.
  expect(label.height).toBeCloseTo(20, 0);
  expect(t.y + t.height - (label.y + label.height)).toBeGreaterThan(10);
  expect(t.y + t.height - (label.y + label.height)).toBeLessThan(13);
});

test('leading icon tabs: icon, 8dp, label, centred in 48dp', async ({ page }) => {
  const tab = tabs(page, 'static-primary-leading').first();
  const t = await box(tab);
  const icon = await box(tab.locator('.m3e-tab__icon'));
  const label = await box(tab.locator('.m3e-tab__label'));
  expect(label.x - (icon.x + icon.width)).toBeCloseTo(8, 0);
  expect(icon.y + icon.height / 2).toBeCloseTo(t.y + t.height / 2, 0);
  expect((icon.x + label.x + label.width) / 2).toBeCloseTo(t.x + t.width / 2, 0);
});

test('scrollable rows: 52dp edge padding, tabs at least 90dp, label + 2 × 16dp wide', async ({
  page,
}) => {
  for (const id of ['static-primary-scrollable', 'static-secondary-scrollable']) {
    const frame = await box(page.getByTestId(id));
    const all = await tabs(page, id).all();
    let x = frame.x + 52;
    for (const tab of all.slice(0, 3)) {
      const b = await box(tab);
      const label = await box(tab.locator('.m3e-tab__label'));
      expect(b.x).toBeCloseTo(x, 0);
      expect(b.width).toBeCloseTo(Math.max(90, label.width + 32), 0);
      x += b.width;
    }
    const list = page.getByTestId(id).locator('.m3e-tabs__list');
    // Edge padding after the last tab too.
    const last = await box(all[all.length - 1]!);
    const scroll = await list.evaluate((el) => ({ w: el.scrollWidth, left: el.scrollLeft }));
    expect(scroll.w).toBeCloseTo(last.x - frame.x + last.width + 52 + scroll.left, 0);
  }
});

test('indicators: primary = content width (≥ 24dp), 3dp, rounded; secondary = tab width, square; divider', async ({
  page,
}) => {
  const primary = await color(page, 'var(--m3e-sys-color-primary)');
  for (const id of ['static-primary-text', 'static-primary-icon', 'static-primary-icon-text']) {
    const i = await indicator(row(page, id));
    expect(i.width, id).toBeCloseTo(Math.max(i.content.width, 24), 0);
    expect(i.x + i.width / 2).toBeCloseTo(i.tab.x + i.tab.width / 2, 0);
    expect(i.height).toBe(3);
    expect(i.bottom).toBeCloseTo(i.tab.y + i.tab.height, 0);
    expect(i.radius).toBe('3px');
    expect(i.color).toBe(primary);
  }
  for (const id of ['static-secondary-text', 'static-secondary-scrollable']) {
    const i = await indicator(row(page, id));
    expect(i.width, id).toBeCloseTo(i.tab.width, 0);
    expect(i.x).toBeCloseTo(i.tab.x, 0);
    expect(i.height).toBe(3);
    expect(i.radius).toBe('0px');
    expect(i.color).toBe(primary);
  }
  // The divider: 1dp outline-variant along the bottom, inside the row.
  const divider = await row(page, 'static-primary-text').evaluate((el) => {
    const s = getComputedStyle(el, '::before');
    return { height: s.height, color: s.backgroundColor, bottom: s.bottom };
  });
  expect(divider).toEqual({
    height: '1px',
    color: await color(page, 'var(--m3e-sys-color-outline-variant)'),
    bottom: '0px',
  });
});

test('colors: the row content color for selected and unselected tabs (Compose defaults)', async ({
  page,
}) => {
  const primary = await color(page, 'var(--m3e-sys-color-primary)');
  const onSurface = await color(page, 'var(--m3e-sys-color-on-surface)');
  for (const tab of await tabs(page, 'static-primary-text').all()) {
    expect(await tab.evaluate((el) => getComputedStyle(el).color)).toBe(primary);
  }
  for (const tab of await tabs(page, 'static-secondary-text').all()) {
    expect(await tab.evaluate((el) => getComputedStyle(el).color)).toBe(onSurface);
  }
  expect(
    await tabs(page, 'static-primary-text')
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe('14px');
});

test('48dp targets', async ({ page }) => {
  for (const tab of await page.locator('.m3e-tab').all()) {
    if (!(await tab.isVisible())) continue;
    const b = await box(tab);
    expect(b.height).toBeGreaterThanOrEqual(48);
    expect(b.width).toBeGreaterThanOrEqual(48);
  }
});

for (const id of ['element-primary', 'element-secondary', 'element-scrollable']) {
  test(`${id}: hover, focus (ring inside the tab) and pressed states`, async ({ page }) => {
    const frame = page.getByTestId(id);
    await frame.scrollIntoViewIfNeeded();
    const clip = await box(frame.locator('.m3e-tabs'));
    const second = tabs(page, id).nth(1);
    await second.hover();
    await expect(page).toHaveScreenshot(`tabs-${id}-hovered.png`, { clip });
    await page.mouse.move(0, 0);
    await tabs(page, id).first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    // The ring grows from a zero-width outline at offset 0 (D19 (3)): poll its settled values.
    const inner = await token(page, '--m3e-sys-state-focus-indicator-inner-offset');
    await expect
      .poll(() =>
        second.evaluate((el) => {
          const s = getComputedStyle(el);
          return { width: s.outlineWidth, offset: s.outlineOffset };
        }),
      )
      .toEqual({ width: '3px', offset: inner });
    await expect(page).toHaveScreenshot(`tabs-${id}-focused.png`, { clip });
    await page.keyboard.press('Tab');
    const b = await box(second);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect(page).toHaveScreenshot(`tabs-${id}-pressed.png`, { clip, animations: 'disabled' });
    await page.mouse.up();
  });
}

test('APG wiring: tablist / tab / tabpanel, aria-selected, aria-controls, aria-labelledby', async ({
  page,
}) => {
  for (const id of ['element-primary', 'react-frame']) {
    const frame = page.getByTestId(id);
    await expect(frame.locator('[role="tablist"]')).toHaveCount(1);
    const all = await frame.locator('[role="tab"]').all();
    await expect(frame.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
    for (const tab of all) {
      const controls = await tab.getAttribute('aria-controls');
      const tabId = await tab.getAttribute('id');
      const panel = page.locator(`[id="${controls!}"]`);
      await expect(panel).toHaveAttribute('role', 'tabpanel');
      await expect(panel).toHaveAttribute('aria-labelledby', tabId!);
      const selected = (await tab.getAttribute('aria-selected')) === 'true';
      await (selected ? expect(panel).toBeVisible() : expect(panel).toBeHidden());
    }
  }
});

test('keyboard: Tab enters on the selected tab, arrows move (no wrap), Home / End, Enter selects (manual activation)', async ({
  page,
}) => {
  const host = page.getByTestId('element-secondary');
  const all = tabs(page, 'element-secondary');
  await all.nth(1).click();
  await expect(host).toHaveAttribute('selected', 'specs');
  // Leave and come back with Tab / Shift+Tab: focus returns to the selected tab.
  await page.keyboard.press('ArrowRight');
  await expect(all.nth(2)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#element-secondary-panel-1')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(all.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(all.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(all.nth(0)).toBeFocused();
  await expect(host).toHaveAttribute('selected', 'specs');
  await page.keyboard.press('End');
  await expect(all.nth(3)).toBeFocused();
  // The disabled tab is reachable but Enter does not select it.
  await page.keyboard.press('Enter');
  await expect(host).toHaveAttribute('selected', 'specs');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(host).toHaveAttribute('selected', 'usage');
  await expect(page.locator('#element-secondary-panel-2')).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(host).toHaveAttribute('selected', 'overview');
});

test('the indicator equals the selected tab after it settles (element and React)', async ({
  page,
}) => {
  for (const [id, index] of [
    ['element-primary', 2],
    ['element-secondary', 2],
    ['element-scrollable', 4],
    ['react-frame', 3],
  ] as const) {
    const r = page.getByTestId(id).locator('.m3e-tabs');
    await tabs(page, id).nth(index).click();
    await rests(r);
    const i = await indicator(r);
    const secondary = await r.evaluate((el) => el.classList.contains('m3e-tabs--secondary'));
    const expected = secondary ? i.tab : i.content;
    expect(i.width, id).toBeCloseTo(secondary ? i.tab.width : Math.max(expected.width, 24), 0);
    expect(i.x + i.width / 2, id).toBeCloseTo(i.tab.x + i.tab.width / 2, 0);
    expect(await r.getAttribute('style')).toBeNull();
  }
});

test('scrollable: selecting a tab scrolls it to the centre (clamped)', async ({ page }) => {
  const id = 'element-scrollable';
  const list = row(page, id).locator('.m3e-tabs__list');
  await page.getByTestId(id).scrollIntoViewIfNeeded();
  const target = tabs(page, id).nth(5);
  await target.evaluate((el) => {
    (el as HTMLElement).click();
  });
  await rests(row(page, id));
  await expect
    .poll(async () => {
      const l = await box(list);
      const t = await box(target);
      return Math.abs(t.x + t.width / 2 - (l.x + l.width / 2));
    })
    .toBeLessThan(1);
  // The first tab: back to the start.
  await tabs(page, id)
    .first()
    .evaluate((el) => {
      (el as HTMLElement).click();
    });
  await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBe(0);
});

test('scrollable: the first layout jumps to the selected tab', async ({ page }) => {
  const left = await page.evaluate(async () => {
    const frame = document.createElement('div');
    frame.className = 'docs-tabs-frame';
    frame.innerHTML = `<m3e-tabs scrollable label="Late" selected="t9">${Array.from(
      { length: 10 },
      (_, i) => `<m3e-tab value="t${String(i + 1)}">Tab ${String(i + 1)}</m3e-tab>`,
    ).join('')}</m3e-tabs>`;
    document.body.prepend(frame);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const list = frame.querySelector('.m3e-tabs__list')!;
    return { left: list.scrollLeft, max: list.scrollWidth - list.clientWidth };
  });
  expect(left.left).toBeGreaterThan(0);
  expect(left.left).toBeLessThanOrEqual(left.max);
});

test('React: options switch the row; presses select and show the panel', async ({ page }) => {
  const frame = page.getByTestId('react-frame');
  const r = frame.locator('.m3e-tabs');
  await frame.locator('.m3e-tab').nth(1).click();
  await expect(frame.getByText('Selected: photos')).toBeVisible();
  await page.getByTestId('react-variant').click();
  await expect(r).toHaveClass('m3e-tabs m3e-tabs--secondary');
  await page.getByTestId('react-scrollable').click();
  await page.getByTestId('react-leading').click();
  await expect(r).toHaveClass(
    'm3e-tabs m3e-tabs--secondary m3e-tabs--scrollable m3e-tabs--leading-icon',
  );
  await expect(frame.locator('.m3e-tab[aria-selected="true"] .m3e-tab__label')).toHaveText(
    'Photos',
  );
  await frame.locator('.m3e-tab').nth(2).click();
  await expect(frame.getByText('Selected: audio')).toBeVisible();
});

test('selecting reads no layout while the indicator slides', async ({ page }) => {
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
    for (const name of ['scrollLeft', 'scrollWidth', 'clientWidth']) {
      const d = Object.getOwnPropertyDescriptor(Element.prototype, name)!;
      Object.defineProperty(Element.prototype, name, {
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
  for (const [id, value] of [
    ['element-primary', 'audio'],
    ['element-scrollable', 't6'],
  ] as const) {
    const { frames, reads } = await page.evaluate(
      async ([testId, next]) => {
        const host = document.querySelector<TabsHost>(`[data-testid="${testId}"]`)!;
        const root = host.querySelector('.m3e-tabs')!;
        const w = window as unknown as { layoutReads: number };
        w.layoutReads = 0;
        host.selected = next;
        await new Promise((resolve) => setTimeout(resolve, 0));
        let count = 0;
        while (root.hasAttribute('data-animating') && count < 600) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          count++;
        }
        return { frames: count, reads: w.layoutReads };
      },
      [id, value] as const,
    );
    expect(frames, id).toBeGreaterThan(2);
    expect(reads, id).toBe(0);
  }
});

test('RTL: the indicator and the arrow keys mirror', async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  const id = 'element-primary';
  const all = tabs(page, id);
  const first = await box(all.nth(0));
  const last = await box(all.nth(2));
  expect(first.x).toBeGreaterThan(last.x);
  await all.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(all.nth(1)).toBeFocused();
  const shift = await page.getByTestId(id).evaluate((host) => {
    (host as TabsHost).selected = 'audio';
    return new Promise<number>((resolve) => {
      queueMicrotask(() => {
        const root = host.querySelector<HTMLElement>('.m3e-tabs')!;
        resolve(Number.parseFloat(root.style.getPropertyValue('--_m3e-tabs-indicator-shift')));
      });
    });
  });
  // Audio is the leftmost tab; the indicator starts on Videos, to its right.
  expect(shift).toBeCloseTo(first.x - last.x, 0);
  await rests(row(page, id));
  const i = await indicator(row(page, id));
  expect(i.x + i.width / 2).toBeCloseTo(last.x + last.width / 2, 0);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the indicator and the divider stay visible', async ({ page }) => {
    for (const id of ['static-primary-text', 'static-secondary-text']) {
      const i = await indicator(row(page, id));
      expect(i.color, id).not.toBe('rgba(0, 0, 0, 0)');
      const divider = await row(page, id).evaluate(
        (el) => getComputedStyle(el, '::before').backgroundColor,
      );
      expect(divider).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the indicator jumps (no frames)', async ({ page }) => {
    const frames = await page.getByTestId('element-primary').evaluate(async (host) => {
      const root = host.querySelector('.m3e-tabs')!;
      (host as TabsHost).selected = 'audio';
      await new Promise((resolve) => setTimeout(resolve, 0));
      let n = 0;
      while (root.hasAttribute('data-animating') && n < 100) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        n++;
      }
      return n;
    });
    expect(frames).toBe(0);
  });
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('element-primary').locator('.m3e-tab')).toHaveCount(3);
  });

  /**
   * Selects `to` on the element primary row inside a frame, recording the indicator shift each
   * 16ms frame; at frame `reverseAt` it selects `back`.
   */
  async function trace(
    page: Page,
    frames: number,
    to: string,
    reverseAt = -1,
    back = '',
  ): Promise<number[]> {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([n, next, reverse, previous]) => {
        const host = document.querySelector<TabsHost>('[data-testid="element-primary"]')!;
        const out: number[] = [];
        (window as unknown as { tabsTrace: number[] }).tabsTrace = out;
        const frame = () => {
          const root = host.querySelector<HTMLElement>('.m3e-tabs')!;
          out.push(Number.parseFloat(root.style.getPropertyValue('--_m3e-tabs-indicator-shift')));
          if (out.length === reverse) host.selected = previous;
          if (out.length < n) requestAnimationFrame(frame);
        };
        // Select inside a frame so the springs start on the clock's frame grid; record from the
        // next frame (after the layout's own callback).
        requestAnimationFrame(() => {
          host.selected = next;
          queueMicrotask(() => {
            requestAnimationFrame(frame);
          });
        });
      },
      [frames, to, reverseAt, back] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { tabsTrace: number[] }).tabsTrace);
  }

  test('the indicator slides on the default spatial spring; a new selection keeps its velocity', async ({
    page,
  }) => {
    const spatial = await spring(page, 'default-spatial');
    const all = await tabs(page, 'element-primary').all();
    const left = await Promise.all(all.map(async (t) => (await box(t)).x));
    const to = left[2]! - left[0]!;
    const frames = await trace(page, 60, 'audio');
    // The first recorded frame is 16ms after the springs started (offset 0 → Audio's left).
    for (let i = 0; i < 16; i++) {
      expect(frames[i]!, `frame ${String(i)}`).toBeCloseTo(
        springValue(spatial, 16 * (i + 1), 0, to) - to,
        0,
      );
    }
    expect(frames.slice(50).some((f) => Number.isNaN(f))).toBe(true);

    await page.reload();
    await expect(page.getByTestId('element-primary').locator('.m3e-tab')).toHaveCount(3);
    const reversed = await trace(page, 30, 'audio', 8, 'photos');
    const at = 16 * 8;
    const from = springValue(spatial, at, 0, to);
    const velocity = springVelocity(spatial, at, 0, to);
    const photos = left[1]! - left[0]!;
    for (let i = 8; i < 14; i++) {
      expect(reversed[i]!, `frame ${String(i)}`).toBeCloseTo(
        springValue(spatial, 16 * (i - 7), from, photos, velocity) - photos,
        0,
      );
    }
  });

  test('mid-animation frame (frozen on the clock) matches the visual baseline', async ({
    page,
  }) => {
    const frame = page.getByTestId('element-primary');
    // The host is display: contents: clip to its frame (the row and the panel).
    const outer = frame.locator('xpath=..');
    await outer.scrollIntoViewIfNeeded();
    const clip = await box(outer);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await frame.evaluate((host) => {
      requestAnimationFrame(() => {
        (host as TabsHost).selected = 'audio';
      });
    });
    for (let i = 0; i < 6; i++) await page.clock.runFor(16);
    const shift = Number.parseFloat(
      await row(page, 'element-primary').evaluate((el) =>
        el.style.getPropertyValue('--_m3e-tabs-indicator-shift'),
      ),
    );
    expect(shift).toBeLessThan(0);
    expect(shift).toBeGreaterThan(-clip.width);
    await expect(page).toHaveScreenshot('tabs-mid-animation.png', { clip });
  });
});

// Badges (M9 B2): on the label (TabSamples.kt LeadingIconTabs), on the icon when the label is
// hidden or the tab is stacked (D20 (1): m3.material.io Tabs › Specs, 6dp overlap on the icon;
// the label first in the DOM); Tab keeps its badge inside itself (badgeBounds), LeadingIconTab
// does not.
test.describe('badges', () => {
  const badges = (page: Page, id: string) =>
    page.getByTestId(id).locator('.m3e-tab .m3e-badged-box > .m3e-badge');

  test('the badge sits on the label (the icon when stacked or hidden) and is read after it', async ({
    page,
  }) => {
    const primary = tabs(page, 'element-badges-primary');
    await expect(primary.nth(1)).toHaveAccessibleName('Photos 8');
    await expect(primary.nth(2)).toHaveAccessibleName('Audio New notification');
    await expect(primary.nth(3)).toHaveAccessibleName('Starred 1200 new');
    await expect(primary.nth(3).locator('.m3e-badge__text')).toHaveText('999+');
    const icons = tabs(page, 'element-badges-icons');
    await expect(icons.nth(1)).toHaveAccessibleName('Starred 3');
    await expect(icons.nth(2)).toHaveAccessibleName('Settings New notification');
    await expect(icons.locator('.m3e-badged-box > .m3e-tab__icon')).toHaveCount(2);
    const react = tabs(page, 'react-badges-frame');
    await expect(react.nth(0)).toHaveAccessibleName('Inbox 1200 unread');
    await expect(react.nth(3)).toHaveAccessibleName('Starred 3');
    // Stacked: the badge on the icon, label first in the DOM (read "Photos 8").
    await expect(primary.locator('.m3e-badged-box > .m3e-tab__icon')).toHaveCount(3);
    await expect(primary.locator('.m3e-tab__label + .m3e-badged-box')).toHaveCount(3);
    for (const badge of await badges(page, 'element-badges-primary').all()) {
      await expectComposePlacement(badge, '.m3e-tab', { rulers: true, overlap: 6 });
    }
    for (const id of ['element-badges-icons', 'react-badges-frame']) {
      // A Tab clamps a badge that would cross its end.
      for (const badge of await badges(page, id).all()) {
        await expectComposePlacement(badge, '.m3e-tab', { rulers: true });
      }
    }
    // Stacked tabs keep their 72dp height, the icon above the label and the label baseline.
    for (const tab of await primary.all()) expect((await box(tab)).height).toBeCloseTo(72, 0);
    const plain = await box(primary.nth(0).locator('.m3e-tab__label'));
    const plainIcon = await box(primary.nth(0).locator('.m3e-tab__icon'));
    for (const i of [1, 2, 3]) {
      const label = await box(primary.nth(i).locator('.m3e-tab__label'));
      const icon = await box(primary.nth(i).locator('.m3e-tab__icon'));
      expect(label.y).toBeCloseTo(plain.y, 1);
      expect(icon.y).toBeCloseTo(plainIcon.y, 1);
      expect(icon.y + icon.height).toBeLessThan(label.y);
    }
  });

  test('badgeBounds(): TabsLayout keeps a Tab’s badge inside it; LeadingIconTab overflows', async ({
    page,
  }) => {
    const scrollable = badges(page, 'element-badges-scrollable');
    await expect(scrollable).toHaveCount(3);
    // Promotions: a 999+ badge would end 8.6dp past the tab; the ruler moves it back inside.
    const promotions = scrollable.nth(1);
    await expect
      .poll(async () => (await placement(promotions, '.m3e-tab')).overflow)
      .toBeCloseTo(0, 0);
    const p = await placement(promotions, '.m3e-tab');
    expect(p.end).toBeLessThan(p.width - 12 - 4);
    expect(p.top).toBeCloseTo(-2, 1);
    for (const badge of [scrollable.nth(0), scrollable.nth(2)]) {
      await expectComposePlacement(badge, '.m3e-tab', { rulers: true });
    }
    // The Compose sample: 999+ at the end of each LeadingIconTab's text, never clamped.
    const leading = badges(page, 'element-badges-leading');
    for (const badge of await leading.all()) await expectComposePlacement(badge, '.m3e-tab');
    expect((await placement(leading.nth(2), '.m3e-tab')).overflow).toBeGreaterThan(0);
    // Leading-icon labels still ellipsize inside their badged box.
    const label = tabs(page, 'element-badges-leading').nth(2).locator('.m3e-tab__label');
    expect(await label.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test('visual baselines', async ({ page }) => {
    await page.mouse.move(0, 0);
    await page.locator('#badges-heading').evaluate((el) => {
      el.scrollIntoView({ block: 'start' });
    });
    const section = page.locator('section[aria-labelledby="badges-heading"]');
    const frames = await box(section.locator('.docs-tabs-frames'));
    const react = await box(page.getByTestId('react-badges-frame'));
    await expect(page).toHaveScreenshot('tabs-badges.png', {
      clip: {
        x: frames.x - 8,
        y: frames.y - 8,
        width: frames.width + 16,
        height: react.y + react.height - frames.y + 16,
      },
    });
  });
});
