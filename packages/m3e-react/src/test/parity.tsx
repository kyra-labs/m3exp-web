// DOM parity (CLAUDE.md "Done means" #8): an element and its React component must render the
// same m3e-css contract. Both are serialized canonically (attributes sorted, `style` normalized)
// so attribute order is not a difference.
import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const styleText = (el: Element): string => {
  const style = (el as HTMLElement).style;
  const decls: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    decls.push(`${name}: ${style.getPropertyValue(name).trim()}`);
  }
  return decls.sort().join('; ');
};

/** Canonical serialization of a node tree. */
export function canonical(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const attrs = [...el.attributes]
    .map((a) => ({ name: a.name, value: a.name === 'style' ? styleText(el) : a.value }))
    .filter((a) => !(a.name === 'style' && a.value === ''))
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .map((a) => ` ${a.name}="${a.value}"`)
    .join('');
  const tag = el.tagName.toLowerCase();
  return `<${tag}${attrs}>${[...el.childNodes].map(canonical).join('')}</${tag}>`;
}

/** Renders `ui` with React into a fresh container and returns the container. */
export async function renderReact(ui: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(ui);
    await Promise.resolve();
  });
  return container;
}

/** Mounts element markup and waits for its batched render. */
export async function renderElement(html: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  for (let i = 0; i < 2; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
  return container.firstElementChild as HTMLElement;
}

/** The contract an element renders inside itself (its children), canonically. */
export const elementContract = (host: HTMLElement): string =>
  [...host.childNodes].map(canonical).join('');

/** What a React component rendered into `container`, canonically. */
export const reactContract = (container: HTMLElement): string =>
  [...container.childNodes].map(canonical).join('');
