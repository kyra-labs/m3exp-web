import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// Static docs/playground. React components render as client:only islands (D6: CSR only).
// Deployed to Cloudflare Pages by .github/workflows/docs.yml.
export default defineConfig({
  site: 'https://m3epg.kyralabs.dev',
  output: 'static',
  server: { port: 4321 },
  integrations: [react()],
});
