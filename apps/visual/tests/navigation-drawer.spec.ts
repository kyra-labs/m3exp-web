import AxeBuilder from '@axe-core/playwright';
import { springValue, springVelocity } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Navigation drawer (COMPONENT_SPEC §15): static permanent / modal sheets, the element's
// dismissible and modal drawers, and React. Acceptance + light/dark × 3 browsers baselines, axe,
// keyboard, drags and clock-driven spring traces.
const box = async (el: Locator) => (await el.boundingBox())!;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const spring = async (page: Page, name: string) => ({
  dampingRatio: Number(await token(page, `--m3e-sys-motion-spring-${name}-damping-ratio`)),
  stiffness: Number(await token(page, `--m3e-sys-motion-spring-${name}-stiffness`)),
});
type DrawerHost = HTMLElement & { show(): void; close(): void; toggle(): void; open?: boolean };
const root = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-navigation-drawer');
const sheetOf = (page: Page, id: string) => root(page, id).locator('.m3e-navigation-drawer__sheet');
/** Waits until a drawer rests (its layout removed data-animating). */
const rests = (el: Locator) =>
  expect.poll(() => el.evaluate((node) => node.hasAttribute('data-animating'))).toBe(false);
const hasFocus = (el: Locator) => el.evaluate((node) => node.contains(document.activeElement));
const part = (item: Locator, name: string) => item.locator(`.m3e-navigation-drawer-item__${name}`);
const show = (page: Page, id: string) =>
  page.getByTestId(id).evaluate((host) => {
    (host as DrawerHost).show();
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/navigation-drawer/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-drawer').locator('.m3e-navigation-drawer-item')).toHaveCount(
    4,
  );
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('navigation-drawer.png', { fullPage: true });
});

test('standard sheet and item geometry follow DrawerSheet / NavigationDrawerItem', async ({
  page,
}) => {
  const frame = page.getByTestId('static-permanent');
  const frameBox = await box(frame);
  const sheet = frame.locator('.m3e-navigation-drawer__sheet');
  const sheetBox = await box(sheet);
  // ContainerWidth, full height, at the start edge.
  expect(sheetBox.width).toBeCloseTo(360, 0);
  expect(sheetBox.x).toBeCloseTo(frameBox.x, 0);
  expect(sheetBox.height).toBeCloseTo(frameBox.height, 0);
  expect(await sheet.evaluate((el) => getComputedStyle(el).borderTopRightRadius)).toBe('0px');
  // m3.material.io: a 56dp headline row 12dp below the top, text 28dp in.
  const headline = await box(sheet.locator('.m3e-navigation-drawer__headline').first());
  expect(headline.y - sheetBox.y).toBeCloseTo(12, 0);
  expect(headline.height).toBeCloseTo(56, 0);
  expect(
    await sheet
      .locator('.m3e-navigation-drawer__headline')
      .first()
      .evaluate((el) => getComputedStyle(el).paddingInlineStart),
  ).toBe('28px');
  const items = await sheet.locator('.m3e-navigation-drawer-item').all();
  for (const [i, item] of items.entries()) {
    const b = await box(item);
    expect(b.x - sheetBox.x, `item ${String(i)}`).toBeCloseTo(12, 0);
    expect(b.width).toBeCloseTo(336, 0);
    expect(b.height).toBeCloseTo(56, 0);
    const icon = await box(part(item, 'icon'));
    const label = await box(part(item, 'label'));
    expect(icon.x - b.x).toBeCloseTo(16, 0);
    expect(icon.width).toBeCloseTo(24, 0);
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(12, 0);
  }
  // The badge: 12dp after the label, 24dp from the end.
  const inbox = page.getByTestId('p-inbox');
  const inboxBox = await box(inbox);
  const badge = await box(part(inbox, 'badge'));
  const label = await box(part(inbox, 'label'));
  expect(inboxBox.x + inboxBox.width - (badge.x + badge.width)).toBeCloseTo(24, 0);
  expect(badge.x - (label.x + label.width)).toBeCloseTo(12, 0);
  // Items sit edge to edge; the divider follows the last item, 28dp in from both sides.
  const first = await box(items[0]!);
  const second = await box(items[1]!);
  expect(second.y).toBeCloseTo(first.y + 56, 0);
  const divider = await box(sheet.locator('.m3e-navigation-drawer__divider'));
  expect(divider.x - sheetBox.x).toBeCloseTo(28, 0);
  expect(divider.width).toBeCloseTo(360 - 56, 0);
  const trash = await box(page.getByTestId('p-trash'));
  expect(divider.y).toBeCloseTo(trash.y + trash.height, 0);
});

