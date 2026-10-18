import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Snackbar (COMPONENT_SPEC §32): one snackbar at a time, the action reachable by keyboard, the
// Compose layout (isSnackbarStylingFixEnabled, owner decision M9 #19), durations with the hover /
// focus pause and Escape (#20), the bottom-center host and its offset (#21), the dismiss button's
// built-in tooltip (#30), forced colors, reduced motion, axe and light/dark × 3 browsers baselines.
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

const host = (page: Page) =>
  page.locator('m3e-snackbar-host[data-testid="host"] > .m3e-snackbar-host');
const items = (page: Page) => host(page).locator('.m3e-snackbar-host__item');

/** Shows a snackbar from a docs button and waits for its springs to settle. */
async function show(page: Page, which: 'simple' | 'action' | 'indefinite'): Promise<Locator> {
  await page.getByTestId(`show-${which}`).click();
  await page.mouse.move(0, 0);
  const item = items(page).last();
  await expect(item).toHaveAttribute('style', /--_m3e-snackbar-opacity: 1;/);
  await expect(item).toHaveAttribute('style', /--_m3e-snackbar-scale: 1;/);
  await expect(items(page)).toHaveCount(1);
  return item.locator('.m3e-snackbar');
}

/** Waits for a tooltip's show springs to settle (axe and geometry read the final state). */
async function settledTooltip(tooltip: Locator): Promise<void> {
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveAttribute('style', /--_m3e-tooltip-scale: 1;/);
  await expect(tooltip).toHaveAttribute('style', /--_m3e-tooltip-opacity: 1;/);
}

/** The snackbar durations, shortened so the timer tests run quickly (tokens; minified CSS). */
const shortDurations = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.setProperty('--m3e-comp-snackbar-duration-short', '1s');
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/snackbar/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-show-simple')).toBeVisible();
});

test('has no axe violations (specimens, and with each host snackbar shown)', async ({ page }) => {
  const scan = async () =>
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
    ).violations;
  expect(await scan()).toEqual([]);
  await show(page, 'indefinite');
  expect(await scan()).toEqual([]);
  // The dismiss button's tooltip shown by keyboard focus.
  // Keyboard modality (the tooltip shows on :focus-visible), then focus the dismiss button.
  await page.getByTestId('show-indefinite').focus();
  await page.keyboard.press('Shift+Tab');
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-testid="host"] .m3e-snackbar__dismiss')?.focus();
  });
  await settledTooltip(host(page).locator('.m3e-tooltip'));
  expect(await scan()).toEqual([]);
  await page.getByTestId('react-show-indefinite').click();
  await expect(page.getByTestId('react-host').locator('.m3e-snackbar')).toHaveCount(1);
  // The click outside hid the element's tooltip; the React snackbar settled in.
  await expect(host(page).locator('.m3e-tooltip')).toBeHidden();
  await expect(page.getByTestId('react-host').locator('.m3e-snackbar-host__item')).toHaveAttribute(
    'style',
    /--_m3e-snackbar-opacity: 1;/,
  );
  expect(await scan()).toEqual([]);
});

test('matches the visual baselines', async ({ page }) => {
  await expect(page).toHaveScreenshot('snackbar-page.png', { fullPage: true });
  for (const id of ['text', 'action', 'dismiss', 'two-lines', 'new-line']) {
    await expect(page.getByTestId(`specimen-${id}`)).toHaveScreenshot(`snackbar-${id}.png`);
  }
  // The host at the bottom center of the window, over the page scrolled to its top (fixed UI;
  // the click on the docs button scrolled it).
  const top = () =>
    page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  await show(page, 'indefinite');
  await top();
  await expect(page).toHaveScreenshot('snackbar-host.png');
  // Keyboard: focus() reaches the action; Tab to the dismiss button shows its tooltip.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('m3e-snackbar-host')!.focus();
  });
  await page.keyboard.press('Tab');
  await top();
  await settledTooltip(host(page).locator('.m3e-tooltip'));
  await expect(page).toHaveScreenshot('snackbar-host-dismiss-focus.png');
});

