// Vendored androidx token files. `fetch` downloads them once per pin bump; `generate` reads only
// the vendored copy (offline, deterministic) and verifies every file against the manifest.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SourceFile } from './generate.js';

export const MATERIAL3_PATH =
  'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3';
export const TOKENS_PATH = `${MATERIAL3_PATH}/tokens`;

/** Non-token Material3 sources the generator reads (e.g. expressiveLightColorScheme overrides). */
export const MATERIAL3_SOURCES = ['ColorScheme.kt'] as const;

export interface Manifest {
  repo: string;
  commit: string;
  path: string;
  files: Record<string, string>;
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Gitiles prefixes JSON responses with an XSSI guard line. */
const gitilesJson = (text: string): unknown => JSON.parse(text.slice(text.indexOf('\n') + 1));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET with retries: gitiles rate-limits bursts with 429 (honors Retry-After). */
async function get(url: string, attempts = 6): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= attempts) throw new Error(`GET ${url}: ${String(res.status)}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
  }
}

/**
 * Downloads `names` (or every `.kt` file in `path` when omitted) from `repo` at `commit` into
 * `outDir`, replacing its contents, and writes a sha256 manifest.
 */
export async function fetchVendor(
  repo: string,
  commit: string,
  path: string,
  outDir: string,
  names?: readonly string[],
): Promise<Manifest> {
  const base = `${repo}/+/${commit}/${path}`;
  let list = names ? [...names] : undefined;
  if (!list) {
    const listing = gitilesJson(await get(`${base}/?format=JSON`)) as {
      entries: { name: string }[];
    };
    list = listing.entries.map((e) => e.name).filter((n) => n.endsWith('.kt'));
  }
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const files: Record<string, string> = {};
  for (const name of list.sort()) {
    const text = Buffer.from(await get(`${base}/${name}?format=TEXT`), 'base64').toString('utf8');
    writeFileSync(join(outDir, name), text);
    files[name] = sha256(text);
    await sleep(100); // stay under gitiles' burst limit
  }
  const manifest: Manifest = { repo, commit, path, files };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export const fetchTokens = (repo: string, commit: string, outDir: string): Promise<Manifest> =>
  fetchVendor(repo, commit, TOKENS_PATH, outDir);

export function readVendor(dir: string): { manifest: Manifest; files: SourceFile[] } {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest;
  const onDisk = readdirSync(dir)
    .filter((n) => n.endsWith('.kt'))
    .sort();
  const expected = Object.keys(manifest.files).sort();
  if (onDisk.join() !== expected.join()) {
    throw new Error(`Vendored files differ from manifest in ${dir}; re-run \`m3e-codegen fetch\``);
  }
  const files = onDisk.map((name) => {
    // Normalize checkout line endings so hashes match on every platform.
    const content = readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n');
    if (sha256(content) !== manifest.files[name])
      throw new Error(`${name}: hash mismatch with manifest`);
    return { name, content };
  });
  return { manifest, files };
}