test('colors: selected secondary container, label body large (Compose LocalTextStyle)', async ({
  page,
}) => {
  const inbox = page.getByTestId('p-inbox');
  const probe = await page.evaluate(() => {
    const el = document.createElement('div');
    el.style.background = 'var(--m3e-sys-color-secondary-container)';
    document.body.append(el);
    const color = getComputedStyle(el).backgroundColor;
    el.remove();
    return color;
  });
  expect(await inbox.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(probe);
  expect(
    await page.getByTestId('p-outbox').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)');
  expect(await inbox.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
});

test('static modal: surface-container-low sheet with large end corners over the 0.32 scrim', async ({
  page,
}) => {
  const frame = page.getByTestId('static-modal');
  const sheet = frame.locator('.m3e-navigation-drawer__sheet');
  expect((await box(sheet)).width).toBeCloseTo(360, 0);
  const radius = await token(page, '--m3e-sys-shape-corner-large');
  expect(await sheet.evaluate((el) => getComputedStyle(el).borderTopRightRadius)).toBe(radius);
  expect(await sheet.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('0px');
  const scrim = frame.locator('.m3e-navigation-drawer__scrim');
  expect(Number(await scrim.evaluate((el) => getComputedStyle(el).opacity))).toBeCloseTo(0.32, 3);
  expect(Number(await token(page, '--m3e-comp-navigation-drawer-scrim-opacity'))).toBe(0.32);
});

test('hover and focus states (focus ring inside the shape)', async ({ page }) => {
  const frame = page.getByTestId('static-permanent');
  const clip = await box(frame);
  await page.getByTestId('p-outbox').hover();
  await expect(page).toHaveScreenshot('navigation-drawer-hovered.png', { clip });
  await page.mouse.move(0, 0);
  await page.getByTestId('p-inbox').focus();
  await page.keyboard.press('Tab');
  const outbox = page.getByTestId('p-outbox');
  await expect(outbox).toBeFocused();
  const ring = await outbox.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, offset: s.outlineOffset };
  });
  expect(ring.style).toBe('solid');
  expect(ring.offset).toBe(await token(page, '--m3e-sys-state-focus-indicator-inner-offset'));
  await expect(page).toHaveScreenshot('navigation-drawer-focused.png', { clip });
});

test('only one item has aria-current; presses move it (element and React)', async ({ page }) => {
  for (const nav of await page.locator('.m3e-navigation-drawer__sheet').all()) {
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  }
  await show(page, 'element-dismissible');
  const sheet = sheetOf(page, 'element-dismissible');
  await rests(root(page, 'element-dismissible'));
  await sheet.locator('.m3e-navigation-drawer-item').nth(2).click();
  await expect(sheet.locator('[aria-current]')).toHaveCount(1);
  await expect(sheet.locator('.m3e-navigation-drawer-item').nth(2)).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByTestId('element-dismissible')).toHaveAttribute('selected', 'trash');
});

test('48dp targets', async ({ page }) => {
  for (const item of await page
    .getByTestId('static-permanent')
    .locator('.m3e-navigation-drawer-item')
    .all()) {
    const b = await box(item);
    expect(b.height).toBeGreaterThanOrEqual(48);
    expect(b.width).toBeGreaterThanOrEqual(48);
  }
});

