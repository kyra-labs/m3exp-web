import AxeBuilder from '@axe-core/playwright';
import { PullToRefreshPull } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Pull to refresh (COMPONENT_SPEC §38; owner decisions M9 #27, #28): the arrow indicator, the
// loading indicator variant and React. Acceptance ("keyboard alternative refreshes") + CAC: axe,
// light/dark × 3 browsers baselines, forced colors, reduced motion (the indicator jumps), touch
// and pen only. Pulls are dispatched touch pointer events on the content (Playwright has no touch
// drag in Firefox / WebKit; pointer capture is stubbed, it needs a real pointer), checked against
// m3e-motion's port; Chromium also runs a real touch pull through CDP. Every geometry check waits
// for the indicator's spring to rest.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

type PtrHost = HTMLElement & { refreshing: boolean; readonly distanceFraction: number };

const hostOf = (page: Page, id: string) => page.getByTestId(id);
const rootOf = (page: Page, id: string) =>
  id === 'react-root' ? page.getByTestId(id) : hostOf(page, id).locator('.m3e-pull-to-refresh');
const frameOf = (page: Page, id: string) =>
  rootOf(page, id).locator('xpath=ancestor::div[contains(@class, "docs-ptr-frame")]');
/** The indicator's spring has stopped. */
const rests = (root: Locator) =>
  expect.poll(() => root.evaluate((n) => n.hasAttribute('data-animating'))).toBe(false);
/** The indicator box's top, relative to the content's top. */
const boxOffset = (root: Locator) =>
  root.evaluate((n) => {
    const content = n.querySelector('.m3e-pull-to-refresh__content')!.getBoundingClientRect();
    return n.querySelector('.m3e-pull-to-refresh__box')!.getBoundingClientRect().top - content.top;
  });
const itemCount = (root: Locator) => root.locator('.m3e-list-item').count();

/** Pointer capture needs a real pointer: dispatched events get a stand-in. */
const stubCapture = (root: Locator) =>
  root.evaluate((n) => {
    n.setPointerCapture = () => undefined;
    n.hasPointerCapture = () => false;
    n.releasePointerCapture = () => undefined;
  });

/**
 * A pull on the content: pointerdown, 9px past the slop, then `moves` (px, down positive), then
 * pointerup (or `end`).
 */
async function pull(
  root: Locator,
  moves: readonly number[],
  end: 'pointerup' | 'pointercancel' | null = 'pointerup',
  pointerType = 'touch',
): Promise<void> {
  await stubCapture(root);
  await root.locator('.m3e-pull-to-refresh__content').evaluate(
    (content, args) => {
      const target = content.querySelector('li') ?? content;
      const r = content.getBoundingClientRect();
      const x = r.left + r.width / 2;
      let y = r.top + 20;
      const fire = (type: string) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId: 41,
            pointerType: args.pointerType,
            isPrimary: true,
            clientX: x,
            clientY: y,
          }),
        );
      fire('pointerdown');
      y += 9;
      fire('pointermove');
      for (const m of args.moves) {
        y += m;
        fire('pointermove');
      }
      if (args.end) fire(args.end);
    },
    { moves: [...moves], end, pointerType },
  );
}

/** Ends the pull in progress (the pointer `pull` left down). */
const finish = (root: Locator, type: 'pointerup' | 'pointercancel', pointerType = 'touch') =>
  root.locator('.m3e-pull-to-refresh__content').evaluate(
    (content, args) => {
      const r = content.getBoundingClientRect();
      (content.querySelector('li') ?? content).dispatchEvent(
        new PointerEvent(args.type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 41,
          pointerType: args.pointerType,
          isPrimary: true,
          clientX: r.left + r.width / 2,
          clientY: r.top + 20,
        }),
      );
    },
    { type, pointerType },
  );

/** The port's distanceFraction after `moves` (threshold 80px). */
const expected = (moves: readonly number[]) => {
  const p = new PullToRefreshPull(80);
  for (const m of moves) p.consume(m, false);
  return p.distanceFraction;
};

test.beforeEach(async ({ page }) => {
  await page.goto('/components/pull-to-refresh/?delay=1500');
  await page.evaluate(() => document.fonts.ready);
  for (const id of ['default', 'loading', 'react-root']) {
    await expect(rootOf(page, id)).toHaveAttribute('data-at-top', '');
  }
});

