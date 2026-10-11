// Repository-layout guards for the conventions in CLAUDE.md, DECISIONS.md and REQUIREMENTS §5.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(read(path));

const PACKAGES = [
  'm3e-tokens',
  'm3e-css',
  'm3e-elements',
  'm3e-react',
  'm3e-motion',
  'm3e-shapes',
  'm3e-codegen',
  'm3e-icons',
  'm3exp-web',
];
const pkgs = Object.fromEntries(PACKAGES.map((dir) => [dir, json(`packages/${dir}/package.json`)]));

// Allowed workspace dependencies per package (REQUIREMENTS §5: dependencies point downward only).
const ALLOWED_WORKSPACE_DEPS = {
  'm3e-tokens': [],
  'm3e-css': ['@kyralabs/m3e-tokens'],
  'm3e-motion': [],
  'm3e-shapes': [],
  'm3e-elements': [], // D7: zero runtime deps; motion/shapes are bundled, never listed
  'm3e-react': [
    '@kyralabs/m3e-tokens',
    '@kyralabs/m3e-css',
    '@kyralabs/m3e-motion',
    '@kyralabs/m3e-shapes',
  ],
  'm3e-codegen': [],
  'm3e-icons': [],
  'm3exp-web': [
    '@kyralabs/m3e-tokens',
    '@kyralabs/m3e-css',
    '@kyralabs/m3e-elements',
    '@kyralabs/m3e-react',
  ],
};

describe('repository layout', () => {
  it('has exactly the documented packages', () => {
    expect(readdirSync(new URL('packages/', root)).sort()).toEqual([...PACKAGES].sort());
  });

  it('commits the standing documents', () => {
    for (const file of [
      'CLAUDE.md',
      'DECISIONS.md',
      'LICENSE',
      'NOTICE',
      'SOURCE_PIN',
      'SOURCES.md',
    ]) {
      expect(existsSync(new URL(file, root)), file).toBe(true);
    }
  });

  it.each(PACKAGES)('%s follows package conventions', (dir) => {
    const pkg = pkgs[dir];
    expect(pkg.name).toBe(`@kyralabs/${dir}`);
    expect(pkg.license).toBe('Apache-2.0');
    expect(pkg.type).toBe('module');
    expect(pkg.repository.directory).toBe(`packages/${dir}`);
    for (const [path, target] of Object.entries(pkg.exports)) {
      if (typeof target === 'string') continue;
      const keys = Object.keys(target);
      expect(keys.indexOf('types'), `${path}: "types" must precede "import"`).toBeLessThan(
        keys.indexOf('import'),
      );
    }
    if (!pkg.private) {
      expect(pkg.publishConfig?.access).toBe('public');
      expect(pkg.files).toEqual(expect.arrayContaining(['dist', 'LICENSE', 'NOTICE']));
      expect(pkg.scripts.prepack).toBe('node ../../tools/copy-legal.js');
    }
  });

  it.each(PACKAGES)('%s only depends downward', (dir) => {
    const deps = Object.keys({ ...pkgs[dir].dependencies, ...pkgs[dir].peerDependencies }).filter(
      (name) => name.startsWith('@kyralabs/'),
    );
    for (const dep of deps) expect(ALLOWED_WORKSPACE_DEPS[dir]).toContain(dep);
  });

  it('m3e-elements has zero runtime dependencies (D7)', () => {
    expect(pkgs['m3e-elements'].dependencies ?? {}).toEqual({});
    expect(pkgs['m3e-elements'].peerDependencies ?? {}).toEqual({});
  });

  it('m3e-css contains no JavaScript', () => {
    const walk = (dir) =>
      readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}${e.name}/`) : [`${dir}${e.name}`],
      );
    expect(walk('packages/m3e-css/src/').filter((f) => !f.endsWith('.css'))).toEqual([]);
  });
});

describe('licensing (D9)', () => {
  const notice = read('NOTICE');

  it('LICENSE is Apache 2.0', () => {
    expect(read('LICENSE')).toMatch(/Apache License\s+Version 2\.0, January 2004/);
  });

  it.each(['AndroidX Compose Material3', 'AndroidX graphics-shapes', 'material-color-utilities'])(
    'NOTICE lists %s',
    (project) => {
      expect(notice).toContain(project);
    },
  );

  it('NOTICE references the pinned androidx commit', () => {
    const commit = /^androidx_commit=(\w+)$/m.exec(read('SOURCE_PIN'))?.[1];
    expect(commit).toMatch(/^[0-9a-f]{40}$/);
    expect(notice).toContain(commit);
  });

  it('NOTICE states the Apache 2.0 license and the TypeScript port', () => {
    expect(notice).toContain('Apache License, Version 2.0');
    expect(notice).toContain('ported to TypeScript by Kyra Labs');
  });
});
