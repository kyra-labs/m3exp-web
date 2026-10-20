// Every HTML example (src/examples/<slug>/<name>.html) runs as written: it loads with no console
// errors, every custom element in it upgrades, and axe finds nothing.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const dist = fileURLToPath(new URL('../dist/examples/', import.meta.url));
const EXAMPLES = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === 'index.html')
  .map((e) => `/examples/${e.parentPath.slice(dist.length).replace(/\\/g, '/')}/`);

test.describe('HTML examples', () => {
  for (const path of EXAMPLES) {
    test(path, async ({ page }, info) => {
      test.skip(info.project.name !== 'light', 'once is enough');
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.goto(path);
      await page.locator('body[data-ready]').waitFor();
      const undefinedTags = await page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter((el) => el.localName.startsWith('m3e-') && !customElements.get(el.localName))
          .map((el) => el.localName),
      );
      expect(undefinedTags).toEqual([]);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});
