import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { expectTargetSizes } from './target-size.js';

// Bottom sheets (COMPONENT_SPEC §30): the modal sheet (a dialog), the standard sheet and its peek
// option, element and React. Acceptance (a fling down dismisses, the handle expands / collapses
// from the keyboard, the modal is a dialog) + CAC: axe, light/dark × 3 browsers baselines,
// forced colors, reduced motion (spatial duration 0) and the springs on the Playwright clock.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const spring = async (page: Page, name: string) => ({
  dampingRatio: Number(await token(page, `--m3e-sys-motion-spring-${name}-damping-ratio`)),
  stiffness: Number(await token(page, `--m3e-sys-motion-spring-${name}-stiffness`)),
});
/** A resolved token color, for comparing against computed styles. */
const tokenColor = (page: Page, name: string) =>
  page.evaluate((t) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${t})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

type SheetHost = HTMLElement & {
  show(): void;
  hide(): void;
  expand(): void;
  value?: string;
};
const rootOf = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-bottom-sheet');
const sheetOf = (page: Page, id: string) => rootOf(page, id).locator('.m3e-bottom-sheet__sheet');
const handleOf = (page: Page, id: string) => rootOf(page, id).locator('.m3e-bottom-sheet__handle');
/** Waits until a sheet rests (its layout removed data-animating). */
const rests = (root: Locator) =>
  expect.poll(() => root.evaluate((n) => n.hasAttribute('data-animating'))).toBe(false);
const valueOf = (page: Page, id: string) =>
  page.getByTestId(id).evaluate((n) => (n as SheetHost).value ?? 'hidden');

/** Opens a modal sheet from its trigger and waits for it to rest. */
async function open(page: Page, id: string, keyboard = false): Promise<Locator> {
  const trigger = page.getByTestId(`open-${id}`);
  if (keyboard) {
    await trigger.focus();
    await page.keyboard.press('Enter');
  } else {
    await trigger.click();
  }
  const root = rootOf(page, id);
  await expect(root).toHaveAttribute('open', '');
  await rests(root);
  return root;
}

/**
 * Presses Escape until the modal sheet closes: an expanded sheet with a PartiallyExpanded state
 * collapses first, and where the browser counts the programmatic focus on the handle as keyboard
 * focus (WebKit) or a hover shows the handle's tooltip, the first Escape hides that. Each press
 * waits for the sheet to rest: settleToDismiss reads the settled value, as Compose's does.
 */
async function escapeClose(page: Page, root: Locator): Promise<void> {
  const isOpen = () => root.evaluate((n) => (n as HTMLDialogElement).open);
  for (let i = 0; i < 5 && (await isOpen()); i++) {
    await page.keyboard.press('Escape');
    await rests(root);
    await page.waitForTimeout(50);
  }
  await expect(root).not.toHaveAttribute('open');
}

/** A vertical mouse drag from (x, y) by `dy`, in `steps` moves `pause` ms apart. */
async function drag(page: Page, x: number, y: number, dy: number, steps: number, pause: number) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, y + (dy * i) / steps);
    if (pause > 0) await page.waitForTimeout(pause);
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/components/bottom-sheet/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-open-modal')).toBeVisible();
  await rests(rootOf(page, 'standard'));
});

test('has no axe violations (closed, and with each modal sheet open)', async ({ page }) => {
  const scan = async () => (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations;
  expect(await scan()).toEqual([]);
  for (const id of ['modal', 'modal-skip', 'modal-short']) {
    const root = await open(page, id);
    expect(await scan(), id).toEqual([]);
    await escapeClose(page, root);
  }
});

test('matches the visual baselines', async ({ page }) => {
  await expect(page).toHaveScreenshot('bottom-sheet-page.png', { fullPage: true });
  for (const id of ['modal', 'modal-skip', 'modal-short']) {
    const root = await open(page, id);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`bottom-sheet-${id}.png`);
    await page.getByTestId(id).evaluate((n) => {
      (n as SheetHost).hide();
    });
    await expect(root).not.toHaveAttribute('open');
  }
  // Keyboard: the handle (the first stop) has the focus ring and shows its tooltip.
  await open(page, 'modal', true);
  await expect(handleOf(page, 'modal')).toBeFocused();
  await expect(page.locator('m3e-bottom-sheet[data-testid="modal"] .m3e-tooltip')).toBeVisible();
  await expect(page).toHaveScreenshot('bottom-sheet-handle-focus.png');
});

