import { describe, expect, it } from 'vitest';
import { runnableExample } from './example-modules';

describe('runnableExample', () => {
  it('loads m3e-elements imports through the page loader', () => {
    const html = [
      '<header class="m3e-top-app-bar"></header>',
      '<script type="module">',
      '  import {',
      '    attachTopAppBarScroll,',
      '    settleAppBar as settle,',
      "  } from '@kyralabs/m3e-elements/top-app-bar.js';",
      "  import '@kyralabs/m3e-elements/ripple.js';",
      '  attachTopAppBarScroll(bar, options);',
      '</script>',
    ].join('\n');
    const out = runnableExample(html);
    expect(out).toContain(
      "const {\n    attachTopAppBarScroll,\n    settleAppBar: settle,\n  } = await m3eImport('top-app-bar');",
    );
    expect(out).toContain("await m3eImport('ripple');");
    expect(out).toContain('attachTopAppBarScroll(bar, options);');
    expect(out).not.toContain('import ');
  });

  it('leaves markup and classic scripts alone', () => {
    const html = '<button>Open</button>\n<script>\n  const a = 1;\n</script>';
    expect(runnableExample(html)).toBe(html);
  });

  it('fails on imports an example page cannot resolve', () => {
    expect(() =>
      runnableExample('<script type="module">\nimport x from \'lodash\';\n</script>'),
    ).toThrow();
    expect(() =>
      runnableExample('<script type="module">\nimport { a } from \'lodash\';\n</script>'),
    ).toThrow(/lodash/);
  });
});
