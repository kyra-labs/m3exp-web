import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Dialogs (COMPONENT_SPEC §29): focus returns to the trigger, the background is inert, native
// <dialog> with a focus trap and Escape, Compose AlertDialog geometry, the scrim and motion (owner
// decisions M9 #8–#11), the full-screen dialog's two layouts, forced colors, axe and light/dark ×
// 3 browsers baselines.
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const rect = (el: Locator): Promise<Rect> =>
  el.evaluate((node) => {
    const { x, y, width, height } = node.getBoundingClientRect();
    return { x, y, width, height };
  });

/** A resolved token value, for comparing against computed styles. */
const tokenColor = (page: Page, name: string) =>
  page.evaluate((token) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

const dialogOf = (page: Page, id: string) =>
  page.locator(`m3e-dialog[data-testid="${id}"] > dialog`);

/** Opens a dialog from its trigger and waits for the open motion to end. */
async function open(page: Page, id: string, keyboard = false): Promise<Locator> {
  const trigger = page.getByTestId(`open-${id}`);
  if (keyboard) {
    await trigger.focus();
    await page.keyboard.press('Enter');
  } else {
    await trigger.click();
  }
  const dialog = dialogOf(page, id);
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog).not.toHaveAttribute('data-motion');
  return dialog;
}

async function closed(dialog: Locator): Promise<void> {
  await expect(dialog).not.toHaveAttribute('open');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/components/dialog/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-open-alert')).toBeVisible();
});

test('has no axe violations (closed, and with each dialog open)', async ({ page }) => {
  const scan = async () =>
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
    ).violations;
  expect(await scan()).toEqual([]);
  for (const id of ['alert-icon', 'alert-scroll', 'custom', 'full-screen']) {
    const dialog = await open(page, id);
    expect(await scan(), id).toEqual([]);
    await page.keyboard.press('Escape');
    await closed(dialog);
  }
});

test('matches the visual baselines', async ({ page }) => {
  await expect(page).toHaveScreenshot('dialog-page.png', { fullPage: true });
  for (const id of ['alert', 'alert-icon', 'alert-stacked', 'alert-scroll', 'custom']) {
    const dialog = await open(page, id);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`dialog-${id}.png`);
    await page.keyboard.press('Escape');
    await closed(dialog);
  }
  // Keyboard: the first control has the focus ring.
  await open(page, 'alert', true);
  await expect(page).toHaveScreenshot('dialog-alert-focus.png');
  await page.keyboard.press('Escape');
  // From 600dp the full-screen dialog is laid out as a basic dialog.
  await open(page, 'full-screen');
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot('dialog-full-screen-basic.png');
});

test.describe('compact window (375 × 812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the full-screen dialog fills the window; the header takes the on-scroll color', async ({
    page,
  }) => {
    const dialog = await open(page, 'full-screen');
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('dialog-full-screen.png');
    const container = dialog.locator('.m3e-dialog__container');
    expect(await rect(container)).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    const header = dialog.locator('.m3e-dialog__header');
    expect((await rect(header)).height).toBe(56);
    const surface = await tokenColor(page, '--m3e-sys-color-surface');
    const scrolledColor = await tokenColor(page, '--m3e-sys-color-surface-container');
    const bg = (el: Locator) => el.evaluate((n) => getComputedStyle(n).backgroundColor);
    expect(await bg(header)).toBe(surface);
    expect(await container.evaluate((n) => getComputedStyle(n, '::before').backgroundColor)).toBe(
      surface,
    );
    expect(await container.evaluate((n) => getComputedStyle(n).borderTopLeftRadius)).toBe('0px');
    // Close, headline, action in the header row; the close icon 16dp from the start edge.
    const icon = await rect(dialog.locator('.m3e-dialog__close .m3e-icon'));
    expect(icon.x).toBe(16);
    const save = await rect(page.getByTestId('full-screen-save'));
    expect(save.y + save.height / 2).toBeCloseTo(28, 0);
    expect(save.x + save.width).toBeLessThanOrEqual(375 - 8);
    await expect(dialog.locator('.m3e-dialog__headline')).toHaveCSS('font-size', '22px');

    await dialog.locator('.m3e-dialog__content').evaluate((n) => {
      n.scrollTop = 120;
    });
    await expect(dialog).toHaveAttribute('data-scrolled', '');
    await expect.poll(() => bg(header)).toBe(scrolledColor);
    await expect(page).toHaveScreenshot('dialog-full-screen-scrolled.png');
    await dialog.locator('.m3e-dialog__close').click();
    await closed(dialog);
    await expect(page.getByTestId('open-full-screen')).toBeFocused();
  });
});

