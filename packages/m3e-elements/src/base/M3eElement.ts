/**
 * Zero-dependency base class for every m3exp-web custom element (DECISIONS D7).
 *
 * Provides:
 * - declarative properties with attribute ⇄ property conversion and optional reflection,
 * - a microtask-batched `update(changed)` hook where subclasses render the m3e-css DOM contract,
 * - `listen()` for event listeners that are removed automatically on disconnect,
 * - `emit()` for kebab-case `CustomEvent`s with a `detail` payload.
 *
 * Subclasses declare properties statically and type them with `declare` (a class field
 * initializer would shadow the generated accessor). Defaults go in the declaration. Build the
 * map in a `/* @__PURE__ *\/` arrow function called at once: a bare `{ ...Parent.properties }`
 * reads a member while the class is defined, which keeps bundlers from dropping an unused class
 * (`node tools/pure-statics.js` rewrites it, ESLint flags it):
 *
 * ```ts
 * class M3eExample extends M3eElement {
 *   static override properties = /* @__PURE__ *\/ (() => ({
 *     ...M3eElement.properties,
 *     selected: { type: Boolean, reflect: true },
 *     size: { default: 'm', reflect: true },
 *   }))();
 *   declare selected: boolean;
 *   declare size: string;
 *   protected override update(changed: ReadonlySet<string>) { … }
 * }
 * M3eExample.define('m3e-example');
 * ```
 *
 * Importing this module in a non-DOM environment (Node) never throws; `define()` is a no-op
 * there because registration is guarded by `typeof window !== 'undefined'`.
 */

export type PropertyType = typeof String | typeof Number | typeof Boolean;

export interface PropertyDeclaration {
  /** Value type; controls attribute → property conversion. Defaults to `String`. */
  readonly type?: PropertyType;
  /** Linked attribute. Defaults to the kebab-cased property name; `false` unlinks it. */
  readonly attribute?: string | false;
  /** Write property changes back to the attribute during the next update. */
  readonly reflect?: boolean;
  /** Value returned while the property has not been set. Never reflected. */
  readonly default?: unknown;
}

export type PropertyDeclarations = Readonly<Record<string, PropertyDeclaration>>;

// `HTMLElement` is undefined in Node; fall back to a bare class so the module can be imported.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- intentional empty stand-in
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/** Per-class map of observed attribute → property name, built once in `finalize`. */
const attributeMaps = new WeakMap<typeof M3eElement, Map<string, string>>();

const toKebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const fromAttribute = (value: string | null, type: PropertyType | undefined): unknown =>
  type === Boolean
    ? value !== null
    : value === null
      ? null
      : type === Number
        ? Number(value)
        : value;

export abstract class M3eElement extends Base {
  /**
   * Declared reactive properties. Spread the parent's map when extending a subclass, inside a
   * pure IIFE (see the class comment).
   */
  static properties: PropertyDeclarations = {};

  static get observedAttributes(): string[] {
    return [...this.finalize().keys()];
  }

  /** Registers the element under `tag`. No-op outside the browser or when already defined. */
  static define(tag: string): void {
    if (typeof window !== 'undefined' && !customElements.get(tag)) {
      customElements.define(tag, this as unknown as CustomElementConstructor);
    }
  }

  /** Installs property accessors once per class and returns its attribute map. */
  protected static finalize(): Map<string, string> {
    let map = attributeMaps.get(this);
    if (map) return map;
    map = new Map();
    attributeMaps.set(this, map);
    for (const [name, decl] of Object.entries(this.properties)) {
      const attribute = decl.attribute ?? toKebab(name);
      if (attribute !== false) map.set(attribute, name);
      Object.defineProperty(this.prototype, name, {
        configurable: true,
        enumerable: true,
        get(this: M3eElement) {
          return this.#values.has(name) ? this.#values.get(name) : decl.default;
        },
        set(this: M3eElement, value: unknown) {
          if (this.#values.has(name) && Object.is(this.#values.get(name), value)) return;
          this.#values.set(name, value);
          this.requestUpdate(name);
        },
      });
    }
    return map;
  }

  #values = new Map<string, unknown>();
  #changed = new Set<string>();
  #pending = false;
  #reflecting: string | null = null;
  #controller: AbortController | undefined;
  #initialized = false;

  constructor() {
    super();
    (this.constructor as typeof M3eElement).finalize();
  }

  /** Subclasses that override this must call `super.connectedCallback()`. */
  connectedCallback(): void {
    if (!this.#initialized) {
      this.#initialized = true;
      const self = this as unknown as Record<string, unknown>;
      for (const name of Object.keys((this.constructor as typeof M3eElement).properties)) {
        // A property set before the element upgraded is an own field shadowing the accessor.
        if (Object.hasOwn(this, name)) {
          const value = self[name];
          Reflect.deleteProperty(self, name);
          self[name] = value;
        }
        this.#changed.add(name);
      }
    }
    this.requestUpdate();
  }

  /** Subclasses that override this must call `super.disconnectedCallback()`. */
  disconnectedCallback(): void {
    this.#controller?.abort();
    this.#controller = undefined;
  }

  attributeChangedCallback(attribute: string, _old: string | null, value: string | null): void {
    if (attribute === this.#reflecting) return;
    const ctor = this.constructor as typeof M3eElement;
    const name = ctor.finalize().get(attribute);
    if (name === undefined) return;
    (this as unknown as Record<string, unknown>)[name] = fromAttribute(
      value,
      ctor.properties[name]?.type,
    );
  }

  /** Schedules a batched `update()` on the next microtask. */
  requestUpdate(name?: string): void {
    if (name !== undefined) this.#changed.add(name);
    if (this.#pending) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      if (this.isConnected) this.#flush();
    });
  }

  /**
   * Renders the DOM contract. `changed` holds the property names set since the last update;
   * on first connection it holds every declared property.
   */
  protected update(_changed: ReadonlySet<string>): void {
    // Subclasses render here.
  }

  /** Adds an event listener that is removed automatically when the element disconnects. */
  protected listen<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  protected listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void;
  protected listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    this.#controller ??= new AbortController();
    target.addEventListener(type, listener, { ...options, signal: this.#controller.signal });
  }

  /**
   * Dispatches a bubbling, composed `CustomEvent`. Returns `false` if a listener called
   * `preventDefault()` on a cancelable event.
   */
  protected emit(type: string, detail: unknown, init?: EventInit): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, { bubbles: true, composed: true, ...init, detail }),
    );
  }

  #flush(): void {
    const changed = this.#changed;
    this.#changed = new Set();
    const ctor = this.constructor as typeof M3eElement;
    for (const name of changed) {
      const decl = ctor.properties[name];
      const attribute = decl?.attribute ?? toKebab(name);
      if (!decl?.reflect || attribute === false || !this.#values.has(name)) continue;
      const value = this.#values.get(name);
      this.#reflecting = attribute;
      if (decl.type === Boolean) this.toggleAttribute(attribute, Boolean(value));
      else if (value == null) this.removeAttribute(attribute);
      // Reflected properties are declared as String or Number.
      else
        this.setAttribute(attribute, typeof value === 'number' ? String(value) : (value as string));
      this.#reflecting = null;
    }
    this.update(changed);
  }
}
