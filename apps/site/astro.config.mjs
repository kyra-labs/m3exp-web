import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { codeTheme } from './src/lib/highlight.ts';

// The official site (DECISIONS D27). Static pages; React demos mount in the browser only (D6).
// Deployed to the Cloudflare Pages project `m3e-site` by .github/workflows/docs.yml.
export default defineConfig({
  site: 'https://m3e.kyralabs.dev',
  output: 'static',
  trailingSlash: 'always',
  // One request less before first paint: each page carries its CSS (≈ 40 kB compressed).
  build: { inlineStylesheets: 'always' },
  // Keep the spaces prose has next to inline tags (tools/check-docs-whitespace.js checks it);
  // compression would delete a line break that touches a tag. Pages are served compressed.
  compressHTML: false,
  server: { port: 4322 },
  // Markdown rendered from repository files (the 2.0 migration guide): code in the site's
  // token-colored theme (src/lib/repo-markdown.ts adapts the rest).
  markdown: { shikiConfig: { theme: codeTheme } },
  integrations: [
    react(),
    // The HTML example pages are demos, not documentation.
    sitemap({ filter: (page) => !page.includes('/examples/') }),
  ],
});
