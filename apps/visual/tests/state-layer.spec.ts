import { type Locator, type Page, expect, test } from '@playwright/test';

// State layer with the ripple (FOUNDATIONS §6, REQUIREMENTS §12) on hosts that carry
// [data-ripple]: every m3e-react component (useStateLayer) and m3e-elements attachRipple hosts.
// Hover, focus and dragged overlays fill the whole host; a press grows a circle from the press
// point; release fades back without the circle shrinking.

const sys = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
/** A CSS time ("149ms", ".149s") in milliseconds. */
const ms = (time: string) => Number.parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000);
const layer = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node, '::before');
    // The registered <length-percentage> computes to e.g. "calc(0% + 57.3px)": take the px part.
    const px = (v: string) => Number.parseFloat(/(-?[\d.]+)px/.exec(v)?.[1] ?? 'NaN');
    return {
      display: s.display,
      opacity: Number.parseFloat(s.opacity),
      image: s.backgroundImage,
      animation: s.animationName,
      duration: s.animationDuration,
      size: px(s.getPropertyValue('--_m3e-ripple-size')),
      radius: px(getComputedStyle(node).getPropertyValue('--_m3e-ripple-radius')),
    };
  });
const opacity = async (el: Locator) => (await layer(el)).opacity;
/** Pressed layer composited over the resting one (state-layer.css). */
const composite = (rest: number, pressed: number) => rest + pressed - rest * pressed;
/** Counts ripple animation starts on the host's ::before. */
const countRipples = (el: Locator) =>
  el.evaluate((node) => {
    const w = window as unknown as { __ripples: number };
    w.__ripples = 0;
    node.addEventListener('animationstart', (e) => {
      if ((e as AnimationEvent).animationName === 'm3e-ripple-grow') w.__ripples += 1;
    });
  });
const ripples = (page: Page) =>
  page.evaluate(() => (window as unknown as { __ripples: number }).__ripples);
// Interactive cards: the action's stretched hit area covers the body text; point at the padding.
const CORNER = { position: { x: 12, y: 12 } };

interface HostCase {
  name: string;
  path: string;
  /** Element the pointer hovers. */
  target: (page: Page) => Locator;
  /** Element whose ::before is the overlay (carries data-ripple). */
  host: (page: Page) => Locator;
  hover?: Parameters<Locator['hover']>[0];
  /** Press point as a fraction of the target box (default: upper-left quarter). */
  press?: { x: number; y: number };
}

const HOSTS: HostCase[] = [
  {
    name: 'React button',
    path: '/components/button/',
    target: (page) => page.getByTestId('react-buttons').locator('button').first(),
    host: (page) => page.getByTestId('react-buttons').locator('button').first(),
  },
  {
    name: 'React icon button',
    path: '/components/icon-button/',
    target: (page) => page.getByTestId('react-icon-buttons').locator('button').first(),
    host: (page) => page.getByTestId('react-icon-buttons').locator('button').first(),
  },
  {
    name: 'React assist chip',
    path: '/components/assist-chip/',
    target: (page) => page.getByTestId('react-chips').locator('.m3e-assist-chip').first(),
    host: (page) => page.getByTestId('react-chips').locator('.m3e-assist-chip').first(),
  },
  {
    name: 'React card',
    path: '/components/card/',
    target: (page) => page.getByTestId('react-cards').locator('.m3e-card').first(),
    host: (page) => page.getByTestId('react-cards').locator('.m3e-card').first(),
    hover: CORNER,
    // Presses land on the action's stretched hit area (the body), not the padding.
    press: { x: 0.5, y: 0.5 },
  },
  {
    name: 'React navigation item (indicator pill proxy)',
    path: '/components/navigation-bar/',
    target: (page) => page.getByTestId('react-bar').locator('.m3e-navigation-item').nth(1),
    host: (page) =>
      page
        .getByTestId('react-bar')
        .locator('.m3e-navigation-item')
        .nth(1)
        .locator('.m3e-navigation-item__state'),
  },
  {
    name: 'attachRipple tile (m3e-elements)',
    path: '/components/primitives/',
    target: (page) => page.locator('#state-demo button').first(),
    host: (page) => page.locator('#state-demo button').first(),
  },
];

