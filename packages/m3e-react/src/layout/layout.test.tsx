import '@kyralabs/m3e-elements/list-detail-layout.js';
import '@kyralabs/m3e-elements/supporting-pane-layout.js';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import {
  FeedLayout,
  ListDetailPaneScaffold,
  type ListDetailPaneScaffoldNavigator,
  SupportingPaneScaffold,
  useListDetailPaneScaffoldNavigator,
} from './index.js';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const scaffold = (root: Element) => root.querySelector('.m3e-layout')!;

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it('ListDetailPaneScaffold with an extra pane, labels, preferred width and drag handle', async () => {
    const react = await renderReact(
      <ListDetailPaneScaffold
        paneLabels={{ list: 'Inbox', detail: 'Message', extra: 'Notes' }}
        preferredWidths={{ list: 200 }}
        hasDragHandle
        listPane={<p slot="list">List</p>}
        detailPane={<p slot="detail">Detail</p>}
        extraPane={<p slot="extra">Extra</p>}
      />,
    );
    const host = await renderElement(
      `<m3e-list-detail-layout list-label="Inbox" detail-label="Message" extra-label="Notes" drag-handle><p slot="list">List</p><p slot="detail">Detail</p><p slot="extra">Extra</p></m3e-list-detail-layout>`,
    );
    (host as unknown as { preferredWidths: object }).preferredWidths = { secondary: 200 };
    await renderElement('<i></i>'); // let the property's batched render run
    expect(canonical(scaffold(host))).toBe(canonical(scaffold(react)));
  });

  it('SupportingPaneScaffold, recommended pane rule, default labels', async () => {
    const react = await renderReact(
      <SupportingPaneScaffold
        paneRule="recommended"
        mainPane={<p>Main</p>}
        supportingPane={<p slot="supporting">Supporting</p>}
      />,
    );
    const host = await renderElement(
      `<m3e-supporting-pane-layout pane-rule="recommended"><p>Main</p><p slot="supporting">Supporting</p></m3e-supporting-pane-layout>`,
    );
    expect(canonical(scaffold(host))).toBe(canonical(scaffold(react)));
    expect(
      scaffold(react)
        .querySelector('.m3e-pane-scaffold__pane--primary')!
        .getAttribute('aria-label'),
    ).toBe('Primary pane');
  });
});

describe('ListDetailPaneScaffold + useListDetailPaneScaffoldNavigator', () => {
  it('navigates list → detail → back and re-renders with the navigator', async () => {
    let nav!: ListDetailPaneScaffoldNavigator<number>;
    function App() {
      nav = useListDetailPaneScaffoldNavigator<number>();
      const selected = nav.currentDestination?.contentKey;
      return (
        <ListDetailPaneScaffold
          navigator={nav}
          listPane={
            <button
              type="button"
              onClick={() => {
                nav.navigateTo('detail', 3);
              }}
            >
              Item
            </button>
          }
          detailPane={
            <p data-testid="detail">
              {selected === undefined ? 'None' : `Item ${String(selected)}`}
            </p>
          }
        />
      );
    }
    const container = await renderReact(<App />);
    const pane = (role: string) =>
      container.querySelector<HTMLElement>(`.m3e-pane-scaffold__pane--${role}`)!;
    expect(pane('secondary').dataset['paneValue']).toBe('expanded');
    expect(pane('primary').dataset['paneValue']).toBe('hidden');
    expect(nav.isExpanded('detail')).toBe(false);
    await act(async () => {
      container.querySelector('button')!.click();
      await Promise.resolve();
    });
    expect(pane('primary').dataset['paneValue']).toBe('expanded');
    expect(container.querySelector('[data-testid="detail"]')!.textContent).toBe('Item 3');
    expect(nav.canNavigateBack()).toBe(true);
    await act(async () => {
      nav.navigateBack();
      await Promise.resolve();
    });
    expect(pane('secondary').dataset['paneValue']).toBe('expanded');
    expect(container.querySelector('[data-testid="detail"]')!.textContent).toBe('None');
  });
});

describe('FeedLayout', () => {
  it('renders .m3e-layout > .m3e-feed with the items', async () => {
    const container = await renderReact(
      <FeedLayout aria-label="Stories">
        <article>One</article>
        <article className="m3e-feed__item--wide">Two</article>
      </FeedLayout>,
    );
    expect(canonical(container.firstElementChild!)).toBe(
      '<div class="m3e-layout"><div aria-label="Stories" class="m3e-feed"><article>One</article><article class="m3e-feed__item--wide">Two</article></div></div>',
    );
  });
});