test('standard sheets at rest: partially expanded, expanded, the peek height', async ({ page }) => {
  const frame = page.getByTestId('standard-frame');
  const frameBox = await box(frame);
  const sheet = await box(sheetOf(page, 'standard'));
  // PartiallyExpanded: half the container (the sheet is taller).
  expect(sheet.y - frameBox.y).toBeCloseTo(frameBox.height / 2, 0);
  await handleOf(page, 'standard').click();
  await rests(rootOf(page, 'standard'));
  expect(await valueOf(page, 'standard')).toBe('expanded');
  await expect(frame).toHaveScreenshot('bottom-sheet-standard-expanded.png');
  // The peek option: 128dp of the sheet show.
  const peekFrame = await box(page.getByTestId('peek-frame'));
  const peek = await box(sheetOf(page, 'peek'));
  expect(peekFrame.y + peekFrame.height - peek.y).toBeCloseTo(128, 0);
});

test('geometry: 640dp max, centered, flush with the bottom, 28dp top corners, no shadow', async ({
  page,
}) => {
  const viewport = page.viewportSize()!;
  const root = await open(page, 'modal');
  const sheet = await box(root.locator('.m3e-bottom-sheet__sheet'));
  expect(sheet.width).toBeCloseTo(Math.min(640, viewport.width), 0);
  expect(sheet.x + sheet.width / 2).toBeCloseTo(viewport.width / 2, 0);
  // A tall sheet: PartiallyExpanded at half the window; the sheet reaches the bottom when expanded.
  expect(sheet.y).toBeCloseTo(viewport.height / 2, 0);
  const style = await root.locator('.m3e-bottom-sheet__sheet').evaluate((n) => {
    const s = getComputedStyle(n);
    return {
      radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius],
      shadow: s.boxShadow,
      bg: s.backgroundColor,
    };
  });
  expect(style).toEqual({
    radius: ['28px', '28px', '0px'],
    shadow: 'none',
    bg: await tokenColor(page, '--m3e-sys-color-surface-container-low'),
  });
  // The handle: a 32 × 48dp box centered at the top, the 32 × 4dp bar 22dp in, a 48dp target.
  const handle = root.locator('.m3e-bottom-sheet__handle');
  const h = await box(handle);
  expect([h.width, h.height]).toEqual([32, 48]);
  expect(h.y).toBeCloseTo(sheet.y, 0);
  expect(h.x + h.width / 2).toBeCloseTo(sheet.x + sheet.width / 2, 0);
  const bar = await box(handle.locator('.m3e-bottom-sheet__handle-bar'));
  expect([bar.width, bar.height, bar.y - h.y]).toEqual([32, 4, 22]);
  expect(
    await handle.evaluate((n) => {
      const after = getComputedStyle(n, '::after');
      return [after.width, after.height];
    }),
  ).toEqual(['48px', '48px']);
  expect(await handle.locator('span').evaluate((n) => getComputedStyle(n).backgroundColor)).toBe(
    await tokenColor(page, '--m3e-sys-color-on-surface-variant'),
  );
  // The scrim: ScrimTokens 0.32 over the window.
  const scrim = root.locator('.m3e-bottom-sheet__scrim');
  expect(await box(scrim)).toEqual({ x: 0, y: 0, ...viewport });
  expect(await scrim.evaluate((n) => getComputedStyle(n).opacity)).toBe('0.32');
  expect(await scrim.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe(
    await tokenColor(page, '--m3e-sys-color-scrim'),
  );
});

test.describe('compact window (375 × 812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the sheet spans the window width; expanded it fills the window', async ({ page }) => {
    const root = await open(page, 'modal');
    const sheet = root.locator('.m3e-bottom-sheet__sheet');
    expect(await box(sheet)).toMatchObject({ x: 0, width: 375 });
    expect((await box(sheet)).y).toBeCloseTo(406, 0);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('bottom-sheet-modal-compact.png');
    await page.getByTestId('modal').evaluate((n) => {
      (n as SheetHost).expand();
    });
    await rests(root);
    expect(await box(sheet)).toEqual({ x: 0, y: 0, width: 375, height: 812 });
  });
});

