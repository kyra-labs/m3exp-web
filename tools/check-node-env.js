// Fails if a package build baked `process.env.NODE_ENV` into dist (run after `pnpm build`).
// Dev-only warnings (D4 deprecations, missing icon-button labels) must stay gated on the
// consumer's bundler, so every package whose source reads NODE_ENV must still read it in dist.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_ENV = 'process.env.NODE_ENV';
// A substituted comparison that esbuild did not fold. Folded ones leave no trace, which is why a
// package whose source reads NODE_ENV must also read it in dist.
const BAKED = /"(development|production)" [!=]==? "(development|production)"/;

/** Problems with one package's built JS, given whether its source reads NODE_ENV. */
export function nodeEnvProblems(distJs, sourceReadsNodeEnv) {
  const problems = BAKED.test(distJs) ? ['NODE_ENV was substituted at library build time'] : [];
  if (sourceReadsNodeEnv && !distJs.includes(NODE_ENV)) {
    problems.push(`source reads ${NODE_ENV} but dist does not`);
  }
  return problems;
}

const files = (dir, keep) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && keep(e.name))
    .map((e) => join(e.parentPath, e.name));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packages = fileURLToPath(new URL('../packages/', import.meta.url));
  let failed = false;
  for (const pkg of readdirSync(packages)) {
    const src = join(packages, pkg, 'src');
    const dist = join(packages, pkg, 'dist');
    const source = files(src, (n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n))
      .map((f) => readFileSync(f, 'utf8').replace(/\/\/.*$/gm, ''))
      .join('\n');
    if (!existsSync(dist)) continue;
    const distJs = files(dist, (n) => n.endsWith('.js'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const problem of nodeEnvProblems(distJs, source.includes(NODE_ENV))) {
      console.error(`::error::@kyralabs/${pkg}: ${problem}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`${NODE_ENV} is left for consumer bundlers in every package.`);
}
