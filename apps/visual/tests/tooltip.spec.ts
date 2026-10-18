import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Tooltips (COMPONENT_SPEC §33): acceptance + light/dark × 3 browsers baselines, axe.
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
/** A length token resolved to px (typescale tokens are in rem). */
const len = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.width = `var(${n})`;
    document.body.append(probe);
    const value = Number.parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return value;
  }, name);
/** A color token resolved to rgb(), for comparing with computed colors. */
const color = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
const style = (el: Locator, prop: string, pseudo?: string) =>
  el.evaluate((node, [p, ps]) => getComputedStyle(node, ps ?? null).getPropertyValue(p), [
    prop,
    pseudo,
  ] as const);
/** The tooltip an `<m3e-tooltip anchor="id">` renders. */
const tip = (page: Page, anchor: string) =>
  page.locator(`m3e-tooltip[anchor="${anchor}"] > .m3e-tooltip`);
/** Waits until the show springs have settled (scale and opacity at 1). */
const settled = async (tooltip: Locator) => {
  await expect(tooltip).toBeVisible();
  await expect
    .poll(() =>
      tooltip.evaluate((el) =>
        ['--_m3e-tooltip-scale', '--_m3e-tooltip-opacity'].map((n) => el.style.getPropertyValue(n)),
      ),
    )
    .toEqual(['1', '1']);
};
const hidden = async (tooltip: Locator) => {
  await expect.poll(() => tooltip.evaluate((el) => el.matches(':popover-open'))).toBe(false);
};
/** The anchor bounds Compose measures: the 48dp minimum interactive size around a 40dp button. */
const anchorBounds = async (page: Page, anchor: Locator) => {
  const b = await box(anchor);
  const min = await px(page, '--m3e-comp-minimum-interactive-component-size');
  const dx = Math.max(0, (min - b.width) / 2);
  const dy = Math.max(0, (min - b.height) / 2);
  return { left: b.x - dx, top: b.y - dy, right: b.x + b.width + dx, bottom: b.y + b.height + dy };
};
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

test.beforeEach(async ({ page }) => {
  await page.goto('/components/tooltip/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-plain')).toBeVisible();
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('has no axe violations with tooltips shown (plain, rich with an action, React)', async ({
  page,
}) => {
  const scan = async () => {
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  };
  await page.locator('#el-below').hover();
  await settled(tip(page, 'el-below'));
  await scan();
  await page.locator('#el-info').hover();
  await settled(tip(page, 'el-info'));
  await scan();
  await page.mouse.click(1, 1);
  await page.getByTestId('react-rich').hover();
  await settled(page.getByTestId('react-tooltips').locator('.m3e-tooltip--rich'));
  await scan();
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page.getByTestId('static')).toHaveScreenshot('tooltip-variants.png');
});

test('shown tooltips match the visual baseline (plain with caret, rich)', async ({ page }) => {
  const clipAround = async (a: Locator, t: Locator) => {
    const ab = await box(a);
    const tb = await box(t);
    const left = Math.max(0, Math.min(ab.x, tb.x) - 16);
    const top = Math.max(0, Math.min(ab.y, tb.y) - 16);
    const right = Math.max(ab.x + ab.width, tb.x + tb.width) + 16;
    const bottom = Math.max(ab.y + ab.height, tb.y + tb.height) + 16;
    return { x: left, y: top, width: right - left, height: bottom - top };
  };
  const below = page.locator('#el-below');
  await below.hover();
  await settled(tip(page, 'el-below'));
  await expect(page).toHaveScreenshot('tooltip-plain-shown.png', {
    clip: await clipAround(below, tip(page, 'el-below')),
  });
  await page.mouse.move(1, 1);
  const info = page.locator('#el-info');
  await info.hover();
  await settled(tip(page, 'el-info'));
  await page.mouse.move(1, 1);
  await expect(page).toHaveScreenshot('tooltip-rich-shown.png', {
    clip: await clipAround(info, tip(page, 'el-info')),
  });
});