test('has no axe violations (at rest, pulled, refreshing)', async ({ page }) => {
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  await pull(rootOf(page, 'default'), [60, 60], null);
  await hostOf(page, 'loading').evaluate((n) => {
    (n as PtrHost).refreshing = true;
  });
  await rests(rootOf(page, 'loading'));
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
});

test('matches the visual baselines', async ({ page }) => {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot('pull-to-refresh-page.png', { fullPage: true });

  // Arrow: pulled to 0.75 of the threshold (arc and head growing, MinAlpha), then past it
  // (MaxAlpha; the tension), then refreshing (the spinner's first frame: animations disabled).
  const root = rootOf(page, 'default');
  await pull(root, [60, 60], null);
  await expect.poll(() => boxOffset(root)).toBeCloseTo(expected([60, 60]) * 80 - 40, 0);
  await expect(frameOf(page, 'default')).toHaveScreenshot('pull-to-refresh-pulled.png');
  await finish(root, 'pointercancel');
  await rests(root);
  await pull(root, [100, 100, 60], null);
  await expect(root).toHaveAttribute('data-armed', '');
  await expect(frameOf(page, 'default')).toHaveScreenshot('pull-to-refresh-armed.png');
  await finish(root, 'pointercancel');
  await rests(root);
  await hostOf(page, 'default').evaluate((n) => {
    (n as PtrHost).refreshing = true;
  });
  await rests(root);
  // The spinner (CSS keyframes, restarted when the refresh starts) frozen 700ms into its cycle.
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      if ('animationName' in a && (a as CSSAnimation).animationName.startsWith('m3e-progress-')) {
        a.pause();
        a.currentTime = 700;
      } else if (a.effect?.getComputedTiming().endTime !== Infinity) {
        a.finish();
      }
    }
  });
  await expect(frameOf(page, 'default')).toHaveScreenshot('pull-to-refresh-refreshing.png', {
    animations: 'allow',
  });

  // Loading indicator: past the threshold (turned), then refreshing (its first frame under
  // reduced motion: the indeterminate morph runs on script).
  const loading = rootOf(page, 'loading');
  await pull(loading, [100, 100, 60], null);
  await expect(loading).toHaveAttribute('data-armed', '');
  await expect(frameOf(page, 'loading')).toHaveScreenshot('pull-to-refresh-loading-armed.png');
  await finish(loading, 'pointercancel');
  await rests(loading);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await hostOf(page, 'loading').evaluate((n) => {
    (n as PtrHost).refreshing = true;
  });
  await rests(loading);
  await expect(frameOf(page, 'loading')).toHaveScreenshot('pull-to-refresh-loading-refreshing.png');
});

test('keyboard alternative refreshes (the visible Refresh button)', async ({ page }) => {
  for (const [button, id] of [
    ['refresh-default', 'default'],
    ['refresh-react', 'react-root'],
  ] as const) {
    const root = rootOf(page, id);
    expect(await itemCount(root)).toBe(15);
    await page.getByTestId(button).focus();
    await page.keyboard.press('Enter');
    await expect(root).toHaveAttribute('data-refreshing', '');
    await rests(root);
    // At the threshold: 80dp × 1 − the 40dp box.
    expect(await boxOffset(root)).toBeCloseTo(40, 0);
    const spinner = root.locator('.m3e-pull-to-refresh__refreshing .m3e-circular-progress');
    await expect(spinner).toHaveAttribute('role', 'progressbar');
    await expect(root.locator('.m3e-pull-to-refresh__refreshing')).not.toHaveAttribute(
      'aria-hidden',
    );
    // The demo's refresh adds five items, then the indicator goes back.
    await expect.poll(() => itemCount(root)).toBe(20);
    await expect(root).not.toHaveAttribute('data-refreshing');
    await rests(root);
    expect(await boxOffset(root)).toBeCloseTo(-40, 0);
  }
});

