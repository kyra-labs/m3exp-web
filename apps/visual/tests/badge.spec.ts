import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Badge (COMPONENT_SPEC §34): "999+" overflow, Compose Badge / BadgedBox geometry, the accessible
// name (owner decision M9 #7), the bounds hook, forced colors, axe and light/dark × 3 browsers
// baselines.
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

/** A resolved token color, for comparing against computed styles. */
const tokenColor = (page: Page, name: string) =>
  page.evaluate((token) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

const badgeOf = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-badge');

test.beforeEach(async ({ page }) => {
  await page.goto('/components/badge/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-count')).toBeVisible();
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baselines', async ({ page }) => {
  await expect(page).toHaveScreenshot('badge.png', { fullPage: true });
  const variants = await rect(page.getByTestId('variants'));
  const rtl = await rect(page.getByTestId('rtl'));
  // Badges overflow their rows upwards: clip from above the first row to below the RTL row.
  await expect(page).toHaveScreenshot('badge-specimens.png', {
    clip: {
      x: variants.x,
      y: variants.y - 8,
      width: variants.width,
      height: rtl.y + rtl.height - variants.y + 16,
    },
  });
});

test('sizes: a 6dp dot; a 16dp minimum with 4dp padding; full corners', async ({ page }) => {
  expect(await rect(page.getByTestId('small'))).toMatchObject({ width: 6, height: 6 });
  const one = await rect(page.getByTestId('count-1'));
  expect(one).toMatchObject({ width: 16, height: 16 });
  const two = await rect(page.getByTestId('count-2'));
  expect(two.height).toBe(16);
  expect(two.width).toBeGreaterThan(16);
  const four = page.getByTestId('count-4');
  const text = await rect(four.locator('.m3e-badge__text'));
  const box = await rect(four);
  expect(box.width).toBeCloseTo(text.width + 8, 1);
  expect(box.height).toBe(16);
  for (const id of ['small', 'count-1', 'count-4']) {
    const radius = await page
      .getByTestId(id)
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(radius, id).toBeGreaterThanOrEqual(8);
  }
});

test('colors and type: error container, on-error label small', async ({ page }) => {
  const error = await tokenColor(page, '--m3e-sys-color-error');
  const onError = await tokenColor(page, '--m3e-sys-color-on-error');
  for (const id of ['small', 'count-4']) {
    expect(
      await page.getByTestId(id).evaluate((el) => getComputedStyle(el).backgroundColor),
      id,
    ).toBe(error);
  }
  const style = await page.getByTestId('count-4').evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, size: s.fontSize, lineHeight: s.lineHeight, weight: s.fontWeight };
  });
  expect(style).toEqual({ color: onError, size: '11px', lineHeight: '16px', weight: '500' });
});

test('BadgedBox: the dot 6dp inside the top-end corner; with content 12dp before the end, 2dp above', async ({
  page,
}) => {
  const anchor = await rect(page.getByTestId('box-small'));
  expect(anchor).toMatchObject({ width: 24, height: 24 });
  const dot = await rect(badgeOf(page, 'box-small'));
  expect(dot.x).toBeCloseTo(anchor.x + anchor.width - 6, 1);
  expect(dot.y).toBeCloseTo(anchor.y, 1);

  for (const id of ['box-count-1', 'box-count-4']) {
    const box = await rect(page.getByTestId(id));
    expect(box, id).toMatchObject({ width: 24, height: 24 });
    const badge = await rect(badgeOf(page, id));
    expect(badge.x, id).toBeCloseTo(box.x + box.width - 12, 1);
    expect(badge.y, id).toBeCloseTo(box.y - 16 + 14, 1);
  }
});

test('mirrors in right-to-left text (placeRelative)', async ({ page }) => {
  const anchor = await rect(page.getByTestId('rtl-small'));
  const dot = await rect(badgeOf(page, 'rtl-small'));
  expect(dot.x + dot.width).toBeCloseTo(anchor.x + 6, 1);
  expect(dot.y).toBeCloseTo(anchor.y, 1);
  const box = await rect(page.getByTestId('rtl-count-4'));
  const badge = await rect(badgeOf(page, 'rtl-count-4'));
  expect(badge.x + badge.width).toBeCloseTo(box.x + 12, 1);
  expect(badge.y).toBeCloseTo(box.y - 2, 1);
});

