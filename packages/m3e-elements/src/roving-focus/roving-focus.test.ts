import { afterEach, describe, expect, it } from 'vitest';
import { RovingFocus } from './roving-focus.js';

const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

const flush = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

function setup(html: string, options?: ConstructorParameters<typeof RovingFocus>[1]) {
  document.body.innerHTML = `<div role="toolbar">${html}</div>`;
  const root = document.body.firstElementChild as HTMLElement;
  const focus = new RovingFocus(root, options);
  const els = [...root.querySelectorAll<HTMLElement>('button, input')];
  return { root, focus, els };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RovingFocus', () => {
  it('skips natively disabled items; aria-disabled ones stay reachable but do not start', () => {
    const { els } = setup(
      '<button aria-disabled="true">a</button><button disabled>b</button><button>c</button><button>d</button>',
    );
    expect(els.map((el) => el.getAttribute('tabindex'))).toEqual(['-1', null, '0', '-1']);
    els[2]!.focus();
    key(els[2]!, 'ArrowLeft');
    expect(document.activeElement).toBe(els[0]);
    expect(els[0]!.getAttribute('tabindex')).toBe('0');
  });

  it('initial() picks the first tab stop; tabbable = false removes the widget from the tab order', () => {
    const { els, focus } = setup('<button>a</button><button>b</button>', {
      initial: (items) => items[1],
    });
    expect(els.map((el) => el.getAttribute('tabindex'))).toEqual(['-1', '0']);
    focus.tabbable = false;
    expect(els.map((el) => el.getAttribute('tabindex'))).toEqual(['-1', '-1']);
    focus.tabbable = true;
    expect(els[1]!.getAttribute('tabindex')).toBe('0');
  });

  it('text inputs keep their arrow keys; inert and hidden parts are not items', async () => {
    const { els, root, focus } = setup(
      '<button>a</button><input type="text"><div inert><button>x</button></div>',
    );
    expect(focus.items()).toEqual(els.slice(0, 2));
    els[1]!.focus();
    expect(key(els[1]!, 'ArrowLeft')).toBe(true);
    expect(document.activeElement).toBe(els[1]);
    // New items join the order.
    root.insertAdjacentHTML('beforeend', '<button>z</button>');
    await flush();
    expect(root.lastElementChild!.getAttribute('tabindex')).toBe('-1');
  });

  it('destroy() stops listening', () => {
    const { els, focus } = setup('<button>a</button><button>b</button>');
    focus.destroy();
    els[0]!.focus();
    expect(key(els[0]!, 'ArrowRight')).toBe(true);
    expect(document.activeElement).toBe(els[0]);
  });

  it('wrap: the arrows go past either end (default: they stop); both takes both key pairs', () => {
    const { els } = setup('<button>a</button><button>b</button><button>c</button>');
    els[2]!.focus();
    key(els[2]!, 'ArrowRight');
    expect(document.activeElement).toBe(els[2]);
    document.body.innerHTML = '';
    const wrapped = setup('<button>a</button><button>b</button><button>c</button>', {
      orientation: () => 'both',
      wrap: () => true,
    });
    const [a, b, c] = wrapped.els as [HTMLElement, HTMLElement, HTMLElement];
    c.focus();
    key(c, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    key(a, 'ArrowUp');
    expect(document.activeElement).toBe(c);
    key(c, 'ArrowRight');
    expect(document.activeElement).toBe(a);
    key(a, 'ArrowLeft');
    expect(document.activeElement).toBe(c);
    key(c, 'ArrowLeft');
    expect(document.activeElement).toBe(b);
    expect(b.getAttribute('tabindex')).toBe('0');
  });
});
