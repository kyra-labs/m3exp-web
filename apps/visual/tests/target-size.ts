import { expect, type Locator } from '@playwright/test';

// Target size by hit testing (M11 a11y audit, "Method notes": the per-component checks that add up
// `::after` insets miss targets that overlap, like the date picker's month arrows, M3, and the
// time picker's AM/PM items, L1). From the target's center, `elementFromPoint` scans outwards one
// pixel at a time (up to 64px each way) while the hit still belongs to the target: the element,
// a descendant (its `::after` hits as the element), one of its `<label>`s, or a custom-element
// host with a single focusable. The result is the effective, non-overlapped hit area through the
// center lines.

/** CLAUDE.md "Every interactive element has a ≥48px target" (REQUIREMENTS §7). */
export const MIN_TARGET = 48;
/** WCAG 2.2 SC 2.5.8 Target Size (Minimum), where Compose itself draws a smaller target. */
export const WCAG_MIN_TARGET = 24;

/**
 * Targets that follow Compose below 48dp (M11 a11y audit: they pass WCAG 2.5.8 and are fidelity
 * limits, not bugs). They are held to the WCAG minimum instead.
 */
export const COMPOSE_TARGET_EXCEPTIONS: readonly { selector: string; reason: string }[] = [
  {
    // Audit L1: 40dp toggles stacked in an 80dp column (TimePicker.kt), so each item's 48dp
    // target overlaps its neighbor's: 42px for AM, 48px for PM.
    selector: '.m3e-time-picker__period-item',
    reason: 'time picker AM/PM (Compose 40dp toggles in an 80dp column)',
  },
  {
    // Audit L2: expressive (non-baseline) items are SegmentedMenuTokens' 44dp, 2dp apart in a
    // segmented group: 44–46px.
    selector: '.m3e-menu:not(.m3e-menu--baseline) .m3e-menu__item',
    reason: 'expressive menu items (Compose 44dp items)',
  },
  {
    // Audit L3: small keyline items in multi-browse are 35–40px wide where they are unmasked
    // (Compose's 40–56dp small items); "Show all" reaches every item another way.
    selector: '.m3e-carousel__item',
    reason: 'small carousel items (Compose keylines)',
  },
];

export interface HitArea {
  width: number;
  height: number;
  /** The element's own box, for the failure message. */
  box: [number, number];
}

/**
 * The effective hit area of `target`, scrolled to the middle of the viewport first: with every
 * scroll container (`scroll: 'all'`, the default), or the page only (`'page'`: a carousel's items
 * keep their keyline sizes).
 */
export async function hitArea(target: Locator, scroll: 'all' | 'page' = 'all'): Promise<HitArea> {
  return target.evaluate((el, how) => {
    if (how === 'all') {
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    } else {
      const r = el.getBoundingClientRect();
      window.scrollBy({ top: r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' });
    }
    const FOCUSABLE =
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]';
    const labels = (el as HTMLInputElement).labels ?? null;
    const owns = (hit: Element | null): boolean => {
      if (!hit) return false;
      if (hit === el || el.contains(hit)) return true;
      if (labels && [...labels].some((label) => label.contains(hit))) return true;
      return (
        hit.contains(el) &&
        hit.localName.includes('-') &&
        hit.querySelectorAll(FOCUSABLE).length <= 1
      );
    };
    const r = el.getBoundingClientRect();
    const box: [number, number] = [Math.round(r.width), Math.round(r.height)];
    // The center, or (a visually hidden input under its control) the first owned point on a grid.
    let x = r.left + r.width / 2;
    let y = r.top + r.height / 2;
    if (!owns(document.elementFromPoint(x, y))) {
      const grid = [0.1, 0.3, 0.5, 0.7, 0.9];
      const point = grid
        .flatMap((fy) => grid.map((fx) => [r.left + r.width * fx, r.top + r.height * fy] as const))
        .find(([px, py]) => owns(document.elementFromPoint(px, py)));
      if (!point) return { width: 0, height: 0, box };
      [x, y] = point;
    }
    const LIMIT = 64;
    const scan = (dx: number, dy: number) => {
      let d = 0;
      while (d < LIMIT) {
        const px = x + dx * (d + 1);
        const py = y + dy * (d + 1);
        if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) break;
        if (!owns(document.elementFromPoint(px, py))) break;
        d++;
      }
      return d;
    };
    return {
      width: scan(-1, 0) + scan(1, 0) + 1,
      height: scan(0, -1) + scan(0, 1) + 1,
      box,
    };
  }, scroll);
}

/** The minimum for `target`: the WCAG minimum for a Compose exception, else 48px. */
async function minimumFor(target: Locator): Promise<{ min: number; reason: string | null }> {
  const reason = await target.evaluate(
    (el, exceptions) => exceptions.find((e) => el.matches(e.selector))?.reason ?? null,
    COMPOSE_TARGET_EXCEPTIONS,
  );
  return { min: reason ? WCAG_MIN_TARGET : MIN_TARGET, reason };
}

/**
 * Every element `targets` matches has an effective hit area of at least 48 × 48px (Compose
 * exceptions: 24 × 24px). One pixel is allowed for sub-pixel layout.
 */
export async function expectTargetSizes(
  targets: Locator,
  name: string,
  scroll: 'all' | 'page' = 'all',
): Promise<void> {
  const count = await targets.count();
  expect(count, `${name}: no targets matched`).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const target = targets.nth(i);
    const { min, reason } = await minimumFor(target);
    const area = await hitArea(target, scroll);
    const label = `${name} #${String(i)} (box ${area.box.join(' × ')}${reason ? `; ${reason}` : ''})`;
    expect(area.width, `${label}: hit width`).toBeGreaterThanOrEqual(min - 1);
    expect(area.height, `${label}: hit height`).toBeGreaterThanOrEqual(min - 1);
  }
}
