// Fails when a component has no page (DECISIONS D27). Checks that every COMPONENT_SPEC section,
// every m3e-react runtime export, every registered <m3e-*> element and every m3e-css file is
// claimed by an entry of src/data/components.ts, that each entry's page exists, and that the
// entries name nothing that no longer exists. Run after scripts/api.js (the build does).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENTS } from '../src/data/components.ts';

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const api = JSON.parse(readFileSync(join(SITE, 'src/generated/api.json'), 'utf8'));

// Pages still to come in the component-page PRs, emptied by the last one.
const PENDING = new Set(
  readFileSync(join(SITE, 'scripts/pending-components.txt'), 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean),
);

// Shared conventions (§0) is not a component; index.css and chip.css are aggregates.
const NOT_COMPONENTS = { spec: ['0'], css: ['chip'] };

const errors = [];
const claimed = (key) => new Set(COMPONENTS.flatMap((c) => c[key]));

const sections = Object.keys(api.spec).filter((s) => !NOT_COMPONENTS.spec.includes(s));
for (const s of sections) {
  if (!COMPONENTS.some((c) => c.spec === s)) {
    errors.push(
      `COMPONENT_SPEC §${s} (${api.spec[s].title}) has no entry in src/data/components.ts`,
    );
  }
}

for (const c of COMPONENTS) {
  const page = join(SITE, 'src/pages/components', `${c.slug}.astro`);
  if (PENDING.has(c.slug)) {
    if (existsSync(page))
      errors.push(`${c.slug} has a page: remove it from pending-components.txt`);
  } else if (!existsSync(page)) {
    errors.push(
      `${c.slug} (COMPONENT_SPEC §${c.spec}) has no page: src/pages/components/${c.slug}.astro`,
    );
  }
  if (!api.spec[c.spec]) errors.push(`${c.slug}: COMPONENT_SPEC has no §${c.spec}`);
  for (const name of c.react) {
    if (!api.react[name]) errors.push(`${c.slug}: m3e-react exports no ${name}`);
  }
  for (const tag of c.elements) {
    if (!api.elements[tag]) errors.push(`${c.slug}: m3e-elements registers no <${tag}>`);
  }
  for (const file of c.css) {
    if (!api.css[file]) errors.push(`${c.slug}: m3e-css has no ${file}.css`);
  }
}
for (const slug of PENDING) {
  if (!COMPONENTS.some((c) => c.slug === slug))
    errors.push(`pending-components.txt: unknown ${slug}`);
}

const react = claimed('react');
for (const name of Object.keys(api.react)) {
  if (!react.has(name)) errors.push(`m3e-react export ${name} is not on any component page`);
}
const elements = claimed('elements');
for (const tag of Object.keys(api.elements)) {
  // Data children (items, results, tabs) are documented with their parent element.
  const parent = Object.keys(api.elements).find((t) => tag !== t && tag.startsWith(`${t}-`));
  if (!elements.has(tag) && !(parent && elements.has(parent))) {
    errors.push(`<${tag}> is not on any component page`);
  }
}
const css = claimed('css');
for (const file of Object.keys(api.css)) {
  if (!css.has(file) && !NOT_COMPONENTS.css.includes(file)) {
    errors.push(`m3e-css ${file}.css is not on any component page`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const done = COMPONENTS.length - PENDING.size;
  console.log(
    `Component pages: ${String(done)} of ${String(COMPONENTS.length)}` +
      (PENDING.size > 0 ? ` (${String(PENDING.size)} pending: ${[...PENDING].join(', ')})` : '') +
      '. Every spec section, React export, element and CSS file is claimed.',
  );
}
