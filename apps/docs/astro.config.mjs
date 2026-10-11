import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// Static docs/playground. React components render as client:only islands (D6: CSR only).
export default defineConfig({
  output: 'static',
  server: { port: 4321 },
  integrations: [react()],
});
