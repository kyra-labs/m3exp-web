import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// FAB menu (COMPONENT_SPEC §6): acceptance criteria + light/dark × 3 browsers baselines, axe,
// keyboard/focus/light dismiss for both JS layers, and the interruptible springs traced frame by
// frame on the Playwright clock (ROADMAP M5 DoD).
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const radius = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius));
const box = async (el: Locator) => (await el.boundingBox())!;
type Srgb = (color: string) => number[];
/** sRGB bytes of a CSS color: color-mix() computes to oklab(), a canvas pixel normalizes it. */
const installSrgb = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { srgb: Srgb }).srgb = (color) => {
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
  });
/** A color role, as sRGB bytes. */
const role = (page: Page, name: string) =>
  page.evaluate((r) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = `var(--m3e-sys-color-${r})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return (window as unknown as { srgb: Srgb }).srgb(value);
  }, name);
/** An element's background, as sRGB bytes. */
const background = (el: Locator) =>
  el.evaluate((node) =>
    (window as unknown as { srgb: Srgb }).srgb(getComputedStyle(node).backgroundColor),
  );
/** Equal within one step per channel (Oklab round trip). */
const expectColor = (actual: number[], expected: number[], what: string) => {
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(actual[i]! - expected[i]!), `${what} [${String(i)}]`).toBeLessThanOrEqual(1);
  }
};

const reactMenu = (page: Page) => page.getByTestId('react-menu');
const elementMenu = (page: Page) => page.getByTestId('element-menu');
/** Waits until no FAB menu spring is running (no inline progress, no animating item). */
const settled = (menu: Locator) =>
  expect
    .poll(() =>
      menu.evaluate((node) => {
        const root = node.matches('.m3e-fab-menu') ? node : node.querySelector('.m3e-fab-menu')!;
        return (
          (root as HTMLElement).style.getPropertyValue('--_m3e-fab-menu-progress') === '' &&
          !root.hasAttribute('data-closing') &&
          root.querySelector('[data-animating]') === null
        );
      }),
    )
    .toBe(true);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/fab-menu/');
  await page.evaluate(() => document.fonts.ready);
  await expect(reactMenu(page).locator('.m3e-fab-menu__item')).toHaveCount(4);
  await expect(elementMenu(page).locator('.m3e-fab-menu__item')).toHaveCount(3);
});

test('has no axe violations (closed and open)', async ({ page }) => {
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  await reactMenu(page).locator('.m3e-fab-menu__toggle').click();
  await elementMenu(page).locator('.m3e-fab-menu__toggle').click();
  await settled(reactMenu(page));
  await settled(elementMenu(page));
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('fab-menu.png', { fullPage: true });
});

test('opened by both JS layers, settled, matches the baselines', async ({ page }) => {
  for (const [name, menu] of [
    ['react', reactMenu(page)],
    ['element', elementMenu(page)],
  ] as const) {
    await menu.locator('.m3e-fab-menu__toggle').click();
    await settled(menu);
    await page.mouse.move(0, 0);
    // The settled open menu equals the static CSS one: no spring styles are left (the ripple's
    // press point stays on the toggle).
    expect(
      await menu.evaluate((node) =>
        [...node.querySelectorAll('.m3e-fab-menu, .m3e-fab-menu__item')]
          .map((el) => (el as HTMLElement).style)
          .flatMap((s) => [
            s.getPropertyValue('--_m3e-fab-menu-progress'),
            s.getPropertyValue('inline-size'),
            s.getPropertyValue('opacity'),
          ])
          .filter(Boolean),
      ),
    ).toEqual([]);
    const frame = menu.locator('xpath=ancestor::div[contains(@class,"docs-fab-menu-frame")][1]');
    await frame.scrollIntoViewIfNeeded();
    await expect(page).toHaveScreenshot(`fab-menu-${name}-open.png`, { clip: await box(frame) });
    await page.keyboard.press('Escape');
    await settled(menu);
  }
});

test('measurements match the generated tokens and m3.material.io placement', async ({ page }) => {
  const closed = page.getByTestId('static-closed');
  const closedToggle = closed.locator('.m3e-fab-menu__toggle');
  expect((await box(closedToggle)).width).toBeCloseTo(56, 0);
  expect(await radius(closedToggle)).toBeCloseTo(
    await token(page, '--m3e-comp-fab-menu-defaults-toggle-initial-corner-radius'),
    1,
  );
  // Closed: the item column takes no space; 16dp around the FAB (horizontal) and below it.
  const closedRoot = await box(closed);
  expect(closedRoot.height).toBeCloseTo(56 + 16, 0);
  expect(closedRoot.width).toBeCloseTo(56 + 32, 0);

  const open = page.getByTestId('static-primary');
  const toggle = open.locator('.m3e-fab-menu__toggle');
  const items = open.locator('.m3e-fab-menu__item');
  const t = await box(toggle);
  const closeSize = await token(page, '--m3e-comp-fab-menu-baseline-close-button-container-height');
  expect(t.width).toBeCloseTo(closeSize, 0);
  expect(t.height).toBeCloseTo(closeSize, 0);
  expect(await radius(toggle)).toBeCloseTo(closeSize / 2, 1);
  const itemHeight = await token(page, '--m3e-comp-fab-menu-baseline-list-item-container-height');
  const between = await token(page, '--m3e-comp-fab-menu-baseline-list-item-between-space');
  const boxes = await Promise.all([0, 1, 2].map(async (i) => box(items.nth(i))));
  for (const b of boxes) expect(b.height).toBeCloseTo(itemHeight, 0);
  expect(boxes[1]!.y - (boxes[0]!.y + boxes[0]!.height)).toBeCloseTo(between, 0);
  // Close button 8dp under the bottom item (CloseButtonBetweenSpace), 16dp above the root edge.
  expect(t.y - (boxes[2]!.y + boxes[2]!.height)).toBeCloseTo(
    await token(page, '--m3e-comp-fab-menu-baseline-close-button-between-space'),
    0,
  );
  const root = await box(open);
  expect(root.y + root.height - (t.y + t.height)).toBeCloseTo(16, 0);
  // Items hug their content (24dp leading/trailing, 8dp icon-label) and align to the end.
  for (const b of boxes) expect(b.x + b.width).toBeCloseTo(t.x + t.width, 0);
  const icon = await box(items.nth(0).locator('.m3e-icon'));
  expect(icon.x - boxes[0]!.x).toBeCloseTo(24, 0);
  expect(icon.width).toBeCloseTo(24, 0);

  // m3.material.io: opened from a medium / large FAB, the close button keeps the FAB's top end
  // corner, so it sits 40dp / 56dp above the bottom (16dp margin + the size difference).
  for (const [id, gap] of [
    ['secondary', 40],
    ['tertiary', 56],
  ] as const) {
    const menu = page.getByTestId(`static-${id}`);
    const r = await box(menu);
    const c = await box(menu.locator('.m3e-fab-menu__toggle'));
    expect(c.width, id).toBeCloseTo(closeSize, 0);
    expect(r.y + r.height - (c.y + c.height), id).toBeCloseTo(gap, 0);
    expect(r.x + r.width - (c.x + c.width), id).toBeCloseTo(16, 0);
  }
});

test('color sets: close button = role, items = container role; closed toggle = container', async ({
  page,
}) => {
  await installSrgb(page);
  await page.reload();
  for (const [id, set] of [
    ['primary', 'primary'],
    ['secondary', 'secondary'],
    ['tertiary', 'tertiary'],
  ] as const) {
    const menu = page.getByTestId(`static-${id}`);
    expectColor(
      await background(menu.locator('.m3e-fab-menu__toggle')),
      await role(page, set),
      `${id} close button`,
    );
    expectColor(
      await background(menu.locator('.m3e-fab-menu__item').first()),
      await role(page, `${set}-container`),
      `${id} item`,
    );
  }
  expectColor(
    await background(page.getByTestId('static-closed').locator('.m3e-fab-menu__toggle')),
    await role(page, 'primary-container'),
    'closed toggle',
  );
});

for (const layer of ['react', 'element'] as const) {
  test(`${layer}: toggle, focus, keyboard, Escape and outside press`, async ({ page }) => {
    const menu = layer === 'react' ? reactMenu(page) : elementMenu(page);
    const toggle = menu.locator('.m3e-fab-menu__toggle');
    const items = menu.getByRole('menuitem');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu.getByRole('menu')).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const controls = await toggle.getAttribute('aria-controls');
    await expect(menu.locator(`[id="${controls!}"]`)).toHaveAttribute('role', 'menu');
    // Focus stays on the close button (m3.material.io › Initial focus; Compose L138–152); ArrowDown
    // enters the menu at the top item, ArrowUp at the bottom one.
    await expect(toggle).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('ArrowDown');
    // Among the items: arrows wrap; Home/End.
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(items.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.first()).toBeFocused();
    // Focus stays in the menu: Tab cycles between the items and the toggle.
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(items.last()).toBeFocused();
    // Escape closes and restores focus to the toggle.
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    // A pointer open also leaves focus on the toggle; an outside press closes it.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toBeFocused();
    await page.locator('h1').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await settled(menu);
    await expect(menu.getByRole('menu')).toBeHidden();
  });

  test(`${layer}: activating an item runs it and closes the menu`, async ({ page }) => {
    const menu = layer === 'react' ? reactMenu(page) : elementMenu(page);
    const toggle = menu.locator('.m3e-fab-menu__toggle');
    await toggle.click();
    await settled(menu);
    await menu.getByRole('menuitem', { name: 'Message' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    const output =
      layer === 'react' ? page.getByTestId('react-chosen') : page.locator('#element-action');
    await expect(output).toHaveText(/Chose message\./i);
  });
}

test.describe('springs (frames driven by the Playwright clock)', () => {
  // Fake timers make the trace deterministic: every requestAnimationFrame and performance.now()
  // the springs see comes from page.clock, so a loaded CI machine cannot drop frames.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(reactMenu(page).locator('.m3e-fab-menu__item')).toHaveCount(4);
    await expect(elementMenu(page).locator('.m3e-fab-menu__item')).toHaveCount(3);
  });

  interface Frame {
    toggle: number;
    items: { width: number; opacity: number }[];
  }

  /**
   * Presses the toggle of `testId`'s menu, then records the toggle width and each item's width and
   * opacity once per 16ms frame for `frames` frames, pressing again after `reverseAt` frames. The
   * recorder runs in the page's own requestAnimationFrame (after the springs' writes), so one
   * runFor() replays the whole trace.
   */
  async function trace(page: Page, testId: string, frames: number, reverseAt = -1) {
    // Freeze time (install() lets it flow): from here on only runFor() advances it.
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([id, n, reverse]) => {
        const host = document.querySelector(`[data-testid="${id}"]`)!;
        const root = host.matches('.m3e-fab-menu') ? host : host.querySelector('.m3e-fab-menu')!;
        const toggle = root.querySelector<HTMLElement>('.m3e-fab-menu__toggle')!;
        const items = [...root.querySelectorAll<HTMLElement>('.m3e-fab-menu__item')];
        const out: Frame[] = [];
        (window as unknown as { fabMenuTrace: Frame[] }).fabMenuTrace = out;
        const frame = () => {
          out.push({
            toggle: toggle.getBoundingClientRect().width,
            items: items.map((el) => ({
              width: el.getBoundingClientRect().width,
              opacity: Number(getComputedStyle(el).opacity),
            })),
          });
          if (out.length === reverse) toggle.click();
          if (out.length < n) requestAnimationFrame(frame);
        };
        toggle.click();
        // After the toggle's update has run and the springs have asked for their frame, so the
        // recorder reads each frame after the springs write it.
        queueMicrotask(() => {
          queueMicrotask(() => requestAnimationFrame(frame));
        });
      },
      [testId, frames, reverseAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { fabMenuTrace: Frame[] }).fabMenuTrace);
  }

  test('React: the toggle shrinks to the close button on a spring; items stagger in from the bottom', async ({
    page,
  }) => {
    const menu = reactMenu(page);
    await menu.locator('.m3e-fab-menu__toggle').scrollIntoViewIfNeeded();
    const medium = await token(page, '--m3e-comp-fab-medium-container-height');
    const close = await token(page, '--m3e-comp-fab-menu-baseline-close-button-container-height');
    const frames = await trace(page, 'react-menu', 60);
    const widths = frames.map((f) => f.toggle);
    // Many intermediate widths (no jump), an overshoot below 56 (expressive fast spatial, ζ 0.6),
    // resting on the close button size.
    expect(new Set(widths.slice(0, 15).map(Math.round)).size).toBeGreaterThanOrEqual(5);
    expect(widths[0]!).toBeLessThan(medium);
    expect(Math.min(...widths)).toBeLessThan(close - 0.5);
    expect(widths.at(-1)!).toBeCloseTo(close, 0);
    // Stagger: the bottom item (next to the toggle) shows first, the top one last.
    const shownAt = (i: number) => frames.findIndex((f) => f.items[i]!.opacity > 0);
    expect(shownAt(3)).toBeGreaterThanOrEqual(0);
    expect(shownAt(3)).toBeLessThan(shownAt(1));
    expect(shownAt(1)).toBeLessThanOrEqual(shownAt(0));
    // Each item grows its width from 0 to its natural width.
    const bottom = frames.map((f) => f.items[3]!.width);
    expect(bottom[0]!).toBe(0);
    expect(new Set(bottom.map(Math.round)).size).toBeGreaterThanOrEqual(5);
    await expect(menu.locator('.m3e-fab-menu__toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  for (const [layer, testId, closedSize] of [
    ['React', 'react-menu', '--m3e-comp-fab-medium-container-height'],
    ['element', 'element-menu', '--m3e-comp-fab-baseline-container-height'],
  ] as const) {
    test(`${layer}: opening reverses mid-flight without a jump, velocity preserved (trace)`, async ({
      page,
    }) => {
      const menu = page.getByTestId(testId);
      await menu.locator('.m3e-fab-menu__toggle').scrollIntoViewIfNeeded();
      const initial = await token(page, closedSize);
      // Open, then close again before frame 4 (mid-flight).
      const frames = await trace(page, testId, 70, 4);
      const bottom = frames.map((f) => f.items.at(-1)!.width);
      // The bottom item reverses without restarting: no frame jumps back to 0 or to full width.
      for (let i = 1; i < bottom.length; i++) {
        expect(Math.abs(bottom[i]! - bottom[i - 1]!), `item frame ${String(i)}`).toBeLessThan(60);
      }
      expect(bottom.at(-1)!).toBe(0);
      if (layer === 'React') {
        const widths = frames.map((f) => f.toggle);
        const range = initial - 56;
        const last = widths[3]!;
        expect(last, 'reversed mid-flight').toBeLessThan(initial - range * 0.1);
        // Velocity kept: the frame after the reversal is still shrinking, then it turns around.
        expect(widths[4]!, 'continues in the old direction').toBeLessThan(last);
        expect(widths.indexOf(Math.min(...widths))).toBeGreaterThanOrEqual(4);
        for (let i = 1; i < widths.length; i++) {
          expect(Math.abs(widths[i]! - widths[i - 1]!), `frame ${String(i)}`).toBeLessThan(
            range * 0.4,
          );
        }
        expect(widths.at(-1)!).toBeCloseTo(initial, 0);
      }
      await expect(menu.locator('.m3e-fab-menu__toggle')).toHaveAttribute('aria-expanded', 'false');
    });
  }

  test('element: the toggle progress keeps its velocity when reversed (trace of the progress)', async ({
    page,
  }) => {
    const menu = elementMenu(page);
    await menu.locator('.m3e-fab-menu__toggle').scrollIntoViewIfNeeded();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(() => {
      const root = document.querySelector('[data-testid="element-menu"] .m3e-fab-menu')!;
      const toggle = root.querySelector<HTMLElement>('.m3e-fab-menu__toggle')!;
      const out: number[] = [];
      (window as unknown as { progressTrace: number[] }).progressTrace = out;
      const read = () =>
        Number.parseFloat(getComputedStyle(root).getPropertyValue('--_m3e-fab-menu-progress'));
      const frame = () => {
        out.push(read());
        if (out.length === 4) toggle.click();
        if (out.length < 50) requestAnimationFrame(frame);
      };
      toggle.click();
      queueMicrotask(() => {
        queueMicrotask(() => requestAnimationFrame(frame));
      });
    });
    await page.clock.runFor(16 * 50 + 100);
    const p = await page.evaluate(
      () => (window as unknown as { progressTrace: number[] }).progressTrace,
    );
    const last = p[3]!;
    expect(last).toBeGreaterThan(0.1);
    expect(last).toBeLessThan(1);
    expect(p[4]!, 'continues upward on its velocity').toBeGreaterThan(last);
    for (let i = 1; i < p.length; i++) expect(Math.abs(p[i]! - p[i - 1]!)).toBeLessThan(0.35);
    expect(p.at(-1)!).toBeCloseTo(0, 2);
  });
});

test('touch targets ≥ 48dp; items keep 56dp', async ({ page }) => {
  const menu = page.getByTestId('static-primary');
  const t = await box(menu.locator('.m3e-fab-menu__toggle'));
  expect(Math.min(t.width, t.height)).toBeGreaterThanOrEqual(48);
  for (const b of await Promise.all(
    [0, 1, 2].map(async (i) => box(menu.locator('.m3e-fab-menu__item').nth(i))),
  )) {
    expect(b.height).toBeGreaterThanOrEqual(48);
    expect(b.width).toBeGreaterThanOrEqual(48);
  }
});

test('RTL: the menu anchors to the inline end (left) and mirrors the items', async ({ page }) => {
  const menu = page.getByTestId('static-primary');
  await menu.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const root = await box(menu);
  const t = await box(menu.locator('.m3e-fab-menu__toggle'));
  expect(t.x - root.x).toBeCloseTo(16, 0);
  const item = menu.locator('.m3e-fab-menu__item').first();
  const b = await box(item);
  expect(b.x).toBeCloseTo(t.x, 0);
  const icon = await box(item.locator('.m3e-icon'));
  expect(b.x + b.width - (icon.x + icon.width)).toBeCloseTo(24, 0);
});

test.describe('states', () => {
  test('toggle and item hover / focus', async ({ page }) => {
    const menu = page.getByTestId('static-primary');
    await menu.scrollIntoViewIfNeeded();
    const frame = await box(menu);
    const clip = {
      x: frame.x - 8,
      y: frame.y - 8,
      width: frame.width + 16,
      height: frame.height + 16,
    };
    await menu.locator('.m3e-fab-menu__toggle').hover();
    await expect(page).toHaveScreenshot('fab-menu-toggle-hovered.png', { clip });
    await menu.locator('.m3e-fab-menu__item').nth(1).hover();
    await expect(page).toHaveScreenshot('fab-menu-item-hovered.png', { clip });
    await page.mouse.move(0, 0);
    const toggle = menu.locator('.m3e-fab-menu__toggle');
    await toggle.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await expect(page).toHaveScreenshot('fab-menu-focused.png', { clip });
    // After a key press, moving focus to an item (as the JS layers do) shows its ring.
    const item = menu.locator('.m3e-fab-menu__item').nth(1);
    await item.focus();
    expect(await item.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await expect(page).toHaveScreenshot('fab-menu-item-focused.png', { clip });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the toggle jumps to the close button (spatial springs off)', async ({ page }) => {
    const menu = reactMenu(page);
    await menu.locator('.m3e-fab-menu__toggle').scrollIntoViewIfNeeded();
    const close = await token(page, '--m3e-comp-fab-menu-baseline-close-button-container-height');
    const next = await menu.evaluate(async (el) => {
      const toggle = el.querySelector<HTMLElement>('.m3e-fab-menu__toggle')!;
      toggle.click();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      return toggle.getBoundingClientRect().width;
    });
    expect(next).toBeCloseTo(close, 0);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the toggle and the items keep a visible boundary', async ({ page }) => {
    const menu = page.getByTestId('static-primary');
    for (const selector of ['.m3e-fab-menu__toggle', '.m3e-fab-menu__item']) {
      const style = await menu
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(style, selector).toBe('solid');
    }
  });
});