test('sizes: 24dp minimum height, 8 × 4dp / 16dp padding, 200 / 320dp max widths', async ({
  page,
}) => {
  const plain = page.getByTestId('plain');
  expect((await box(plain)).height).toBeGreaterThanOrEqual(
    await px(page, '--m3e-comp-tooltip-min-height'),
  );
  expect(await style(plain, 'padding-left')).toBe(
    await token(page, '--m3e-comp-tooltip-plain-padding-horizontal'),
  );
  expect(await style(plain, 'padding-top')).toBe(
    await token(page, '--m3e-comp-tooltip-plain-padding-vertical'),
  );
  const long = await box(page.getByTestId('plain-long'));
  expect(long.width).toBeLessThanOrEqual(await px(page, '--m3e-comp-tooltip-plain-max-width'));
  expect(long.width).toBeGreaterThan(150);
  const rich = page.getByTestId('rich-subhead');
  expect((await box(rich)).width).toBeLessThanOrEqual(
    await px(page, '--m3e-comp-tooltip-rich-max-width'),
  );
  expect(await style(rich, 'padding-left')).toBe(
    await token(page, '--m3e-comp-tooltip-rich-padding-horizontal'),
  );
  // paddingFromBaseline: the title's first baseline 28dp below the top, the text's 24dp below
  // the title, then 16dp; Compose's baseline sits shift × font size below the line's middle.
  const shift = await px(page, '--m3e-comp-tooltip-baseline-shift');
  const subhead = rich.locator('.m3e-tooltip__subhead');
  const subheadTop =
    (await px(page, '--m3e-comp-tooltip-rich-subhead-baseline')) -
    (await len(page, '--m3e-comp-rich-tooltip-subhead-line-height')) / 2 -
    (await len(page, '--m3e-comp-rich-tooltip-subhead-size')) * shift;
  expect(Number.parseFloat(await style(subhead, 'padding-top'))).toBeCloseTo(subheadTop, 1);
  const text = rich.locator('.m3e-tooltip__supporting-text');
  expect(await style(text, 'padding-bottom')).toBe(
    await token(page, '--m3e-comp-tooltip-rich-text-padding-bottom'),
  );
  // Alone, the text has the plain tooltip's 4dp vertical padding.
  const alone = page.getByTestId('rich-text').locator('.m3e-tooltip__supporting-text');
  expect(await style(alone, 'padding-top')).toBe(
    await token(page, '--m3e-comp-tooltip-plain-padding-vertical'),
  );
  // The action slot: the TextButton's 48dp minimum interactive size + 8dp bottom padding.
  const action = page.getByTestId('rich-action').locator('.m3e-tooltip__action');
  expect((await box(action)).height).toBeCloseTo(
    (await px(page, '--m3e-comp-minimum-interactive-component-size')) +
      (await px(page, '--m3e-comp-tooltip-rich-action-padding-bottom')),
    0,
  );
});

test('colors and shapes: Plain/RichTooltipTokens', async ({ page }) => {
  const plain = page.getByTestId('plain');
  expect(await style(plain, 'background-color')).toBe(
    await color(page, '--m3e-sys-color-inverse-surface'),
  );
  expect(await style(plain, 'color')).toBe(await color(page, '--m3e-sys-color-inverse-on-surface'));
  expect(await style(plain, 'border-top-left-radius')).toBe(
    await token(page, '--m3e-sys-shape-corner-extra-small'),
  );
  expect(await style(plain, 'box-shadow')).toBe('none');
  const rich = page.getByTestId('rich-action');
  expect(await style(rich, 'background-color')).toBe(
    await color(page, '--m3e-sys-color-surface-container'),
  );
  expect(await style(rich, 'border-top-left-radius')).toBe(
    await token(page, '--m3e-sys-shape-corner-medium'),
  );
  expect(await style(rich, 'box-shadow')).not.toBe('none');
  expect(await style(rich.locator('.m3e-tooltip__subhead'), 'color')).toBe(
    await color(page, '--m3e-sys-color-on-surface-variant'),
  );
  expect(await style(rich.locator('.m3e-tooltip__action button'), 'color')).toBe(
    await color(page, '--m3e-sys-color-primary'),
  );
  // The caret: 16 × 8dp in the container color.
  const caret = page.getByTestId('plain-caret');
  expect(await style(caret, 'width', '::after')).toBe(
    await token(page, '--m3e-comp-tooltip-caret-width'),
  );
  expect(await style(caret, 'height', '::after')).toBe(
    await token(page, '--m3e-comp-tooltip-caret-height'),
  );
  expect(await style(caret, 'background-color', '::after')).toBe(
    await color(page, '--m3e-sys-color-inverse-surface'),
  );
});

