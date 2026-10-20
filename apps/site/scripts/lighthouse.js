// Lighthouse on a sample of built pages, mobile (Lighthouse's default emulation and simulated
// throttling), served compressed like production (scripts/serve.js). Fails below the D27 gates:
// performance ≥ 90, accessibility and SEO 100. Each page runs three times and the median
// performance counts. Usage: node scripts/lighthouse.js (Chrome from CHROME_PATH or Playwright).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(SITE, 'lighthouse');
const PORT = 4323;
const RUNS = 3;
const GATES = { performance: 0.9, accessibility: 1, seo: 1 };
// The home page and the first page of each section, as far as they are built.
const SAMPLE = [
  '/',
  '/get-started/',
  '/get-started/react/',
  '/components/',
  '/components/button/',
  '/components/date-picker/',
  '/foundations/color/',
  '/foundations/motion/',
  '/changelog/',
].filter((path) => existsSync(join(SITE, 'dist', path, 'index.html')));
// `node scripts/lighthouse.js / /get-started/` measures only the given pages.
const ONLY = process.argv.slice(2);
const PAGES = ONLY.length > 0 ? ONLY : SAMPLE;

const server = spawn(process.execPath, [join(SITE, 'scripts/serve.js'), String(PORT)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 500));

const chrome = await chromeLauncher.launch({
  chromePath: process.env['CHROME_PATH'] ?? chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
});

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const rows = [];
let failed = false;
mkdirSync(OUT, { recursive: true });
try {
  for (const path of PAGES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(`http://localhost:${String(PORT)}${path}`, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      });
      if (!result) throw new Error(`Lighthouse returned nothing for ${path}`);
      runs.push(result.lhr);
    }
    const score = (lhr, key) => lhr.categories[key]?.score ?? 0;
    const perf = median(runs.map((lhr) => score(lhr, 'performance')));
    const last = runs.at(-1);
    const row = {
      path,
      performance: perf,
      accessibility: score(last, 'accessibility'),
      bestPractices: score(last, 'best-practices'),
      seo: score(last, 'seo'),
      lcp: last.audits['largest-contentful-paint']?.displayValue,
      tbt: last.audits['total-blocking-time']?.displayValue,
      cls: last.audits['cumulative-layout-shift']?.displayValue,
    };
    rows.push(row);
    writeFileSync(
      join(OUT, `${path.replace(/\//g, '_') || 'home'}.json`),
      JSON.stringify(last, null, 2),
    );
    for (const [key, gate] of Object.entries(GATES)) {
      if (row[key] < gate) {
        failed = true;
        const audits = Object.values(last.audits)
          .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative')
          .filter((a) => last.categories[key]?.auditRefs.some((r) => r.id === a.id && r.weight > 0))
          .map((a) => `${a.id} (${String(a.score)})`);
        console.error(
          `${path}: ${key} ${String(row[key])} < ${String(gate)}: ${audits.join(', ')}`,
        );
      }
    }
  }
} finally {
  chrome.kill();
  server.kill();
}

console.table(rows);
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(rows, null, 2));
if (failed) process.exitCode = 1;