test('modal is a dialog: named, inert background, focus on the handle and trapped, returned', async ({
  page,
}) => {
  const root = await open(page, 'modal', true);
  await expect(root).toHaveRole('dialog');
  await expect(root).toHaveAccessibleName('Bottom Sheet');
  expect(await root.evaluate((n) => n.matches(':modal'))).toBe(true);
  const handle = handleOf(page, 'modal');
  await expect(handle).toBeFocused();
  await expect(handle).toHaveAccessibleName('Drag handle');
  // Tab stays inside.
  const trigger = page.getByTestId('open-modal');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab');
  expect(await root.evaluate((n) => n.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await handle.focus();
  // Escape: the first one hides the handle's tooltip (shown for keyboard focus), the next one
  // hides the PartiallyExpanded sheet (no expanded state to fall back from).
  const tip = page.locator('m3e-bottom-sheet[data-testid="modal"] .m3e-tooltip');
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(root).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(root).not.toHaveAttribute('open');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('keyboard: the handle expands and dismisses (Enter), ArrowUp / ArrowDown expand and collapse', async ({
  page,
}) => {
  const root = await open(page, 'modal', true);
  const handle = handleOf(page, 'modal');
  // D20 (9): the arrow keys are announced.
  await expect(handle).toHaveAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
  await page.keyboard.press('Enter');
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('expanded');
  await page.keyboard.press('ArrowDown');
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('partially-expanded');
  await page.keyboard.press('ArrowUp');
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('expanded');
  // Escape from expanded collapses first (settleToDismiss), then hides.
  await handle.focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('partially-expanded');
  await page.keyboard.press('Enter');
  await rests(root);
  await page.keyboard.press(' ');
  await expect(root).not.toHaveAttribute('open');
});

test('drags: a drag down past the threshold dismisses; a short one settles back; up expands', async ({
  page,
}) => {
  // Release velocities depend on the timing of the input events, which a loaded runner stretches
  // past VelocityTracker's 40ms pause; the thresholds and the velocity paths are unit-tested
  // (m3e-motion, m3e-elements). These drags travel far enough that every velocity they can
  // produce (0, under or over 125dp/s) picks the same anchor.
  const viewport = page.viewportSize()!;
  const x = viewport.width / 2;
  let root = await open(page, 'modal');
  let handle = await box(handleOf(page, 'modal'));
  // Short and slow (30px at ~100px/s): back to PartiallyExpanded.
  await drag(page, x, handle.y + 24, 30, 15, 20);
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('partially-expanded');
  expect((await box(root.locator('.m3e-bottom-sheet__sheet'))).y).toBeCloseTo(
    viewport.height / 2,
    0,
  );
  // 260px up from PartiallyExpanded (past the middle of the 360px between the anchors): Expanded.
  await drag(page, x, handle.y + 24, -260, 10, 5);
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('expanded');
  // 260px down from Expanded: the next anchor, PartiallyExpanded.
  handle = await box(handleOf(page, 'modal'));
  await drag(page, x, handle.y + 24, 260, 10, 5);
  await rests(root);
  expect(await valueOf(page, 'modal')).toBe('partially-expanded');
  // 260px down from PartiallyExpanded dismisses (COMPONENT_SPEC §30 acceptance).
  handle = await box(handleOf(page, 'modal'));
  await drag(page, x, handle.y + 24, 260, 10, 5);
  await expect(root).not.toHaveAttribute('open');
  expect(await valueOf(page, 'modal')).toBe('hidden');
  await expect(page.getByTestId('open-modal')).toBeFocused();
  // Slowly, the same.
  root = await open(page, 'modal');
  handle = await box(handleOf(page, 'modal'));
  await drag(page, x, handle.y + 24, 260, 50, 16);
  await expect(root).not.toHaveAttribute('open');
});

test('the scrim hides the sheet; drags from the list move it; the content behind a standard sheet works', async ({
  page,
}) => {
  const root = await open(page, 'modal');
  await page.mouse.click(8, 8);
  await expect(root).not.toHaveAttribute('open');
  await expect(page.getByTestId('open-modal')).toBeFocused();
  // Standard: the button behind the sheet's top is clickable; the handle dismisses an expanded
  // sheet, which the button shows again.
  const standard = rootOf(page, 'standard');
  await handleOf(page, 'standard').click();
  await rests(standard);
  await handleOf(page, 'standard').click();
  await rests(standard);
  expect(await valueOf(page, 'standard')).toBe('hidden');
  await expect(sheetOf(page, 'standard')).toBeHidden();
  await page.getByTestId('show-standard').click();
  await rests(standard);
  expect(await valueOf(page, 'standard')).toBe('partially-expanded');
  // The peek sheet skips Hidden: its handle collapses an expanded sheet.
  const peek = rootOf(page, 'peek');
  await handleOf(page, 'peek').click();
  await rests(peek);
  expect(await valueOf(page, 'peek')).toBe('expanded');
  await handleOf(page, 'peek').click();
  await rests(peek);
  expect(await valueOf(page, 'peek')).toBe('partially-expanded');
});

test('overflowing content is a scroll region (a group) named like its sheet (M11 a11y audit L9)', async ({
  page,
}) => {
  const content = rootOf(page, 'standard').locator('.m3e-bottom-sheet__content');
  await expect(content).toHaveAttribute('tabindex', '0');
  await expect(content).toHaveAttribute('role', 'group');
  await expect(content).toHaveAttribute('aria-label', 'Standard sheet');
  await expect(
    page.getByTestId('standard').getByRole('group', { name: 'Standard sheet' }),
  ).toHaveCount(1);
  const root = await open(page, 'modal');
  const modalContent = root.locator('.m3e-bottom-sheet__content');
  await expect(modalContent).toHaveAttribute('tabindex', '0');
  await expect(modalContent).toHaveAttribute('role', 'group');
  await expect(modalContent).toHaveAttribute('aria-label', 'Bottom Sheet');
});

test('keyboard focus on content a partially expanded sheet clips expands it (D21 (3), WCAG 2.4.11)', async ({
  page,
}) => {
  // The standard sheet: its scroll region's top shows, so focusing it keeps the sheet.
  await handleOf(page, 'standard').focus();
  await page.keyboard.press('Tab');
  await expect(rootOf(page, 'standard').locator('.m3e-bottom-sheet__content')).toBeFocused();
  await rests(rootOf(page, 'standard'));
  expect(await valueOf(page, 'standard')).toBe('partially-expanded');
  // The peek sheet: its button is below the 128dp that show (M11 a11y audit M1).
  const peek = rootOf(page, 'peek');
  const button = page.getByTestId('peek').getByRole('button', { name: 'Click to collapse sheet' });
  const frame = await box(page.getByTestId('peek-frame'));
  expect((await box(button)).y).toBeGreaterThan(frame.y + frame.height);
  await handleOf(page, 'peek').focus();
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  await rests(peek);
  expect(await valueOf(page, 'peek')).toBe('expanded');
  const shown = await box(button);
  expect(shown.y + shown.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
});

test('the drag handles have 48 × 48 hit areas (hit testing)', async ({ page }) => {
  await expectTargetSizes(handleOf(page, 'standard'), 'standard handle');
  const root = await open(page, 'modal');
  await expectTargetSizes(root.locator('.m3e-bottom-sheet__handle'), 'modal handle');
});

test('the handle shows its tooltip above it on hover', async ({ page }) => {
  await open(page, 'modal');
  const handle = handleOf(page, 'modal');
  await handle.hover();
  const tip = page.locator('m3e-bottom-sheet[data-testid="modal"] .m3e-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Drag handle');
  await expect(tip).toHaveAttribute('aria-hidden', 'true');
  const t = await box(tip);
  const h = await box(handle);
  // TooltipAnchorPosition.Above, centered on the handle.
  expect(t.y + t.height).toBeLessThanOrEqual(h.y + 1);
  expect(t.x + t.width / 2).toBeCloseTo(h.x + h.width / 2, 0);
});

test('React: the same contract, controlled through onOpenChange / onValueChange', async ({
  page,
}) => {
  await page.getByTestId('react-open-modal').click();
  const modal = page.getByTestId('react-modal');
  await expect(modal).toHaveAttribute('open', '');
  await expect(modal).toHaveRole('dialog');
  await expect(modal).toHaveAccessibleName('Bottom Sheet');
  await rests(modal);
  await expect(page.getByTestId('react-modal-value')).toHaveText('partially-expanded');
  await modal.locator('.m3e-bottom-sheet__handle').click();
  await expect(page.getByTestId('react-modal-value')).toHaveText('expanded');
  await escapeClose(page, modal);
  await expect(page.getByTestId('react-modal-value')).toHaveText('hidden');
  await expect(page.getByTestId('react-open-modal')).toBeFocused();
  // skipPartiallyExpanded: it opens expanded.
  await page.getByTestId('react-skip').check();
  await page.getByTestId('react-open-modal').click();
  await rests(modal);
  await expect(modal).toHaveClass(/m3e-bottom-sheet--expanded/);
  await escapeClose(page, modal);
  // The standard sheet reports its handle.
  const standard = page.getByTestId('react-standard');
  await standard.locator('.m3e-bottom-sheet__handle').click();
  await expect(page.getByTestId('react-standard-value')).toHaveText('expanded');
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the sheet keeps a visible boundary and the handle bar shows', async ({ page }) => {
    const root = await open(page, 'modal');
    const sheet = root.locator('.m3e-bottom-sheet__sheet');
    expect(await sheet.evaluate((n) => getComputedStyle(n).borderTopStyle)).toBe('solid');
    const bar = root.locator('.m3e-bottom-sheet__handle-bar');
    expect(await bar.evaluate((n) => getComputedStyle(n).backgroundColor)).not.toBe(
      await sheet.evaluate((n) => getComputedStyle(n).backgroundColor),
    );
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the sheet jumps (spatial duration 0); only the scrim fades', async ({ page }) => {
    const translates = await page.getByTestId('modal').evaluate(async (host) => {
      const root = host.querySelector<HTMLElement>('.m3e-bottom-sheet')!;
      const seen = new Set<string>();
      const observer = new MutationObserver(() => {
        const t = root.style.getPropertyValue('--_m3e-bs-translate');
        if (t) seen.add(t);
      });
      observer.observe(root, { attributes: true, attributeFilter: ['style'] });
      (host as SheetHost).show();
      for (let i = 0; i < 120 && root.hasAttribute('data-animating'); i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      (host as SheetHost).expand();
      for (let i = 0; i < 120 && root.hasAttribute('data-animating'); i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      observer.disconnect();
      return [...seen];
    });
    // One translate per move at most: its end position, written while the scrim fades.
    expect(translates.length).toBeLessThanOrEqual(2);
    const viewport = page.viewportSize()!;
    expect((await box(sheetOf(page, 'modal'))).y).toBeCloseTo(0, 0);
    expect(viewport.height).toBeGreaterThan(0);
  });

  test('focus on content the peek sheet clips expands it at once (D21 (3))', async ({ page }) => {
    const peek = rootOf(page, 'peek');
    await peek.evaluate((root) => {
      const seen: string[] = [];
      (window as unknown as { peekTranslates: string[] }).peekTranslates = seen;
      new MutationObserver(() => {
        if (root.hasAttribute('data-animating')) seen.push(root.style.cssText);
      }).observe(root, { attributes: true, attributeFilter: ['style', 'data-animating'] });
    });
    await handleOf(page, 'peek').focus();
    await page.keyboard.press('Tab');
    await rests(peek);
    expect(await valueOf(page, 'peek')).toBe('expanded');
    // No spring frames: at most the end position.
    const frames = await page.evaluate(
      () => (window as unknown as { peekTranslates: string[] }).peekTranslates,
    );
    expect(frames.length).toBeLessThanOrEqual(1);
  });
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('open-modal')).toBeVisible();
  });

  /** Shows the modal sheet inside a frame, recording its translate each 16ms frame. */
  async function trace(page: Page, frames: number): Promise<number[]> {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate((n) => {
      const host = document.querySelector<SheetHost>('[data-testid="modal"]')!;
      const out: number[] = [];
      (window as unknown as { sheetTrace: number[] }).sheetTrace = out;
      const frame = () => {
        const root = host.querySelector<HTMLElement>('.m3e-bottom-sheet')!;
        out.push(Number.parseFloat(root.style.getPropertyValue('--_m3e-bs-translate')));
        if (out.length < n) requestAnimationFrame(frame);
      };
      requestAnimationFrame(() => {
        host.show();
        queueMicrotask(() => {
          requestAnimationFrame(frame);
        });
      });
    }, frames);
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { sheetTrace: number[] }).sheetTrace);
  }

  test('show() runs the default spatial spring from Hidden to PartiallyExpanded, overshooting', async ({
    page,
  }) => {
    const viewport = page.viewportSize()!;
    const spatial = await spring(page, 'default-spatial');
    const full = viewport.height;
    const frames = await trace(page, 60);
    // A tall sheet fills the window: its rest is the top, so the translate is the offset.
    for (let i = 0; i < 12; i++) {
      expect(frames[i]!, `frame ${String(i)}`).toBeCloseTo(
        springValue(spatial, 16 * (i + 1), full, full / 2),
        0,
      );
    }
    expect(Math.min(...frames.filter(Number.isFinite))).toBeLessThan(full / 2);
    expect(frames.slice(40).some((f) => Number.isNaN(f))).toBe(true);
  });

  test('mid-animation frame (frozen on the clock) matches the visual baseline', async ({
    page,
  }) => {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.getByTestId('modal').evaluate((host) => {
      requestAnimationFrame(() => {
        (host as SheetHost).show();
      });
    });
    for (let i = 0; i < 7; i++) await page.clock.runFor(16);
    await expect(page).toHaveScreenshot('bottom-sheet-mid-animation.png');
  });
});