test('stays open while the anchor is hovered; hides when the pointer leaves', async ({ page }) => {
  const tooltip = tip(page, 'el-below');
  await page.locator('#el-below').hover();
  await settled(tooltip);
  // Longer than TooltipDuration (1500ms): hover shows have no timeout.
  await page.waitForTimeout(2000);
  await expect(tooltip).toBeVisible();
  await page.mouse.move(1, 1);
  await hidden(tooltip);
});

test('placement: TooltipPositionProviderImpl, 4dp from the anchor’s 48dp bounds', async ({
  page,
}) => {
  const spacing = await px(page, '--m3e-comp-tooltip-spacing');
  for (const position of ['above', 'below', 'left', 'right'] as const) {
    const anchor = page.locator(`#el-${position}`);
    const tooltip = tip(page, `el-${position}`);
    await anchor.hover();
    await settled(tooltip);
    const a = await anchorBounds(page, anchor);
    const t = await box(tooltip);
    if (position === 'above') expect(a.top - (t.y + t.height)).toBeCloseTo(spacing, 0);
    if (position === 'below') expect(t.y - a.bottom).toBeCloseTo(spacing, 0);
    if (position === 'left' || position === 'right') {
      // Vertically centered; Left flips right near the window's left edge.
      expect(t.y + t.height / 2).toBeCloseTo((a.top + a.bottom) / 2, 0);
      const gap = t.x > a.right ? t.x - a.right : a.left - (t.x + t.width);
      expect(gap).toBeCloseTo(spacing, 0);
    }
    if (position !== 'left' && position !== 'right') {
      // Centered on the anchor unless the window edge clamps it.
      if (t.x > 0) expect(t.x + t.width / 2).toBeCloseTo((a.left + a.right) / 2, 0);
    }
    await page.mouse.move(1, 1);
    await hidden(tooltip);
  }
});

test('above flips below when there is no room above the anchor', async ({ page }) => {
  // Room to scroll the anchor to the window top.
  await page.locator('#el-above').evaluate((el) => {
    document.body.style.paddingBlockEnd = '200vh';
    el.scrollIntoView({ block: 'start' });
  });
  const above = page.locator('#el-above');
  await above.hover();
  const tooltip = tip(page, 'el-above');
  await settled(tooltip);
  const a = await anchorBounds(page, above);
  expect((await box(tooltip)).y).toBeGreaterThan(a.bottom);
  expect(await tooltip.getAttribute('data-caret')).toBe('up');
});

test('caret: on the edge facing the anchor (Modifier.layoutCaret)', async ({ page }) => {
  const expected = { above: 'down', below: 'up', right: 'left', end: 'left' } as const;
  for (const [position, direction] of Object.entries(expected)) {
    const tooltip = tip(page, `el-${position}`);
    await page.locator(`#el-${position}`).hover();
    await settled(tooltip);
    expect(await tooltip.getAttribute('data-caret')).toBe(direction);
    await page.mouse.move(1, 1);
    await hidden(tooltip);
  }
});

test('keyboard focus shows the tooltip; Escape hides it', async ({ page }) => {
  await page.locator('#el-above').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#el-below')).toBeFocused();
  const tooltip = tip(page, 'el-below');
  await settled(tooltip);
  await page.keyboard.press('Escape');
  await hidden(tooltip);
  await page.keyboard.press('Tab');
  await hidden(tooltip);
  await settled(tip(page, 'el-left'));
});

