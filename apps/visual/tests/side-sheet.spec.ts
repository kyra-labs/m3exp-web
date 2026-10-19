import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Side sheets (COMPONENT_SPEC §31; D8: m3.material.io only): the standard sheet beside the
// content, the modal sheet (a dialog) docked and detached, the adaptive variant, element and React.
// Acceptance (the modal traps focus and restores it; the standard sheet pushes the content at
// ≥ 840px) + CAC: axe, light/dark × 3 browsers baselines, forced colors, reduced motion and the
// drawer's springs (owner decision M9 #16) on the Playwright clock.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
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

type SheetHost = HTMLElement & { show(): void; close(): void; open?: boolean };
const rootOf = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-side-sheet');
const sheetOf = (root: Locator) => root.locator('.m3e-side-sheet__sheet');
/** Waits until a sheet rests (its layout removed data-animating). */
const rests = (root: Locator) =>
  expect.poll(() => root.evaluate((n) => n.hasAttribute('data-animating'))).toBe(false);

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

test.beforeEach(async ({ page }) => {
  await page.goto('/components/side-sheet/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-open-modal')).toBeVisible();
  await rests(rootOf(page, 'standard'));
});

test('has no axe violations (closed, and with each modal sheet open)', async ({ page }) => {
  const scan = async () => (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations;
  expect(await scan()).toEqual([]);
  for (const id of ['modal', 'modal-detached']) {
    const root = await open(page, id);
    expect(await scan(), id).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(root).not.toHaveAttribute('open');
  }
  await page.getByTestId('react-open-modal').click();
  await expect(page.getByTestId('react-modal')).toHaveAttribute('open', '');
  await rests(page.getByTestId('react-modal'));
  expect(await scan(), 'react modal').toEqual([]);
});

test('matches the visual baselines', async ({ page }) => {
  await expect(page).toHaveScreenshot('side-sheet-page.png', { fullPage: true });
  for (const id of ['modal', 'modal-detached']) {
    const root = await open(page, id);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`side-sheet-${id}.png`);
    await page.getByTestId(id).evaluate((n) => {
      (n as SheetHost).close();
    });
    await expect(root).not.toHaveAttribute('open');
  }
  // Keyboard: focus lands on the first button (the close button) with its focus ring.
  const root = await open(page, 'modal', true);
  await expect(root.locator('.m3e-side-sheet__close')).toBeFocused();
  await expect(page).toHaveScreenshot('side-sheet-modal-focus.png');
});

test('standard: pushes the content (does not overlay) at ≥ 840px, and closes from its button', async ({
  page,
}) => {
  expect(page.viewportSize()!.width).toBeGreaterThanOrEqual(840);
  const frame = page.getByTestId('standard-frame');
  const main = frame.locator('.docs-side-sheet-frame__main');
  const root = rootOf(page, 'standard');
  const frameBox = await box(frame);
  const sheet = await box(sheetOf(root));
  // 256dp at the frame's end, the main content ending where it starts.
  expect(sheet.width).toBeCloseTo(256, 0);
  expect(sheet.x + sheet.width).toBeCloseTo(frameBox.x + frameBox.width, 0);
  expect(sheet.height).toBeCloseTo(frameBox.height, 0);
  const openMain = await box(main);
  expect(openMain.x + openMain.width).toBeCloseTo(sheet.x, 0);
  // The close button asks to close; the content takes the space back; focus returns.
  const toggle = page.getByTestId('toggle-standard');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await rests(root);
  await expect(sheetOf(root)).toBeHidden();
  expect((await box(main)).width).toBeCloseTo(frameBox.width, 0);
  await page.keyboard.press('Enter');
  await rests(root);
  await expect(root.locator('.m3e-side-sheet__close')).toBeFocused();
  expect((await box(main)).width).toBeCloseTo(openMain.width, 0);
  await page.keyboard.press('Enter');
  await rests(root);
  expect(await page.getByTestId('standard').evaluate((n) => (n as SheetHost).open)).toBe(false);
  await expect(toggle).toBeFocused();
  // Escape in an open standard sheet closes it too (from its scrolling content: on the close
  // button, the docs tooltip example would take the first Escape).
  await toggle.click();
  await rests(root);
  await root.locator('.m3e-side-sheet__content').focus();
  await page.keyboard.press('Escape');
  await rests(root);
  await expect(sheetOf(root)).toBeHidden();
});

