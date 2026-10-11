// m3e-codegen fetch             download the pinned androidx token files into vendor/
// m3e-codegen generate          regenerate packages/m3e-tokens/src/generated from vendor/
// m3e-codegen generate --check  fail if the generated files are out of date (CI)
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { generate } from './generate.js';
import { findRepoRoot, readPin, requirePin } from './pin.js';
import { fetchTokens, readVendor } from './vendor.js';

const root = findRepoRoot(process.cwd());
const vendorDir = join(root, 'packages/m3e-codegen/vendor/androidx-material3-tokens');
const outDir = join(root, 'packages/m3e-tokens/src/generated');

const listFiles = (dir: string): string[] => {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => relative(dir, join(e.parentPath, e.name)).replace(/\\/g, '/'))
      .sort();
  } catch {
    return [];
  }
};

async function main(command: string | undefined, flags: readonly string[]): Promise<number> {
  const pin = readPin(root);
  const commit = requirePin(pin, 'androidx_commit');
  if (command === 'fetch') {
    const manifest = await fetchTokens(requirePin(pin, 'androidx_repo'), commit, vendorDir);
    console.log(`fetched ${String(Object.keys(manifest.files).length)} token files @ ${commit}`);
    return 0;
  }
  if (command !== 'generate') {
    console.error('usage: m3e-codegen <fetch | generate [--check]>');
    return 2;
  }
  const { manifest, files } = readVendor(vendorDir);
  if (manifest.commit !== commit) {
    throw new Error(`vendor is at ${manifest.commit} but SOURCE_PIN says ${commit}; run fetch`);
  }
  const output = generate({ files, commit, upstreamPath: manifest.path });
  if (flags.includes('--check')) {
    const stale = [...output.keys()].filter((path) => {
      try {
        return readFileSync(join(outDir, path), 'utf8').replace(/\r\n/g, '\n') !== output.get(path);
      } catch {
        return true;
      }
    });
    const extra = listFiles(outDir).filter((p) => !output.has(p));
    for (const path of stale) console.error(`stale: ${path}`);
    for (const path of extra) console.error(`unexpected: ${path}`);
    if (stale.length > 0 || extra.length > 0) {
      console.error('Generated tokens are out of date. Run `pnpm codegen`.');
      return 1;
    }
    console.log(`generated tokens are up to date (${String(output.size)} files)`);
    return 0;
  }
  rmSync(outDir, { recursive: true, force: true });
  for (const [path, text] of output) {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), text);
  }
  console.log(`wrote ${String(output.size)} files to ${relative(root, outDir)}`);
  return 0;
}

main(process.argv[2], process.argv.slice(3)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
