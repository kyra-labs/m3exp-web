import { describe, expect, it } from 'vitest';
import { gluedBoundaries } from './check-docs-whitespace.js';

const page = (body) => `<!doctype html><html><body><main>${body}</main></body></html>`;

describe('check-docs-whitespace', () => {
  it('accepts spaced prose', () => {
    expect(
      gluedBoundaries(page('<p>The <code>open</code> attribute, <a href="#">here</a>.</p>')),
    ).toEqual([]);
  });

  // What Astro's compressHTML leaves of "The⏎<code>…" and "</code>⏎(vendored".
  it('flags a word glued to an inline element on either side', () => {
    expect(gluedBoundaries(page('<p>The<code>open</code> attribute.</p>'))).toEqual([
      'The⟂<code>open</code>',
    ]);
    expect(gluedBoundaries(page('<p><code>Toolbar.kt</code>(vendored)</p>'))).toEqual([
      '<code>Toolbar.kt</code>⟂(vendored)',
    ]);
    expect(gluedBoundaries(page('<li>a,<code>b</code></li>'))).toEqual(['a,⟂<code>b</code>']);
    expect(gluedBoundaries(page('<p><code>a</code><strong>b</strong></p>'))).toHaveLength(1);
  });

  it('allows deliberate plurals and slash-joined names', () => {
    expect(gluedBoundaries(page('<p>Its <code>&lt;TabPanel&gt;</code>s render.</p>'))).toEqual([]);
    expect(
      gluedBoundaries(page('<p><code>Small</code>/<code>Medium</code>/<code>Large</code></p>')),
    ).toEqual([]);
    expect(gluedBoundaries(page('<p><code>a</code>so</p>'))).toHaveLength(1);
  });

  it('ignores punctuation, code blocks, icons and non-prose markup', () => {
    expect(gluedBoundaries(page('<p>(<code>a</code>), <code>b</code>.</p>'))).toEqual([]);
    expect(gluedBoundaries(page('<pre>x<code>y</code>z</pre>'))).toEqual([]);
    expect(
      gluedBoundaries(page('<p><span class="m3e-icon">add</span>Add<code>x</code> </p>')),
    ).toHaveLength(1);
    expect(gluedBoundaries(page('<p><span class="m3e-icon">a<b>b</b>c</span></p>'))).toEqual([]);
    expect(gluedBoundaries(page('<div>label<code>x</code></div>'))).toEqual([]);
  });
});
