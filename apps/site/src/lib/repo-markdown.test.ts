import { describe, expect, it } from 'vitest';
import { adaptRepoMarkdown } from './repo-markdown';

const FILE = 'https://github.com/kyra-labs/m3exp-web/blob/main/docs/2.0-removal-plan.md';

describe('adaptRepoMarkdown', () => {
  it('drops the h1, rewrites relative links and wraps tables', () => {
    const html = [
      '<h1 id="plan">2.0 removal plan</h1>',
      '<p>See <a href="../DECISIONS.md">DECISIONS</a>, <a href="#x">here</a> and <a href="https://example.com/">there</a>.</p>',
      '<h2 id="one">1. Deprecated <code>components</code></h2>',
      '<table><tr><td>a</td></tr></table>',
      '<table><tr><td>b</td></tr></table>',
    ].join('\n');
    const out = adaptRepoMarkdown(html, FILE);
    expect(out).not.toContain('<h1');
    expect(out).toContain('href="https://github.com/kyra-labs/m3exp-web/blob/main/DECISIONS.md"');
    expect(out).toContain('href="#x"');
    expect(out).toContain('href="https://example.com/"');
    expect(out).toContain(
      '<div class="site-table" role="region" aria-label="1. Deprecated components (table 1)" tabindex="0"><table>',
    );
    expect(out).toContain('aria-label="1. Deprecated components (table 2)"');
  });
});