test('AlertDialog geometry: 280–560dp, 24dp padding, 16dp gaps, end-aligned buttons', async ({
  page,
}) => {
  const viewport = page.viewportSize()!;
  const dialog = await open(page, 'alert-icon');
  const container = await rect(dialog.locator('.m3e-dialog__container'));
  expect(container.width).toBeGreaterThanOrEqual(280);
  expect(container.width).toBeLessThanOrEqual(560);
  expect(container.x + container.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(container.y + container.height / 2).toBeCloseTo(viewport.height / 2, 0);
  const icon = await rect(dialog.locator('.m3e-dialog__icon'));
  expect(icon).toMatchObject({ width: 24, height: 24 });
  expect(icon.y - container.y).toBe(24);
  expect(icon.x + 12).toBeCloseTo(container.x + container.width / 2, 0);
  const headline = await rect(dialog.locator('.m3e-dialog__headline'));
  expect(headline.y - (icon.y + icon.height)).toBe(16);
  // With an icon the headline is centered.
  expect(headline.x + headline.width / 2).toBeCloseTo(container.x + container.width / 2, 0);
  const content = await rect(dialog.locator('.m3e-dialog__content'));
  expect(content.y - (headline.y + headline.height)).toBe(16);
  expect(content.x - container.x).toBe(24);
  const [dismiss, confirm] = await Promise.all(
    [0, 1].map((i) => rect(dialog.locator('.m3e-dialog__actions > button').nth(i))),
  );
  // Each button keeps 4dp of its 48dp minimum interactive size above and below.
  expect(container.y + container.height - (confirm!.y + confirm!.height)).toBe(24 + 4);
  expect(confirm!.y - (content.y + content.height)).toBe(4);
  expect(container.x + container.width - (confirm!.x + confirm!.width)).toBe(24);
  expect(confirm!.x - (dismiss!.x + dismiss!.width)).toBe(8);
  expect(confirm!.y).toBe(dismiss!.y);

  const style = await dialog.locator('.m3e-dialog__container').evaluate((n) => {
    const s = getComputedStyle(n);
    const before = getComputedStyle(n, '::before');
    return { radius: s.borderTopLeftRadius, shadow: s.boxShadow, bg: before.backgroundColor };
  });
  expect(style).toEqual({
    radius: '28px',
    shadow: 'none',
    bg: await tokenColor(page, '--m3e-sys-color-surface-container-high'),
  });
  const scrim = dialog.locator('.m3e-dialog__scrim');
  expect(await rect(scrim)).toEqual({ x: 0, y: 0, ...viewport });
  expect(await scrim.evaluate((n) => getComputedStyle(n).opacity)).toBe('0.32');
  expect(await scrim.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe(
    await tokenColor(page, '--m3e-sys-color-scrim'),
  );
});

test('stacked buttons: the confirm button on top, both at the end, 8dp apart', async ({ page }) => {
  const dialog = await open(page, 'alert-stacked');
  const buttons = dialog.locator('.m3e-dialog__actions > button');
  const keep = await rect(buttons.nth(0));
  const turnOff = await rect(buttons.nth(1));
  expect(turnOff.y).toBeLessThan(keep.y);
  expect(keep.y - (turnOff.y + turnOff.height)).toBe(8);
  expect(keep.x + keep.width).toBeCloseTo(turnOff.x + turnOff.width, 0);
});

test('long content scrolls between the pinned headline and buttons', async ({ page }) => {
  const viewport = page.viewportSize()!;
  const dialog = await open(page, 'alert-scroll');
  const container = await rect(dialog.locator('.m3e-dialog__container'));
  expect(container.y).toBe(24);
  expect(container.height).toBe(viewport.height - 48);
  const content = dialog.locator('.m3e-dialog__content');
  expect(
    await content.evaluate((n) => n.scrollHeight > n.clientHeight && getComputedStyle(n).overflowY),
  ).toBe('auto');
  await expect(dialog.locator('.m3e-dialog__actions')).toBeInViewport({ ratio: 1 });
});

test('native <dialog>: alertdialog named by the headline, background inert, focus trapped', async ({
  page,
}) => {
  const dialog = await open(page, 'alert');
  await expect(dialog).toHaveRole('alertdialog');
  await expect(dialog).toHaveAccessibleName('Title');
  await expect(dialog).toHaveAccessibleDescription('Turned on by default');
  expect(await dialog.evaluate((n) => n.matches(':modal'))).toBe(true);
  // Focus starts on the first control (m3.material.io Accessibility › Initial focus).
  const buttons = dialog.locator('.m3e-dialog__actions > button');
  await expect(buttons.nth(0)).toBeFocused();
  // Background inert: the trigger can neither take focus nor a click.
  const trigger = page.getByTestId('open-alert');
  expect(
    await trigger.evaluate((n) => {
      (n as HTMLElement).focus();
      return document.activeElement === n;
    }),
  ).toBe(false);
  // Tab cycles inside the dialog.
  await page.keyboard.press('Tab');
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(buttons.nth(0)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(buttons.nth(1)).toBeFocused();
});

test('Escape, the scrim and the actions close it; focus returns to the trigger', async ({
  page,
}) => {
  let dialog = await open(page, 'alert', true);
  await page.keyboard.press('Escape');
  await closed(dialog);
  await expect(page.getByTestId('open-alert')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');

  dialog = await open(page, 'alert-icon');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await page.mouse.click(8, 8);
  await closed(dialog);
  await expect(page.getByTestId('open-alert-icon')).toBeFocused();

  dialog = await open(page, 'custom');
  await expect(dialog).toHaveAccessibleName('Supportive text');
  await expect(dialog).toHaveRole('dialog');
  await dialog.getByRole('button', { name: 'Confirm' }).click();
  await closed(dialog);
  await expect(page.getByTestId('open-custom')).toBeFocused();
});

test('motion: Material Web open / close, the scrim on DefaultEffects (#9)', async ({ page }) => {
  await page.getByTestId('open-alert').click();
  const dialog = dialogOf(page, 'alert');
  await expect(dialog).toHaveAttribute('data-motion', 'enter');
  const timings = await dialog.evaluate((n) =>
    n.getAnimations({ subtree: true }).map((a) => {
      const t = a.effect!.getTiming();
      return `${(a as CSSAnimation).animationName} ${String(t.duration)} ${String(t.delay)}`;
    }),
  );
  // The DefaultEffects spring's duration token, in ms (the computed value may be in seconds).
  const effects = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.transitionDuration = 'var(--m3e-sys-motion-spring-default-effects-duration)';
    document.body.append(probe);
    const value = getComputedStyle(probe).transitionDuration;
    probe.remove();
    return Math.round(Number.parseFloat(value) * (value.endsWith('ms') ? 1 : 1000));
  });
  expect(timings).toEqual(
    expect.arrayContaining([
      `m3e-dialog-fade-in ${String(effects)} 0`,
      'm3e-dialog-slide-in 500 0',
      'm3e-dialog-grow 500 0',
      'm3e-dialog-fade-in 50 0',
      'm3e-dialog-fade-in 200 50',
      'm3e-dialog-fade-in 150 150',
    ]),
  );
  await expect(dialog).not.toHaveAttribute('data-motion');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveAttribute('data-motion', 'exit');
  const exit = await dialog.evaluate((n) =>
    n.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName),
  );
  expect(exit).toEqual(
    expect.arrayContaining(['m3e-dialog-slide-out', 'm3e-dialog-shrink', 'm3e-dialog-fade-out']),
  );
  await closed(dialog);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('fades only: no slide, no growth', async ({ page }) => {
    await page.getByTestId('open-alert').click();
    const dialog = dialogOf(page, 'alert');
    await expect(dialog).toHaveAttribute('open', '');
    const names = await dialog.evaluate((n) =>
      n.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName),
    );
    expect(names).not.toContain('m3e-dialog-slide-in');
    expect(names).not.toContain('m3e-dialog-grow');
    await expect(dialog).not.toHaveAttribute('data-motion');
  });
});

test('React: the same contract, controlled through onOpenChange', async ({ page }) => {
  await page.getByTestId('react-open-alert').click();
  const dialog = page.getByTestId('react-alert');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog).toHaveRole('alertdialog');
  await expect(dialog).toHaveAccessibleName('Title');
  await page.getByTestId('react-confirm').click();
  await expect(dialog).not.toHaveAttribute('open');
  await expect(page.getByTestId('react-last')).toHaveText('Confirm');
  await expect(page.getByTestId('react-open-alert')).toBeFocused();

  await page.getByTestId('react-open-full-screen').click();
  const full = page.getByTestId('react-full-screen');
  await expect(full).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(full).not.toHaveAttribute('open');
  await expect(page.getByTestId('react-last')).toHaveText('dismissed');
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the container keeps a visible boundary', async ({ page }) => {
    const dialog = await open(page, 'alert');
    const border = await dialog
      .locator('.m3e-dialog__container')
      .evaluate((n) => getComputedStyle(n).borderTopStyle);
    expect(border).toBe('solid');
  });
});
