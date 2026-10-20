import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// The official site (DECISIONS D27). Static pages; React demos mount in the browser only (D6).
// Deployed to the Cloudflare Pages project `m3e-site` by .github/workflows/docs.yml.
export default defineConfig({
  site: 'https://m3e.kyralabs.dev',
  output: 'static',
  trailingSlash: 'always',
  // One request less before first paint: each page carries its CSS (≈ 40 kB compressed).
  build: { inlineStylesheets: 'always' },
  server: { port: 4322 },
  integrations: [react(), sitemap()],
});