test('geometry and color from m3.material.io (token DB, Specs redlines)', async ({ page }) => {
  // Standard: surface, square corners, no shadow; the divider along its start edge (outline).
  const standard = sheetOf(rootOf(page, 'standard'));
  const s = await standard.evaluate((n) => {
    const c = getComputedStyle(n);
    return [
      c.backgroundColor,
      c.borderTopLeftRadius,
      c.boxShadow,
      c.borderLeftColor,
      c.borderLeftWidth,
    ];
  });
  expect(s).toEqual([
    await tokenColor(page, '--m3e-sys-color-surface'),
    '0px',
    'none',
    await tokenColor(page, '--m3e-sys-color-outline'),
    '1px',
  ]);
  // Modal, docked: at the window's end, full height, surface-container-low, 16dp start corners,
  // a level 1 shadow; the scrim at 0.32.
  const viewport = page.viewportSize()!;
  const root = await open(page, 'modal');
  const sheet = sheetOf(root);
  const m = await box(sheet);
  expect([m.x + m.width, m.y, m.width, m.height]).toEqual([
    viewport.width,
    0,
    256,
    viewport.height,
  ]);
  const style = await sheet.evaluate((n) => {
    const c = getComputedStyle(n);
    return {
      bg: c.backgroundColor,
      radius: [
        c.borderTopLeftRadius,
        c.borderTopRightRadius,
        c.borderBottomRightRadius,
        c.borderBottomLeftRadius,
      ],
      shadow: c.boxShadow !== 'none',
    };
  });
  expect(style).toEqual({
    bg: await tokenColor(page, '--m3e-sys-color-surface-container-low'),
    radius: ['16px', '0px', '0px', '16px'],
    shadow: true,
  });
  const scrim = root.locator('.m3e-side-sheet__scrim');
  expect(await box(scrim)).toEqual({ x: 0, y: 0, ...viewport });
  expect(await scrim.evaluate((n) => getComputedStyle(n).opacity)).toBe('0.32');
  // Header (Specs redline): 24dp above the 24dp icons, the headline 24dp in (no back button), the
  // close icon 24dp from the end; title large in on-surface-variant.
  const closeIcon = await box(root.locator('.m3e-side-sheet__close .m3e-icon'));
  expect([closeIcon.y - m.y, m.x + m.width - (closeIcon.x + closeIcon.width)]).toEqual([24, 24]);
  const headline = root.locator('.m3e-side-sheet__headline');
  expect((await box(headline)).x - m.x).toBeCloseTo(24, 0);
  expect(await headline.evaluate((n) => getComputedStyle(n).color)).toBe(
    await tokenColor(page, '--m3e-sys-color-on-surface-variant'),
  );
  // Title large: 22dp.
  expect(await headline.evaluate((n) => getComputedStyle(n).fontSize)).toBe('22px');
  const close = root.locator('.m3e-side-sheet__close');
  expect(await close.evaluate((n) => getComputedStyle(n, '::after').width)).toBe('48px');
  await page.keyboard.press('Escape');
  await expect(root).not.toHaveAttribute('open');
  // Detached: inset 16dp, all corners 16dp; with a back button the arrow is 16dp in and the
  // headline 12dp after it; the actions 16 / 24dp padded, start-aligned, the divider above them.
  const detached = await open(page, 'modal-detached');
  const d = await box(sheetOf(detached));
  expect([viewport.width - (d.x + d.width), d.y, viewport.height - (d.y + d.height)]).toEqual([
    16, 16, 16,
  ]);
  expect(await sheetOf(detached).evaluate((n) => getComputedStyle(n).borderBottomRightRadius)).toBe(
    '16px',
  );
  const backIcon = await box(detached.locator('.m3e-side-sheet__back .m3e-icon'));
  expect(backIcon.x - d.x).toBeCloseTo(16, 0);
  expect(
    (await box(detached.locator('.m3e-side-sheet__headline'))).x - (backIcon.x + 24),
  ).toBeCloseTo(12, 0);
  const actions = detached.locator('.m3e-side-sheet__actions');
  const a = await box(actions);
  const save = await box(actions.locator('button').first());
  expect([save.x - a.x, d.y + d.height - (save.y + save.height)]).toEqual([24, 24]);
  expect(await actions.evaluate((n) => getComputedStyle(n).borderTopColor)).toBe(
    await tokenColor(page, '--m3e-sys-color-outline'),
  );
});