for (const c of HOSTS) {
  test.describe(c.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(c.path);
      await page.evaluate(() => document.fonts.ready);
      await expect(c.host(page)).toHaveAttribute('data-ripple', '');
      await c.target(page).scrollIntoViewIfNeeded();
    });

    test('hover fills the whole host with the hover layer', async ({ page }) => {
      const host = c.host(page);
      const hover = await sys(page, '--m3e-sys-state-hover-state-layer-opacity');
      const rest = await host.screenshot();
      expect(await opacity(host)).toBe(0);
      await c.target(page).hover(c.hover);
      await expect.poll(() => opacity(host)).toBeCloseTo(hover, 2);
      // A flat fill, not the (empty) ripple circle.
      expect((await layer(host)).image).toBe('none');
      const hovered = await host.screenshot();
      expect(hovered.equals(rest), 'hovered pixels differ from rest').toBe(false);
    });

    test('press grows a circle from the press point; release fades without shrinking', async ({
      page,
    }) => {
      const host = c.host(page);
      const hover = await sys(page, '--m3e-sys-state-hover-state-layer-opacity');
      const pressed = await sys(page, '--m3e-sys-state-pressed-state-layer-opacity');
      await countRipples(host);
      const box = (await c.target(page).boundingBox())!;
      const at = c.press ?? { x: 0.25, y: 0.25 };
      await page.mouse.move(box.x + box.width * at.x, box.y + box.height * at.y);
      await page.mouse.down();
      await expect(host).toHaveAttribute('data-pressed', '');
      const during = await layer(host);
      expect(during.image).toContain('radial-gradient');
      expect(during.animation).toBe('m3e-ripple-grow');
      // Hovered press: the pressed layer composites over the hover layer (outer ring = hover).
      expect(during.opacity).toBeCloseTo(composite(hover, pressed), 2);
      // The circle ends at the radius the JS measured (press point to farthest corner).
      await expect.poll(async () => (await layer(host)).size).toBeCloseTo(during.radius, 0);
      await page.mouse.up();
      await expect(host).not.toHaveAttribute('data-pressed', '');
      // No circle left to shrink: a flat fill fading back to the hover layer.
      expect((await layer(host)).image).toBe('none');
      await expect.poll(() => opacity(host)).toBeCloseTo(hover, 2);
      // A re-press restarts the growth (held until it starts: a press and release within one
      // frame never computes the pressed style at all).
      await page.mouse.down();
      await expect(host).toHaveAttribute('data-pressed', '');
      await expect.poll(() => ripples(page)).toBe(2);
      await page.mouse.up();
    });
  });
}

