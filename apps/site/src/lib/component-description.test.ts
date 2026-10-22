import { describe, expect, it } from 'vitest';
import { COMPONENTS } from '../data/components';
import { componentDescription } from './component-description';

const all = { css: true, elements: true, react: true };

describe('componentDescription', () => {
  it('names Material 3 Expressive once and the layers the page has', () => {
    expect(
      componentDescription('Badge', 'A dot or a short count on an icon.', {
        css: true,
        elements: false,
        react: true,
      }),
    ).toBe(
      'Material 3 Expressive badge for the web in CSS and React. A dot or a short count on an icon.',
    );
    expect(
      componentDescription('Divider', 'A thin line that groups content in lists and layouts.', {
        css: true,
        elements: false,
        react: false,
      }),
    ).toBe(
      'Material 3 Expressive divider for the web in CSS. A thin line that groups content in lists and layouts.',
    );
  });

  it('calls custom elements web components only where the page has them', () => {
    expect(componentDescription('Tabs', 'Tabs switch content.', all)).toContain(
      'in CSS, web components and React.',
    );
    expect(
      componentDescription('Switch', 'Toggles a single setting on or off.', {
        css: true,
        elements: false,
        react: true,
      }),
    ).not.toContain('web components');
  });

  it('keeps a leading acronym', () => {
    expect(componentDescription('FAB menu', 'A FAB that opens related actions.', all)).toMatch(
      /^Material 3 Expressive FAB menu for the web/,
    );
  });

  it('shortens the summary at a break, never inside a list', () => {
    const summary =
      'The bar at the top of a screen with its title and actions: small, center-aligned, medium and large flexible, and two-rows, with scroll behaviors.';
    expect(
      componentDescription('Top app bars', summary, { css: true, elements: false, react: true }),
    ).toBe(
      'Material 3 Expressive top app bars for the web in CSS and React. The bar at the top of a screen with its title and actions.',
    );
  });

  it('drops the layers from the lead before it drops the summary', () => {
    expect(
      componentDescription(
        'Search',
        'A search bar that expands into a full-screen or docked view of suggestions and results.',
        all,
      ),
    ).toBe(
      'Material 3 Expressive search for the web. A search bar that expands into a full-screen or docked view of suggestions and results.',
    );
  });

  it('describes a deprecated component without calling it Material 3 Expressive', () => {
    expect(
      componentDescription(
        'Segmented button',
        'Deprecated (DECISIONS D4): a row of segments for single or multiple choice. Use a connected button group instead.',
        { css: true, elements: false, react: true },
        { deprecated: true },
      ),
    ).toBe(
      'Segmented button for the web, deprecated in Material 3 Expressive. A row of segments for single or multiple choice. Use a connected button group instead.',
    );
  });

  it('gives every component page a unique description of 50–160 characters', () => {
    const descriptions = COMPONENTS.map((c) =>
      componentDescription(c.title, c.summary, {
        css: c.css.length > 0,
        elements: c.elements.length > 0,
        react: c.react.length > 0,
      }),
    );
    for (const d of descriptions) {
      expect(d.length).toBeGreaterThanOrEqual(50);
      expect(d.length).toBeLessThanOrEqual(160);
      expect(d.match(/Material 3 Expressive/g)).toHaveLength(1);
    }
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});