test('modal is a dialog: named, inert page, focus trapped and restored (acceptance)', async ({
  page,
}) => {
  const root = await open(page, 'modal', true);
  await expect(root).toHaveRole('dialog');
  await expect(root).toHaveAccessibleName('Title');
  expect(await root.evaluate((n) => n.matches(':modal'))).toBe(true);
  const close = root.locator('.m3e-side-sheet__close');
  await expect(close).toBeFocused();
  await expect(close).toHaveAccessibleName('Close');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  expect(await root.evaluate((n) => n.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab');
  expect(await root.evaluate((n) => n.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(root).not.toHaveAttribute('open');
  await expect(page.getByTestId('open-modal')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  // The scrim and the close button close it too.
  await open(page, 'modal');
  await page.mouse.click(8, 8);
  await expect(root).not.toHaveAttribute('open');
  await open(page, 'modal');
  await close.click();
  await expect(root).not.toHaveAttribute('open');
  // The actions close the detached sheet (the page's script); the back button fires `back`.
  const detached = await open(page, 'modal-detached');
  const backs = await page.getByTestId('modal-detached').evaluate(
    (n) =>
      new Promise<number>((resolve) => {
        let count = 0;
        n.addEventListener('back', () => {
          count++;
        });
        n.querySelector<HTMLElement>('.m3e-side-sheet__back')!.click();
        requestAnimationFrame(() => {
          resolve(count);
        });
      }),
  );
  expect(backs).toBe(1);
  await expect(detached).toHaveAttribute('open', '');
  await detached.getByRole('button', { name: 'Save' }).click();
  await expect(detached).not.toHaveAttribute('open');
});

test('RTL: the modal sheet enters from the left edge, its open-side corners rounded', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  const root = await open(page, 'modal');
  const m = await box(sheetOf(root));
  expect([m.x, m.width]).toEqual([0, 256]);
  expect(
    await sheetOf(root).evaluate((n) => {
      const c = getComputedStyle(n);
      return [c.borderTopRightRadius, c.borderTopLeftRadius];
    }),
  ).toEqual(['16px', '0px']);
  await page.keyboard.press('Escape');
  await expect(root).not.toHaveAttribute('open');
});

test.describe('compact window (375 × 812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('adaptive is modal below 600dp; the modal sheet keeps its width', async ({ page }) => {
    const adaptive = rootOf(page, 'adaptive');
    expect(await adaptive.evaluate((n) => n.localName)).toBe('dialog');
    await page.getByTestId('adaptive').evaluate((n) => {
      (n as SheetHost).show();
    });
    await expect(adaptive).toHaveAttribute('open', '');
    await rests(adaptive);
    expect(await adaptive.evaluate((n) => n.matches(':modal'))).toBe(true);
    const s = await box(sheetOf(adaptive));
    expect([s.x + s.width, s.width]).toEqual([375, 256]);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('side-sheet-adaptive-compact.png');
    // The window grows past 600dp: the same sheet, open, now standard beside the content.
    await page.setViewportSize({ width: 1024, height: 812 });
    await expect(rootOf(page, 'adaptive')).toHaveJSProperty('localName', 'aside');
    await expect(rootOf(page, 'adaptive')).toHaveClass(/m3e-side-sheet--open/);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });
});

test('the docs tooltip on the close button (no built-in tooltip: Compose has no side sheet)', async ({
  page,
}) => {
  const close = rootOf(page, 'standard').locator('.m3e-side-sheet__close');
  await close.hover();
  const tip = page.getByTestId('close-tooltip').locator('.m3e-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Close');
});

test('React: the same contract, controlled through onOpenChange / onBack', async ({ page }) => {
  await page.getByTestId('react-open-modal').click();
  const modal = page.getByTestId('react-modal');
  await expect(modal).toHaveAttribute('open', '');
  await expect(modal).toHaveRole('dialog');
  await expect(modal).toHaveAccessibleName('Filters');
  await rests(modal);
  await modal.locator('.m3e-side-sheet__back').click();
  await expect(page.getByTestId('react-last')).toHaveText('back');
  await page.keyboard.press('Escape');
  await expect(modal).not.toHaveAttribute('open');
  await expect(page.getByTestId('react-last')).toHaveText('dismissed');
  await expect(page.getByTestId('react-open-modal')).toBeFocused();
  // The standard sheet reports its close button.
  const standard = page.getByTestId('react-standard');
  await standard.locator('.m3e-side-sheet__close').click();
  await expect(page.getByTestId('react-standard-value')).toHaveText('closed');
  await rests(standard);
  await expect(standard.locator('.m3e-side-sheet__sheet')).toBeHidden();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the sheets keep a visible boundary', async ({ page }) => {
    const standard = sheetOf(rootOf(page, 'standard'));
    expect(await standard.evaluate((n) => getComputedStyle(n).borderLeftStyle)).toBe('solid');
    const root = await open(page, 'modal');
    expect(await sheetOf(root).evaluate((n) => getComputedStyle(n).borderTopStyle)).toBe('solid');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the sheets jump (spatial duration 0, the effects-timed close 0ms)', async ({ page }) => {
    const offsets = await page.getByTestId('modal').evaluate(async (host) => {
      const root = host.querySelector<HTMLElement>('.m3e-side-sheet')!;
      const seen: string[] = [];
      const observer = new MutationObserver(() => {
        const t = root.style.getPropertyValue('--_m3e-ss-offset');
        if (t) seen.push(t);
      });
      observer.observe(root, { attributes: true, attributeFilter: ['style'] });
      (host as SheetHost).show();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      (host as SheetHost).close();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      observer.disconnect();
      return seen;
    });
    expect(offsets).toEqual([]);
    await expect(rootOf(page, 'modal')).not.toHaveAttribute('open');
  });
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('open-modal')).toBeVisible();
  });

  test('show() runs the default spatial spring from −width to 0, overshooting; close() the fast effects one', async ({
    page,
  }) => {
    const dampingRatio = Number(
      await token(page, '--m3e-sys-motion-spring-default-spatial-damping-ratio'),
    );
    const stiffness = Number(
      await token(page, '--m3e-sys-motion-spring-default-spatial-stiffness'),
    );
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(() => {
      const host = document.querySelector<SheetHost>('[data-testid="modal"]')!;
      const out: number[] = [];
      (window as unknown as { sheetTrace: number[] }).sheetTrace = out;
      const frame = () => {
        const root = host.querySelector<HTMLElement>('.m3e-side-sheet')!;
        out.push(Number.parseFloat(root.style.getPropertyValue('--_m3e-ss-offset')));
        if (out.length < 60) requestAnimationFrame(frame);
      };
      requestAnimationFrame(() => {
        host.show();
        queueMicrotask(() => {
          requestAnimationFrame(frame);
        });
      });
    });
    await page.clock.runFor(16 * 60 + 100);
    const frames = await page.evaluate(
      () => (window as unknown as { sheetTrace: number[] }).sheetTrace,
    );
    for (let i = 0; i < 12; i++) {
      expect(frames[i]!, `frame ${String(i)}`).toBeCloseTo(
        springValue({ dampingRatio, stiffness }, 16 * (i + 1), -256, 0),
        0,
      );
    }
    expect(Math.max(...frames.filter(Number.isFinite))).toBeGreaterThan(0);
    expect(frames.slice(40).some((f) => Number.isNaN(f))).toBe(true);
  });

  test('mid-animation frame (frozen on the clock) matches the visual baseline', async ({
    page,
  }) => {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.getByTestId('modal-detached').evaluate((host) => {
      requestAnimationFrame(() => {
        (host as SheetHost).show();
      });
    });
    for (let i = 0; i < 7; i++) await page.clock.runFor(16);
    await expect(page).toHaveScreenshot('side-sheet-mid-animation.png');
  });
});