test('one-row layout: 48 / 68dp, 16dp start, buttons at the end, Compose colors', async ({
  page,
}) => {
  const text = await rect(page.getByTestId('specimen-text'));
  expect(text.height).toBeCloseTo(48, 1);
  // ContainerMaxWidth 600dp inside the 16dp start and 8dp end paddings (no dismiss button).
  expect(text.width).toBeCloseTo(600 + 16 + 8, 1);
  expect((await rect(page.getByTestId('specimen-two-lines'))).height).toBeCloseTo(68, 1);

  const snackbar = page.getByTestId('specimen-dismiss');
  const box = await rect(snackbar);
  expect(box.height).toBeCloseTo(48, 1);
  expect(box.width).toBeCloseTo(600 + 16, 1);
  const label = await rect(snackbar.locator('.m3e-snackbar__text'));
  expect(label.x - box.x).toBeCloseTo(16, 1);
  const dismiss = await rect(snackbar.locator('.m3e-snackbar__dismiss'));
  // The 40dp icon button sits in its 48dp target at the end, centered vertically.
  expect(box.x + box.width - (dismiss.x + dismiss.width)).toBeCloseTo(4, 1);
  expect(dismiss.y + dismiss.height / 2).toBeCloseTo(box.y + box.height / 2, 1);
  const action = await rect(snackbar.locator('.m3e-snackbar__action'));
  expect(dismiss.x - 4 - (action.x + action.width)).toBeCloseTo(0, 1);

  const style = await snackbar.evaluate((n) => {
    const s = getComputedStyle(n);
    return { radius: s.borderTopLeftRadius, shadow: s.boxShadow !== 'none', bg: s.backgroundColor };
  });
  expect(style).toEqual({
    radius: '4px',
    shadow: true,
    bg: await tokenColor(page, '--m3e-sys-color-inverse-surface'),
  });
  await expect(snackbar.locator('.m3e-snackbar__text')).toHaveCSS(
    'color',
    await tokenColor(page, '--m3e-sys-color-inverse-on-surface'),
  );
  await expect(snackbar.locator('.m3e-snackbar__action')).toHaveCSS(
    'color',
    await tokenColor(page, '--m3e-sys-color-inverse-primary'),
  );
  await expect(snackbar.locator('.m3e-snackbar__dismiss')).toHaveCSS(
    'color',
    await tokenColor(page, '--m3e-sys-color-inverse-on-surface'),
  );
});

test('action on a new line: under the text, at the end, 4dp below', async ({ page }) => {
  const snackbar = page.getByTestId('specimen-new-line');
  const box = await rect(snackbar);
  expect(box.width).toBeCloseTo(600, 1);
  const text = await rect(snackbar.locator('.m3e-snackbar__text'));
  expect(text.y - box.y).toBeCloseTo(0, 1);
  const actions = await rect(snackbar.locator('.m3e-snackbar__actions'));
  expect(actions.y).toBeCloseTo(text.y + text.height, 1);
  expect(box.x + box.width - (actions.x + actions.width)).toBeCloseTo(0, 1);
  // ActionButtonBottomPadding 4dp under the buttons' 48dp targets (40dp buttons: 4 + 4).
  const dismiss = await rect(snackbar.locator('.m3e-snackbar__dismiss'));
  expect(box.y + box.height - (dismiss.y + dismiss.height)).toBeCloseTo(4 + 4, 1);
  expect(box.x + box.width - (dismiss.x + dismiss.width)).toBeCloseTo(4, 1);
  // 14 + 20 + 14 for the text, the 48dp buttons, 4dp.
  expect(box.height).toBeCloseTo(48 + 48 + 4, 1);
});

test('the host: bottom center, 12dp around the snackbar, one at a time, raised by the offset', async ({
  page,
}) => {
  const viewport = page.viewportSize()!;
  const snackbar = await show(page, 'indefinite');
  const box = await rect(snackbar);
  expect(box.x + box.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(viewport.height - (box.y + box.height)).toBeCloseTo(12, 1);
  await expect(host(page)).toHaveRole('status');
  // A second call waits for the first to be addressed (SnackbarHostState queue).
  await page.getByTestId('show-action').click();
  await expect(items(page)).toHaveCount(1);
  await expect(snackbar.locator('.m3e-snackbar__text')).toHaveText('Snackbar # 1');
  await snackbar.locator('.m3e-snackbar__action').click();
  await expect(page.getByTestId('last')).toHaveText('action-performed');
  // The first fades out (removed when its fade ends) while the second fades in.
  await expect(items(page)).toHaveCount(1);
  await expect(host(page).locator('.m3e-snackbar__text')).toHaveText('Snackbar # 2');
  // --m3e-comp-snackbar-host-bottom-offset raises it (e.g. above a FAB).
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--m3e-comp-snackbar-host-bottom-offset', '88px');
  });
  const raised = await rect(host(page).locator('.m3e-snackbar'));
  expect(viewport.height - (raised.y + raised.height)).toBeCloseTo(88 + 12, 1);
});

test.describe('compact window (375 × 812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the snackbar fills the width less 12dp each side', async ({ page }) => {
    const snackbar = await show(page, 'action');
    const box = await rect(snackbar);
    expect(box.x).toBeCloseTo(12, 1);
    expect(box.width).toBeCloseTo(375 - 24, 1);
  });
});

// The focus pause is covered by the unit tests (a short snackbar has no control to focus).
test('durations: short leaves on its own; the timer pauses while hovered (#20)', async ({
  page,
}) => {
  await shortDurations(page);
  await show(page, 'simple');
  await expect(items(page)).toHaveCount(0, { timeout: 3000 });
  await expect(page.getByTestId('last')).toHaveText('dismissed');

  // Hovered: it stays; it leaves once the pointer moves away.
  const snackbar = await show(page, 'simple');
  await snackbar.hover();
  await page.waitForTimeout(1500);
  await expect(items(page)).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(items(page)).toHaveCount(0, { timeout: 3000 });

  // An action makes it indefinite.
  await show(page, 'action');
  await page.waitForTimeout(1500);
  await expect(items(page)).toHaveCount(1);
});