test.describe('keyboard', () => {
  test('React button: focus fills the host; a keyboard press ripples from the center', async ({
    page,
  }) => {
    await page.goto('/components/button/');
    const button = page.getByTestId('react-buttons').locator('button').first();
    await expect(button).toHaveAttribute('data-ripple', '');
    const focus = await sys(page, '--m3e-sys-state-focus-state-layer-opacity');
    const pressed = await sys(page, '--m3e-sys-state-pressed-state-layer-opacity');
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await expect.poll(() => opacity(button)).toBeCloseTo(focus, 2);
    expect((await layer(button)).image).toBe('none');
    await page.keyboard.down('Space');
    await expect(button).toHaveAttribute('data-pressed', '');
    const during = await layer(button);
    expect(during.image).toContain('radial-gradient');
    expect(during.opacity).toBeCloseTo(composite(focus, pressed), 2);
    const center = await button.evaluate((el) => [
      el.style.getPropertyValue('--_m3e-ripple-x'),
      el.style.getPropertyValue('--_m3e-ripple-y'),
      el.getBoundingClientRect().width / 2,
      el.getBoundingClientRect().height / 2,
    ]);
    expect(Number.parseFloat(String(center[0]))).toBeCloseTo(Number(center[2]), 0);
    expect(Number.parseFloat(String(center[1]))).toBeCloseTo(Number(center[3]), 0);
    await page.keyboard.up('Space');
    await expect.poll(() => opacity(button)).toBeCloseTo(focus, 2);
  });

  test('React card: focus on the action fills the card (:has proxy)', async ({ page }) => {
    await page.goto('/components/card/');
    const card = page.getByTestId('react-cards').locator('.m3e-card').first();
    const action = card.locator('.m3e-card__action');
    await expect(card).toHaveAttribute('data-ripple', '');
    const focus = await sys(page, '--m3e-sys-state-focus-state-layer-opacity');
    await action.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(action).toBeFocused();
    await expect.poll(() => opacity(card)).toBeCloseTo(focus, 2);
    expect((await layer(card)).image).toBe('none');
  });

  test('React navigation item: focus fills the indicator pill', async ({ page }) => {
    await page.goto('/components/navigation-bar/');
    const items = page.getByTestId('react-bar').locator('.m3e-navigation-item');
    const state = items.nth(0).locator('.m3e-navigation-item__state');
    await expect(state).toHaveAttribute('data-ripple', '');
    const focus = await sys(page, '--m3e-sys-state-focus-state-layer-opacity');
    await items.nth(0).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(items.nth(0)).toBeFocused();
    await expect.poll(() => opacity(state)).toBeCloseTo(focus, 2);
    expect((await layer(state)).image).toBe('none');
  });
});

test.describe('screenshots', () => {
  test('React button row: hovered, focused, pressed', async ({ page }) => {
    await page.goto('/components/button/');
    await page.evaluate(() => document.fonts.ready);
    const row = page.getByTestId('react-buttons');
    const button = row.locator('button').first();
    await button.scrollIntoViewIfNeeded();
    await button.hover();
    await expect(row).toHaveScreenshot('state-layer-react-button-hovered.png');
    await page.mouse.move(0, 0);
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    const b = (await row.boundingBox())!;
    await expect(page).toHaveScreenshot('state-layer-react-button-focused.png', {
      clip: { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 },
    });
    await page.mouse.move(0, 0);
    await button.blur();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.down();
    await expect(button).toHaveAttribute('data-pressed', '');
    await expect(row).toHaveScreenshot('state-layer-react-button-pressed.png');
    await page.mouse.up();
  });

  test('React card hovered', async ({ page }) => {
    await page.goto('/components/card/');
    await page.evaluate(() => document.fonts.ready);
    const card = page.getByTestId('react-cards').locator('.m3e-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover(CORNER);
    await expect(card).toHaveScreenshot('state-layer-react-card-hovered.png');
  });

  test('React navigation bar: item hovered', async ({ page }) => {
    await page.goto('/components/navigation-bar/');
    await page.evaluate(() => document.fonts.ready);
    const bar = page.getByTestId('react-bar');
    await bar.scrollIntoViewIfNeeded();
    await bar.locator('.m3e-navigation-item').nth(1).hover();
    await expect(bar).toHaveScreenshot('state-layer-react-navigation-bar-hovered.png');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the ripple grows with the fast effects spring', async ({ page }) => {
    await page.goto('/components/button/');
    const button = page.getByTestId('react-buttons').locator('button').first();
    await button.scrollIntoViewIfNeeded();
    const fast = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue(
        '--m3e-sys-motion-spring-fast-effects-duration',
      ),
    );
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(button).toHaveAttribute('data-pressed', '');
    expect(ms((await layer(button)).duration)).toBeCloseTo(ms(fast), 0);
    await page.mouse.up();
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('React hosts draw no state layer', async ({ page }) => {
    await page.goto('/components/button/');
    const button = page.getByTestId('react-buttons').locator('button').first();
    await button.hover();
    expect((await layer(button)).display).toBe('none');
  });
});