test('a rich tooltip with an action: Tab moves into it, Escape returns to the anchor', async ({
  page,
}) => {
  await page.locator('#el-end').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#el-info')).toBeFocused();
  const tooltip = tip(page, 'el-info');
  await settled(tooltip);
  await expect(tooltip).toHaveAttribute('role', 'dialog');
  await page.keyboard.press('Tab');
  await expect(tooltip.getByRole('button', { name: 'Request access' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#el-info')).toBeFocused();
  await hidden(tooltip);
  // The action fires `action` and hides the tooltip.
  await page.locator('#el-info').hover();
  await settled(tooltip);
  await tooltip.getByRole('button', { name: 'Request access' }).click();
  await expect(page.locator('#el-log')).toHaveText('Request access');
  await hidden(tooltip);
});

test('a persistent tooltip stays after the pointer leaves; a click outside hides it', async ({
  page,
}) => {
  const tooltip = tip(page, 'el-info');
  await page.locator('#el-info').hover();
  await settled(tooltip);
  await page.mouse.move(1, 1);
  await page.waitForTimeout(500);
  await expect(tooltip).toBeVisible();
  await page.mouse.click(1, 1);
  await hidden(tooltip);
});

test('one tooltip at a time', async ({ page }) => {
  await page.locator('#el-info').hover();
  await settled(tip(page, 'el-info'));
  await page.locator('#el-below').hover();
  await settled(tip(page, 'el-below'));
  await hidden(tip(page, 'el-info'));
});

test('show(): a manual tooltip hides again after TooltipDuration', async ({ page }) => {
  const tooltip = tip(page, 'el-manual-anchor');
  await page.locator('#el-manual').click();
  await settled(tooltip);
  await hidden(tooltip);
});

test('shows with scale from 0.8 + fade on the fast spatial / fast effects springs', async ({
  page,
}) => {
  const tooltip = tip(page, 'el-below');
  await tooltip.evaluate((el) => {
    const w = window as unknown as { scales: string[] };
    w.scales = [];
    new MutationObserver(() => {
      w.scales.push(el.style.getPropertyValue('--_m3e-tooltip-scale'));
    }).observe(el, { attributes: true, attributeFilter: ['style'] });
  });
  await page.locator('#el-below').hover();
  await settled(tooltip);
  const scales = (await page.evaluate(() => (window as unknown as { scales: string[] }).scales))
    .filter(Boolean)
    .map(Number);
  expect(scales[0]).toBeCloseTo(await px(page, '--m3e-comp-tooltip-closed-scale'), 2);
  // FastSpatial overshoots under the expressive scheme.
  expect(Math.max(...scales)).toBeGreaterThan(1);
  expect(scales.at(-1)).toBe(1);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the spatial spring snaps (duration 0); the fade remains', async ({ page }) => {
    const tooltip = tip(page, 'el-below');
    await tooltip.evaluate((el) => {
      const w = window as unknown as { writes: [string, string][] };
      w.writes = [];
      new MutationObserver(() => {
        w.writes.push([
          el.style.getPropertyValue('--_m3e-tooltip-scale'),
          el.style.getPropertyValue('--_m3e-tooltip-opacity'),
        ]);
      }).observe(el, { attributes: true, attributeFilter: ['style'] });
    });
    await page.locator('#el-below').hover();
    await settled(tooltip);
    const writes = await page.evaluate(
      () => (window as unknown as { writes: [string, string][] }).writes,
    );
    const scales = writes.map(([s]) => s).filter(Boolean);
    expect(new Set(scales)).toEqual(new Set(['1']));
    expect(writes.some(([, o]) => o !== '' && o !== '1')).toBe(true);
  });
});

test('RTL: start places the tooltip on the right of the anchor', async ({ page }) => {
  const anchor = page.locator('#el-rtl');
  const tooltip = tip(page, 'el-rtl');
  await anchor.hover();
  await settled(tooltip);
  expect((await box(tooltip)).x).toBeGreaterThan((await anchorBounds(page, anchor)).right);
  expect(await tooltip.getAttribute('data-caret')).toBe('left');
});

test('React: hover, the action, and a controlled tooltip', async ({ page }) => {
  const react = page.getByTestId('react-tooltips');
  await page.getByTestId('react-plain').hover();
  const plain = react.locator('.m3e-tooltip', { hasText: 'Add to list' });
  await settled(plain);
  await expect(page.getByTestId('react-plain')).toHaveAttribute(
    'aria-describedby',
    (await plain.getAttribute('id'))!,
  );
  await page.getByTestId('react-rich').hover();
  const rich = react.locator('.m3e-tooltip--rich');
  await settled(rich);
  await hidden(plain);
  await rich.getByRole('button', { name: 'Request access' }).click();
  await expect(page.getByTestId('react-log')).toHaveText('Request access');
  await hidden(rich);
  await page.getByTestId('react-controlled').click();
  const controlled = react.locator('.m3e-tooltip', { hasText: 'Controlled with isOpen' });
  await settled(controlled);
  await page.mouse.click(1, 1);
  await hidden(controlled);
});

test('CSS only: popovertarget toggles the tooltip without JavaScript wiring', async ({ page }) => {
  await page.getByTestId('css-trigger').click();
  await expect(page.locator('#css-tooltip')).toBeVisible();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('tooltips keep a visible boundary', async ({ page }) => {
    const plain = page.getByTestId('plain');
    expect(await style(plain, 'border-top-style')).toBe('solid');
    expect(Number.parseFloat(await style(plain, 'border-top-width'))).toBeGreaterThan(0);
  });
});
