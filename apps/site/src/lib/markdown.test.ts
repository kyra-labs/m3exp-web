import { describe, expect, it } from 'vitest';
import { block, inline } from './markdown';

describe('markdown subset', () => {
  it('escapes HTML and keeps code verbatim', () => {
    expect(inline('a <b> `**x**` c')).toBe('a &lt;b&gt; <code>**x**</code> c');
  });

  it('renders bold, emphasis and links', () => {
    expect(inline('**Bold** *em* [t](https://a.b/c)')).toBe(
      '<strong>Bold</strong> <em>em</em> <a href="https://a.b/c">t</a>',
    );
  });

  it('links bare m3.material.io references', () => {
    expect(inline('see m3.material.io/components/buttons/overview.')).toBe(
      'see <a href="https://m3.material.io/components/buttons/overview">m3.material.io/components/buttons/overview</a>.',
    );
  });

  it('builds paragraphs and lists, dropping checkboxes', () => {
    expect(block('One\ntwo\n\n- [ ] a\n  b\n- c')).toBe(
      '<p>One two</p>\n<ul><li>a b</li><li>c</li></ul>',
    );
  });
});

describe('JSDoc links', () => {
  it('renders {@link X} as code', () => {
    expect(inline('use {@link ButtonGroup } instead')).toBe('use <code>ButtonGroup</code> instead');
  });
});
