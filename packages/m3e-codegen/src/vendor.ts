// Vendored androidx token files. `fetch` downloads them once per pin bump; `generate` reads only
// the vendored copy (offline, deterministic) and verifies every file against the manifest.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import type { SourceFile } from './generate.js';

export const MATERIAL3_PATH =
  'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3';
export const TOKENS_PATH = `${MATERIAL3_PATH}/tokens`;

/** Non-token Material3 sources the generator reads (e.g. expressiveLightColorScheme overrides). */
export const MATERIAL3_SOURCES = ['ColorScheme.kt'] as const;

/** Compose spring physics ported by m3e-motion (and compiled as-is by its JVM reference harness). */
export const ANIMATION_CORE_PATH =
  'compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core';
export const ANIMATION_CORE_SOURCES = ['SpringSimulation.kt', 'SpringEstimation.kt'] as const;

/** MaterialShapes and its helpers, ported by m3e-shapes (also compiled by its JVM harness). */
export const MATERIAL3_SHAPE_SOURCES = ['MaterialShapes.kt', 'internal/ShapeUtil.kt'] as const;

/** Compose UI Matrix (MaterialShapes rotates/scales presets with it). */
export const UI_GRAPHICS_PATH =
  'compose/ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics';
export const UI_GRAPHICS_SOURCES = ['Matrix.kt'] as const;

/**
 * graphics-shapes as Material3 1.5.0-beta01 consumes it: `api("androidx.graphics:graphics-shapes:1.0.1")`
 * (material3/build.gradle L58 at the androidx pin). Vendored from the published sources jar on
 * Google Maven (SOURCE_PIN graphics_shapes, graphics_shapes_sources_sha256): its release notes
 * give no commit of its own (1.0.0 and 1.0.1 link the same range), so the artifact is the source.
 */
export const GRAPHICS_SHAPES_ARTIFACT = 'androidx/graphics/graphics-shapes';
/** Source sets of the JVM target (Format.kt is `expect`; Format.jvm.kt is its `actual`). */
export const GRAPHICS_SHAPES_SOURCE_SETS = [
  'commonMain/androidx/graphics/shapes/',
  'jvmMain/androidx/graphics/shapes/',
] as const;
export const GOOGLE_MAVEN = 'https://dl.google.com/android/maven2';

export interface Manifest {
  repo: string;
  commit: string;
  path: string;
  files: Record<string, string>;
  /** Local file name → upstream path, for files fetched from a subdirectory. */
  upstream?: Record<string, string>;
  /** For files extracted from a Maven sources jar: its sha256. */
  sha256?: string;
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
  const upstream: Record<string, string> = {};
  for (const name of list.sort()) {
    const text = Buffer.from(await get(`${base}/${name}?format=TEXT`), 'base64').toString('utf8');
    // Stored flat under the file's base name; `upstream` records subdirectory paths.
    const local = name.slice(name.lastIndexOf('/') + 1);
    writeFileSync(join(outDir, local), text);
    files[local] = sha256(text);
    if (local !== name) upstream[local] = name;
    await sleep(100); // stay under gitiles' burst limit
  }
  const manifest: Manifest = {
    repo,
    commit,
    path,
    files,
    ...(Object.keys(upstream).length > 0 ? { upstream } : {}),
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** Reads the stored/deflated entries of a zip (jar) whose names start with one of `prefixes`. */
export function readZipEntries(zip: Buffer, prefixes: readonly string[]): Map<string, Buffer> {
  let eocd = zip.length - 22;
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file (no end of central directory)');
  const count = zip.readUInt16LE(eocd + 10);
  let at = zip.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('corrupt zip central directory');
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/') || !prefixes.some((p) => name.startsWith(p))) continue;
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + size);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    else throw new Error(`${name}: unsupported zip method ${String(method)}`);
  }
  return out;
}

/**
 * Downloads `<artifact>-<version>-sources.jar` from Google Maven, verifies it against `expectedSha256`
 * and vendors its `.kt` files under `prefixes` into `outDir` (flat, with a manifest).
 */
export async function fetchMavenSources(
  artifact: string,
  version: string,
  expectedSha256: string,
  prefixes: readonly string[],
  outDir: string,
): Promise<Manifest> {
  const base = artifact.slice(artifact.lastIndexOf('/') + 1);
  const url = `${GOOGLE_MAVEN}/${artifact}/${version}/${base}-${version}-sources.jar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: ${String(res.status)}`);
  const jar = Buffer.from(await res.arrayBuffer());
  const actual = createHash('sha256').update(jar).digest('hex');
  if (actual !== expectedSha256)
    throw new Error(`${url}: sha256 ${actual}, SOURCE_PIN expects ${expectedSha256}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const files: Record<string, string> = {};
  const upstream: Record<string, string> = {};
  const entries = [...readZipEntries(jar, prefixes)].filter(([name]) => name.endsWith('.kt'));
  for (const [name, data] of entries.sort(([a], [b]) => (a < b ? -1 : 1))) {
    const text = data.toString('utf8');
    const local = name.slice(name.lastIndexOf('/') + 1);
    if (local in files) throw new Error(`${local}: duplicate file name in ${url}`);
    writeFileSync(join(outDir, local), text);
    files[local] = sha256(text);
    upstream[local] = name;
  }
  const manifest: Manifest = {
    repo: url,
    commit: version,
    path: prefixes.join(', '),
    files,
    upstream,
    sha256: actual,
  };
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