test('bounds (badgeBounds rulers): the badge moves back inside once they are set', async ({
  page,
}) => {
  const setBounds = (id: string, end: string | null, top: string | null) =>
    page.getByTestId(id).evaluate(
      (el, [e, t]) => {
        const style = (el as HTMLElement).style;
        if (e === null) style.removeProperty('--_m3e-badged-box-bounds-end');
        else style.setProperty('--_m3e-badged-box-bounds-end', e);
        if (t === null) style.removeProperty('--_m3e-badged-box-bounds-top');
        else style.setProperty('--_m3e-badged-box-bounds-top', t);
      },
      [end, top] as const,
    );
  // The translate is a fraction of the badge's own (text) width: WebKit snaps it to 1/64 px.
  const before = await rect(badgeOf(page, 'box-count-4'));
  await setBounds('box-count-4', '8px', '0px');
  const box = await rect(page.getByTestId('box-count-4'));
  const clamped = await rect(badgeOf(page, 'box-count-4'));
  expect(Math.abs(clamped.x + clamped.width - (box.x + box.width + 8))).toBeLessThan(0.25);
  expect(clamped.y).toBeCloseTo(box.y, 1);
  // Room enough: nothing moves (min / max keep the desired place).
  await setBounds('box-count-4', '64px', '8px');
  expect(await rect(badgeOf(page, 'box-count-4'))).toEqual(before);

  await setBounds('rtl-count-4', '8px', '0px');
  const rtlBox = await rect(page.getByTestId('rtl-count-4'));
  const rtl = await rect(badgeOf(page, 'rtl-count-4'));
  expect(Math.abs(rtl.x - (rtlBox.x - 8))).toBeLessThan(0.25);
  expect(rtl.y).toBeCloseTo(rtlBox.y, 1);
});

test('the badge joins the accessible name of its item; the digits are hidden (M9 #7)', async ({
  page,
}) => {
  await expect(page.getByRole('img', { name: 'Mail', exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('button-small')).toHaveAccessibleName('Chat New notification');
  await expect(page.getByTestId('button-large')).toHaveAccessibleName('Notifications 3 unread');
  await expect(page.getByTestId('box-count-4').locator('.m3e-badge__text')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  // Visually hidden: no box of its own, nothing painted.
  expect(await rect(page.getByTestId('box-count-4').locator('.m3e-badge__label'))).toMatchObject({
    width: 0,
    height: 0,
  });
});

test('React: counts overflow to "999+" (acceptance); the name follows', async ({ page }) => {
  const button = page.getByTestId('react-count');
  const visible = button.locator('.m3e-badge__text');
  await expect(visible).toHaveText('8');
  await expect(button).toHaveAccessibleName('Inbox 8');
  await page.getByTestId('react-add-500').click();
  await expect(visible).toHaveText('508');
  await page.getByTestId('react-add-500').click();
  await expect(page.getByTestId('react-count-value')).toHaveText('1008');
  await expect(visible).toHaveText('999+');
  await expect(button).toHaveAccessibleName('Inbox 999+');
  const badge = await rect(button.locator('.m3e-badge'));
  expect(badge.height).toBe(16);
  await page.getByTestId('react-clear').click();
  await expect(button.locator('.m3e-badge')).toHaveCount(0);
  await expect(button).toHaveAccessibleName('Inbox');

  await expect(page.getByTestId('react-dot')).toHaveAccessibleName('Mail New notification');
  await expect(page.getByTestId('react-text')).toHaveAccessibleName("What's new New features");
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('badges stay visible in the text color', async ({ page }) => {
    for (const id of ['small', 'count-4']) {
      const style = await page.getByTestId(id).evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, color: s.color };
      });
      expect(style.background, id).not.toBe('rgba(0, 0, 0, 0)');
      expect(style.background, id).not.toBe(style.color);
    }
  });
});