test('a touch pull follows Compose’s pull math; a release past the threshold refreshes', async ({
  page,
}) => {
  const root = rootOf(page, 'default');
  for (const moves of [[40], [40, 40], [60, 60, 60], [100, 100, 100, 100]]) {
    await pull(root, moves, null);
    const f = expected(moves);
    // Below the threshold the indicator follows half the drag; past it, the tension (≤ 2×).
    expect(await boxOffset(root)).toBeCloseTo(f * 80 - 40, 0);
    await expect(root.locator('.m3e-pull-to-refresh__pull')).toHaveAttribute(
      'aria-valuenow',
      String(Math.round(Math.min(f, 1) * 100)),
    );
    await finish(root, 'pointercancel');
    await rests(root);
  }
  // Short of the threshold: back without refreshing.
  await pull(root, [80, 79]);
  await rests(root);
  await expect(root).not.toHaveAttribute('data-refreshing');
  expect(await boxOffset(root)).toBeCloseTo(-40, 0);
  // Past it: refresh (the demo adds five items after its delay).
  await pull(root, [100, 100]);
  await expect(root).toHaveAttribute('data-refreshing', '');
  await expect.poll(() => itemCount(root)).toBe(20);
  // Pulls while refreshing do nothing; moving up after a pull scrolls the content.
  await expect(root).not.toHaveAttribute('data-refreshing');
  await rests(root);
  await pull(root, [60, -60, -100], null);
  const content = root.locator('.m3e-pull-to-refresh__content');
  await expect.poll(() => content.evaluate((n) => n.scrollTop)).toBe(100);
  await expect(root).not.toHaveAttribute('data-pulled');
  await expect(root).not.toHaveAttribute('data-at-top');
  await finish(root, 'pointerup');
});

test('mouse drags and wheels never pull; pen pulls do', async ({ page }) => {
  const root = rootOf(page, 'default');
  const content = root.locator('.m3e-pull-to-refresh__content');
  const box = (await content.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 200, { steps: 10 });
  await expect(root).not.toHaveAttribute('data-pulled');
  await page.mouse.up();
  await page.mouse.wheel(0, -300);
  await expect(root).not.toHaveAttribute('data-pulled');
  await pull(root, [60, 60], null, 'mouse');
  await expect(root).not.toHaveAttribute('data-pulled');
  await pull(root, [60, 60], null, 'pen');
  await expect(root).toHaveAttribute('data-pulled', '');
  await finish(root, 'pointercancel', 'pen');
});

test('a real touch pull (Chromium, CDP) refreshes without scrolling the page', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium-only');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const root = rootOf(page, 'default');
  const content = root.locator('.m3e-pull-to-refresh__content');
  await content.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => window.scrollY);
  const box = (await content.boundingBox())!;
  const x = box.x + box.width / 2;
  let y = box.y + 20;
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd') =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
  await touch('touchStart');
  for (let i = 0; i < 20; i++) {
    y += 12;
    await touch('touchMove');
  }
  await expect(root).toHaveAttribute('data-armed', '');
  expect(await content.evaluate((n) => n.scrollTop)).toBe(0);
  await touch('touchEnd');
  await expect(root).toHaveAttribute('data-refreshing', '');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await expect.poll(() => itemCount(root)).toBe(20);
});

test('React renders the arrow and the loading indicator and pulls the same way', async ({
  page,
}) => {
  const root = rootOf(page, 'react-root');
  await pull(root, [60, 60], null);
  expect(await boxOffset(root)).toBeCloseTo(expected([60, 60]) * 80 - 40, 0);
  await finish(root, 'pointercancel');
  await rests(root);
  await page.getByTestId('react-indicator').selectOption('loading-indicator');
  await expect(root).toHaveClass(/m3e-pull-to-refresh--loading-indicator/);
  await pull(root, [60, 60], null);
  // The 48dp box: fraction × 80 − 48.
  expect(await boxOffset(root)).toBeCloseTo(expected([60, 60]) * 80 - 48, 0);
  await expect(root.locator('.m3e-pull-to-refresh__pull .m3e-loading-indicator')).toHaveAttribute(
    'aria-valuenow',
    String(Math.round(Math.min(expected([60, 60]), 1) * 100)),
  );
  await finish(root, 'pointercancel');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the indicator jumps (spatial spring: 0ms)', async ({ page }) => {
    const root = rootOf(page, 'default');
    await hostOf(page, 'default').evaluate((n) => {
      (n as PtrHost).refreshing = true;
    });
    await expect(root).toHaveAttribute('data-refreshing', '');
    expect(await root.evaluate((n) => n.hasAttribute('data-animating'))).toBe(false);
    expect(await boxOffset(root)).toBeCloseTo(40, 0);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the indicator keeps a CanvasText boundary', async ({ page }) => {
    const root = rootOf(page, 'default');
    await pull(root, [100, 100], null);
    const border = await root
      .locator('.m3e-pull-to-refresh__box')
      .evaluate((n) => getComputedStyle(n).borderTopStyle);
    expect(border).toBe('solid');
    await finish(root, 'pointercancel');
  });
});
