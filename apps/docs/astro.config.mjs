import { defineConfig } from 'astro/config';

// Static docs/playground. React islands (client:only, D6) are added with the first React
// component in M4.
export default defineConfig({
  output: 'static',
  server: { port: 4321 },
});