test('keyboard: ArrowDown / ArrowUp move between items, Tab still visits each', async ({
  page,
}) => {
  await show(page, 'element-modal');
  const items = sheetOf(page, 'element-modal').locator('.m3e-navigation-drawer-item');
  await expect(items.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(items.nth(2)).toBeFocused();
  // No wrap at the ends (Compose's directional focus stops).
  await items.nth(3).focus();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(3)).toBeFocused();
});

test('modal: dialog semantics, focus moves in and is trapped, Escape closes, focus returns', async ({
  page,
}) => {
  const drawer = root(page, 'element-modal');
  const opener = page.getByTestId('open-modal');
  await expect(drawer).not.toHaveAttribute('role', 'dialog');
  await expect(drawer.locator('nav')).toBeHidden();
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(drawer).toHaveAttribute('data-open', '');
  await expect(drawer).toHaveAttribute('role', 'dialog');
  await expect(drawer).toHaveAttribute('aria-modal', 'true');
  await expect(drawer).toHaveAttribute('aria-label', 'Navigation menu');
  // Compose requests focus on the drawer: its first stop.
  const sheet = drawer.locator('nav');
  await expect(sheet.locator('.m3e-navigation-drawer-item').first()).toBeFocused();
  await rests(drawer);
  const sheetBox = await box(sheet);
  expect(sheetBox.x).toBeCloseTo(0, 0);
  expect(sheetBox.y).toBeCloseTo(0, 0);
  expect(sheetBox.width).toBeCloseTo(360, 0);
  expect(sheetBox.height).toBeCloseTo(page.viewportSize()!.height, 0);
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    expect(await hasFocus(sheet)).toBe(true);
  }
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await hasFocus(sheet)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('element-modal')).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
  await expect(drawer).not.toHaveAttribute('data-open', '');
  await expect(drawer).not.toHaveAttribute('role', 'dialog');
  await expect(sheet).toBeHidden();
});