test('keyboard: focus() reaches the action, Tab the dismiss button, Escape dismisses', async ({
  page,
}) => {
  const trigger = page.getByTestId('show-indefinite');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const snackbar = host(page).locator('.m3e-snackbar');
  await expect(snackbar).toHaveCount(1);
  // Focus does not move on its own (m3.material.io).
  await expect(trigger).toBeFocused();
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('m3e-snackbar-host')!.focus();
  });
  const action = snackbar.locator('.m3e-snackbar__action');
  await expect(action).toBeFocused();
  await page.keyboard.press('Tab');
  const dismiss = snackbar.locator('.m3e-snackbar__dismiss');
  await expect(dismiss).toBeFocused();
  await expect(dismiss).toHaveAccessibleName('Dismiss');
  // Escape first hides the tooltip (WCAG 1.4.13), then dismisses the snackbar.
  await page.keyboard.press('Escape');
  await expect(host(page).locator('.m3e-tooltip')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('last')).toHaveText('dismissed');
  await expect(items(page)).toHaveCount(0);
  // Focus goes back to where it came from.
  await expect(trigger).toBeFocused();

  // Enter on the action performs it.
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('m3e-snackbar-host')!.focus();
  });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('last')).toHaveText('action-performed');
});

test('the dismiss button shows its tooltip on hover (built in, #30)', async ({ page }) => {
  const snackbar = await show(page, 'indefinite');
  const dismiss = snackbar.locator('.m3e-snackbar__dismiss');
  await dismiss.hover();
  const tooltip = snackbar.locator('.m3e-tooltip');
  await settledTooltip(tooltip);
  await expect(tooltip).toHaveText('Dismiss');
  await expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  const tip = await rect(tooltip);
  const anchor = await rect(dismiss);
  // Above the button's 48dp target, 4dp away.
  expect(anchor.y - 4 - (tip.y + tip.height)).toBeCloseTo(4, 0);
  await dismiss.click();
  await expect(page.getByTestId('last')).toHaveText('dismissed');
});

test('motion: fades on fast effects, scales from 0.8 on fast spatial', async ({ page }) => {
  // Record the item's first written values (the springs start from the closed state).
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="host"] .m3e-snackbar-host')!;
    (window as unknown as { firstWrite: Promise<string> }).firstWrite = new Promise((resolve) => {
      new MutationObserver((records, observer) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node instanceof HTMLElement) {
              observer.disconnect();
              resolve(node.getAttribute('style') ?? '');
            }
          }
        }
      }).observe(root, { childList: true });
    });
  });
  await page.getByTestId('show-indefinite').click();
  const first = await page.evaluate(
    () => (window as unknown as { firstWrite: Promise<string> }).firstWrite,
  );
  expect(first).toContain('--_m3e-snackbar-scale: 0.8');
  expect(first).toContain('--_m3e-snackbar-opacity: 0');
  await expect(items(page).last()).toHaveAttribute('style', /--_m3e-snackbar-opacity: 1;/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the scale jumps (spatial duration 0); the fade stays', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector('[data-testid="host"] .m3e-snackbar-host')!;
      (window as unknown as { firstWrite: Promise<string> }).firstWrite = new Promise((resolve) => {
        new MutationObserver((records, observer) => {
          for (const r of records) {
            for (const node of r.addedNodes) {
              if (node instanceof HTMLElement) {
                observer.disconnect();
                resolve(node.getAttribute('style') ?? '');
              }
            }
          }
        }).observe(root, { childList: true });
      });
    });
    await page.getByTestId('show-indefinite').click();
    const first = await page.evaluate(
      () => (window as unknown as { firstWrite: Promise<string> }).firstWrite,
    );
    expect(first).toContain('--_m3e-snackbar-scale: 1;');
    expect(first).toContain('--_m3e-snackbar-opacity: 0');
  });
});

test('React: the same contract and queue', async ({ page }) => {
  const reactHost = page.getByTestId('react-host');
  await expect(reactHost).toHaveRole('status');
  await page.getByTestId('react-show-indefinite').click();
  const snackbar = reactHost.locator('.m3e-snackbar');
  await expect(snackbar).toHaveCount(1);
  await page.getByTestId('react-show-indefinite').click();
  await expect(snackbar).toHaveCount(1);
  await page.getByTestId('react-focus-snackbar').click();
  await expect(snackbar.locator('.m3e-snackbar__action')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('react-last')).toHaveText('dismissed');
  await expect(snackbar).toHaveCount(1);
  await expect(reactHost.locator('.m3e-snackbar__text')).toHaveText('Snackbar # 2');
  await reactHost.locator('.m3e-snackbar__action').click();
  await expect(page.getByTestId('react-last')).toHaveText('action-performed');
  await expect(reactHost.locator('.m3e-snackbar')).toHaveCount(0);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the snackbar keeps a visible boundary', async ({ page }) => {
    const border = await page
      .getByTestId('specimen-text')
      .evaluate((n) => getComputedStyle(n).borderTopStyle);
    expect(border).toBe('solid');
  });
});
