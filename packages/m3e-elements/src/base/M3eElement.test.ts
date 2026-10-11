import { afterEach, describe, expect, it, vi } from 'vitest';
import { M3eElement } from './M3eElement.js';

let seq = 0;
const tag = () => `m3e-test-${String(++seq)}`;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

class TestElement extends M3eElement {
  static override properties = {
    selected: { type: Boolean, reflect: true },
    size: { default: 'm', reflect: true },
    value: { type: Number },
    ariaLabelText: { attribute: 'label' },
    internal: { attribute: false },
  } as const;

  declare selected: boolean;
  declare size: string;
  declare value: number | null;
  declare ariaLabelText: string | null;
  declare internal: unknown;

  updates: ReadonlySet<string>[] = [];

  protected override update(changed: ReadonlySet<string>): void {
    this.updates.push(new Set(changed));
  }

  on(target: EventTarget, type: string, listener: EventListener): void {
    this.listen(target, type, listener);
  }

  fire(type: string, detail: unknown, init?: EventInit): boolean {
    return this.emit(type, detail, init);
  }
}

function create(): TestElement {
  const name = tag();
  // Each test registers a fresh subclass so definitions never collide.
  (class extends TestElement {}).define(name);
  return document.createElement(name) as TestElement;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('M3eElement', () => {
  it('derives observedAttributes from declared properties', () => {
    expect(TestElement.observedAttributes.sort()).toEqual(['label', 'selected', 'size', 'value']);
  });

  it('define() is idempotent', () => {
    const name = tag();
    class A extends M3eElement {}
    class B extends M3eElement {}
    A.define(name);
    expect(() => {
      B.define(name);
    }).not.toThrow();
    expect(customElements.get(name)).toBe(A);
  });

  it('returns declared defaults without reflecting them', async () => {
    const el = create();
    document.body.append(el);
    await tick();
    expect(el.size).toBe('m');
    expect(el.hasAttribute('size')).toBe(false);
  });

  it('converts attributes to typed properties', () => {
    const el = create();
    el.setAttribute('selected', '');
    el.setAttribute('value', '0.5');
    el.setAttribute('label', 'Save');
    expect(el.selected).toBe(true);
    expect(el.value).toBe(0.5);
    expect(el.ariaLabelText).toBe('Save');
    el.removeAttribute('selected');
    el.removeAttribute('value');
    expect(el.selected).toBe(false);
    expect(el.value).toBeNull();
  });

  it('reflects properties to attributes on the next update, not synchronously', async () => {
    const el = create();
    document.body.append(el);
    el.selected = true;
    el.size = 'xl';
    expect(el.hasAttribute('selected')).toBe(false);
    await tick();
    expect(el.getAttribute('selected')).toBe('');
    expect(el.getAttribute('size')).toBe('xl');
    el.selected = false;
    await tick();
    expect(el.hasAttribute('selected')).toBe(false);
  });

  it('does not reflect properties declared without reflect', async () => {
    const el = create();
    document.body.append(el);
    el.value = 3;
    await tick();
    expect(el.hasAttribute('value')).toBe(false);
  });

  it('never touches attributes while constructing (createElement contract)', () => {
    const el = create();
    el.selected = true;
    expect(el.attributes.length).toBe(0);
  });

  it('batches property changes into one update per microtask', async () => {
    const el = create();
    document.body.append(el);
    await tick();
    el.updates.length = 0;
    el.selected = true;
    el.size = 'l';
    el.value = 1;
    await tick();
    expect(el.updates).toHaveLength(1);
    expect([...(el.updates[0] ?? [])].sort()).toEqual(['selected', 'size', 'value']);
  });

  it('skips updates when a value is unchanged', async () => {
    const el = create();
    document.body.append(el);
    el.size = 'l';
    await tick();
    el.updates.length = 0;
    el.size = 'l';
    await tick();
    expect(el.updates).toHaveLength(0);
  });

  it('passes every declared property on first connection', async () => {
    const el = create();
    document.body.append(el);
    await tick();
    expect(el.updates).toHaveLength(1);
    expect([...(el.updates[0] ?? [])].sort()).toEqual(
      ['ariaLabelText', 'internal', 'selected', 'size', 'value'].sort(),
    );
  });

  it('defers updates while disconnected and flushes on connect', async () => {
    const el = create();
    el.size = 's';
    await tick();
    expect(el.updates).toHaveLength(0);
    document.body.append(el);
    await tick();
    expect(el.updates).toHaveLength(1);
    expect(el.getAttribute('size')).toBe('s');
  });

  it('captures properties set before the element upgraded', async () => {
    const name = tag();
    const el = document.createElement(name) as TestElement;
    (el as unknown as Record<string, unknown>)['size'] = 'xs';
    document.body.append(el);
    (class extends TestElement {}).define(name);
    await tick();
    expect(el.size).toBe('xs');
    expect(el.getAttribute('size')).toBe('xs');
  });

  it('removes listen() listeners on disconnect', () => {
    const el = create();
    document.body.append(el);
    const spy = vi.fn();
    const target = new EventTarget();
    el.on(target, 'ping', spy);
    target.dispatchEvent(new Event('ping'));
    el.remove();
    target.dispatchEvent(new Event('ping'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('listen() works again after reconnecting', () => {
    const el = create();
    document.body.append(el);
    el.remove();
    document.body.append(el);
    const spy = vi.fn();
    const target = new EventTarget();
    el.on(target, 'ping', spy);
    target.dispatchEvent(new Event('ping'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emit() dispatches a bubbling, composed CustomEvent with detail', () => {
    const el = create();
    document.body.append(el);
    let received: CustomEvent<{ value: number }> | undefined;
    document.body.addEventListener('value-change', (e) => {
      received = e as CustomEvent<{ value: number }>;
    });
    expect(el.fire('value-change', { value: 2 })).toBe(true);
    expect(received?.detail).toEqual({ value: 2 });
    expect(received?.bubbles).toBe(true);
    expect(received?.composed).toBe(true);
  });

  it('emit() reports cancellation', () => {
    const el = create();
    document.body.append(el);
    el.addEventListener('before-close', (e) => {
      e.preventDefault();
    });
    expect(el.fire('before-close', null, { cancelable: true })).toBe(false);
  });

  it('supports subclass property inheritance via spread', () => {
    class Child extends TestElement {
      static override properties = { ...TestElement.properties, extra: { type: Number } };
    }
    expect(Child.observedAttributes).toContain('extra');
    expect(Child.observedAttributes).toContain('selected');
  });
});