test('modal: the scrim closes it; the page does not scroll while open', async ({ page }) => {
  const drawer = root(page, 'element-modal');
  await page.getByTestId('open-modal').click();
  await expect(drawer).toHaveAttribute('data-open', '');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await rests(drawer);
  const scrim = drawer.locator('.m3e-navigation-drawer__scrim');
  expect(Number(await scrim.evaluate((el) => getComputedStyle(el).opacity))).toBeCloseTo(0.32, 3);
  const viewport = page.viewportSize()!;
  await page.mouse.click(viewport.width - 20, viewport.height / 2);
  await expect(drawer).not.toHaveAttribute('data-open', '');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('modal: dragging the sheet towards the start edge closes it; a short slow drag settles back', async ({
  page,
}) => {
  const drawer = root(page, 'element-modal');
  await show(page, 'element-modal');
  await rests(drawer);
  const viewport = page.viewportSize()!;
  const y = viewport.height - 100;
  // Slow and short (10px per 50ms, 200px/s < 400dp/s, 40px < half the width): back to open.
  await page.mouse.move(300, y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(300 - 10 * i, y);
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  await rests(drawer);
  await expect(page.getByTestId('element-modal')).toHaveAttribute('open', '');
  expect((await box(drawer.locator('nav'))).x).toBeCloseTo(0, 0);
  // Past the middle: closed, and the drag did not press an item.
  await page.mouse.move(300, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(300 - 25 * i, y);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await expect(page.getByTestId('element-modal')).not.toHaveAttribute('open', '');
  await expect(drawer).not.toHaveAttribute('data-open', '');
  await expect(page.getByTestId('element-modal')).toHaveAttribute('selected', 'inbox');
});

test('dismissible: pushes the content by the sheet width; Escape closes; focus returns', async ({
  page,
}) => {
  const drawer = root(page, 'element-dismissible');
  const content = page.getByTestId('dismissible-content');
  const frame = await box(page.getByTestId('dismissible-frame'));
  expect((await box(content)).x).toBeCloseTo(frame.x, 0);
  const menu = page.locator('[data-drawer-toggle="element-dismissible"]');
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(drawer.locator('.m3e-navigation-drawer-item').first()).toBeFocused();
  await rests(drawer);
  expect((await box(content)).x).toBeCloseTo(frame.x + 360, 0);
  expect(await drawer.getAttribute('role')).toBeNull();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await rests(drawer);
  await expect(drawer).not.toHaveAttribute('data-open', '');
  expect((await box(content)).x).toBeCloseTo(frame.x, 0);
});

test('matches the visual baselines with the dismissible and the modal drawer open', async ({
  page,
}) => {
  await page.getByTestId('dismissible-frame').scrollIntoViewIfNeeded();
  await show(page, 'element-dismissible');
  await rests(root(page, 'element-dismissible'));
  const clip = await box(page.getByTestId('dismissible-frame'));
  await expect(page).toHaveScreenshot('navigation-drawer-dismissible-open.png', { clip });
  await show(page, 'element-modal');
  await rests(root(page, 'element-modal'));
  await expect(page).toHaveScreenshot('navigation-drawer-modal-open.png');
});

test('has no axe violations with the modal drawer open', async ({ page }) => {
  await show(page, 'element-modal');
  await rests(root(page, 'element-modal'));
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('RTL: the drawers open from the inline-start (right) edge', async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  const frame = await box(page.getByTestId('dismissible-frame'));
  await show(page, 'element-dismissible');
  const dismissible = root(page, 'element-dismissible');
  await rests(dismissible);
  const sheet = await box(dismissible.locator('nav'));
  expect(sheet.x + sheet.width).toBeCloseTo(frame.x + frame.width, 0);
  const content = await box(page.getByTestId('dismissible-content'));
  expect(content.x + content.width).toBeCloseTo(sheet.x, 0);
  await show(page, 'element-modal');
  const modal = root(page, 'element-modal');
  await rests(modal);
  const modalSheet = modal.locator('nav');
  const b = await box(modalSheet);
  expect(b.x + b.width).toBeCloseTo(page.viewportSize()!.width, 0);
  const radius = await token(page, '--m3e-sys-shape-corner-large');
  expect(await modalSheet.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe(radius);
});

test('React: switching the variant keeps the selection; the modal closes on a selection', async ({
  page,
}) => {
  const frame = page.getByTestId('react-frame');
  const drawer = page.getByTestId('react-drawer');
  await page.getByTestId('react-drawer-toggle').click();
  await rests(drawer);
  await drawer.locator('.m3e-navigation-drawer-item').nth(1).click();
  await expect(frame.getByText('Selected: outbox')).toBeVisible();
  await page.getByTestId('react-variant-permanent').click();
  await expect(drawer).toHaveClass('m3e-navigation-drawer');
  await expect(drawer.locator('[aria-current]')).toHaveText(/Outbox/);
  await page.getByTestId('react-variant-modal').click();
  await page.getByTestId('react-drawer-toggle').click();
  await expect(drawer).toHaveAttribute('role', 'dialog');
  await expect(drawer.locator('nav')).toHaveAttribute('aria-label', 'React example');
  await rests(drawer);
  await drawer.locator('.m3e-navigation-drawer-item').nth(2).click();
  await expect(drawer).not.toHaveAttribute('data-open', '');
  await expect(frame.getByText('Selected: drafts')).toBeVisible();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('sheets keep a boundary; the selected item and the scrim stay visible', async ({ page }) => {
    const sheet = page.getByTestId('static-permanent').locator('nav');
    expect(await sheet.evaluate((el) => getComputedStyle(el).borderInlineEndStyle)).toBe('solid');
    expect(
      await page.getByTestId('p-inbox').evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe('rgba(0, 0, 0, 0)');
    await show(page, 'element-modal');
    const drawer = root(page, 'element-modal');
    await rests(drawer);
    const scrim = drawer.locator('.m3e-navigation-drawer__scrim');
    expect(await scrim.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the drawer jumps open and closed (no frames)', async ({ page }) => {
    const frames = await page.getByTestId('element-modal').evaluate(async (host) => {
      const drawer = host.querySelector('.m3e-navigation-drawer')!;
      const count = async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        let n = 0;
        while (drawer.hasAttribute('data-animating') && n < 100) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          n++;
        }
        return n;
      };
      (host as DrawerHost).show();
      const opening = await count();
      (host as DrawerHost).close();
      const closing = await count();
      return { opening, closing };
    });
    expect(frames).toEqual({ opening: 0, closing: 0 });
  });
});

test('opening reads no layout while it animates', async ({ page }) => {
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
    const host = document.querySelector<DrawerHost>('[data-testid="element-modal"]')!;
    const drawer = host.querySelector('.m3e-navigation-drawer')!;
    const w = window as unknown as { layoutReads: number };
    host.show();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The first stop is focused when the drawer opens (tabStops reads client rects): count after.
    w.layoutReads = 0;
    let count = 0;
    while (drawer.hasAttribute('data-animating') && count < 600) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      count++;
    }
    return { frames: count, reads: w.layoutReads };
  });
  expect(frames).toBeGreaterThan(10);
  expect(reads).toBe(0);
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('open-modal')).toBeVisible();
  });

  /** Opens the modal element drawer inside a frame, recording its offset each 16ms frame. */
  async function trace(page: Page, frames: number, reverseAt = -1): Promise<number[]> {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([n, reverse]) => {
        const host = document.querySelector<DrawerHost>('[data-testid="element-modal"]')!;
        const out: number[] = [];
        (window as unknown as { drawerTrace: number[] }).drawerTrace = out;
        const frame = () => {
          const drawer = host.querySelector<HTMLElement>('.m3e-navigation-drawer')!;
          out.push(Number.parseFloat(drawer.style.getPropertyValue('--_m3e-nd-offset')));
          if (out.length === reverse) host.close();
          if (out.length < n) requestAnimationFrame(frame);
        };
        // Open inside a frame so the spring starts on the clock's frame grid; record from the
        // next frame (after the layout's own callback).
        requestAnimationFrame(() => {
          host.show();
          queueMicrotask(() => {
            requestAnimationFrame(frame);
          });
        });
      },
      [frames, reverseAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { drawerTrace: number[] }).drawerTrace);
  }

  test('opens on the default spatial spring from −width, overshooting; close keeps the velocity', async ({
    page,
  }) => {
    const spatial = await spring(page, 'default-spatial');
    const effects = await spring(page, 'fast-effects');
    const frames = await trace(page, 90);
    // The first recorded frame is 16ms after the spring started.
    for (let i = 0; i < 16; i++) {
      expect(frames[i]!, `frame ${String(i)}`).toBeCloseTo(
        springValue(spatial, 16 * (i + 1), -360, 0),
        0,
      );
    }
    expect(Math.max(...frames.filter(Number.isFinite))).toBeGreaterThan(0);
    expect(frames.slice(60).some((f) => Number.isNaN(f))).toBe(true);

    await page.reload();
    await expect(page.getByTestId('open-modal')).toBeVisible();
    const reversed = await trace(page, 30, 8);
    const at = 16 * 8;
    const from = springValue(spatial, at, -360, 0);
    const velocity = springVelocity(spatial, at, -360, 0);
    for (let i = 8; i < 14; i++) {
      expect(reversed[i]!, `frame ${String(i)}`).toBeCloseTo(
        springValue(effects, 16 * (i - 7), from, -360, velocity),
        0,
      );
    }
  });

  test('mid-animation frame (frozen on the clock) matches the visual baseline', async ({
    page,
  }) => {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.getByTestId('element-modal').evaluate((host) => {
      requestAnimationFrame(() => {
        (host as DrawerHost).show();
      });
    });
    for (let i = 0; i < 7; i++) await page.clock.runFor(16);
    const drawer = root(page, 'element-modal');
    expect(
      Number.parseFloat(
        await drawer.evaluate((el) => el.style.getPropertyValue('--_m3e-nd-offset')),
      ),
    ).toBeCloseTo(springValue(await spring(page, 'default-spatial'), 96, -360, 0), 0);
    await expect(page).toHaveScreenshot('navigation-drawer-mid-animation.png');
  });
});
