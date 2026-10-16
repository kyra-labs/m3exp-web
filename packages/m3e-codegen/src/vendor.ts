// Vendored androidx token files. `fetch` downloads them once per pin bump; `generate` reads only
// the vendored copy (offline, deterministic) and verifies every file against the manifest.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';
import type { SourceFile } from './generate.js';

export const MATERIAL3_PATH =
  'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3';
export const TOKENS_PATH = `${MATERIAL3_PATH}/tokens`;

/** Non-token Material3 sources the generator reads (expressiveLightColorScheme overrides, *Defaults). */
export const MATERIAL3_SOURCES = [
  'ColorScheme.kt',
  'Button.kt',
  'ButtonGroup.kt',
  'Chip.kt',
  'ToggleButton.kt',
  'InteractiveComponentSize.kt',
  'internal/Elevation.kt',
  'NavigationBar.kt',
  'NavigationRail.kt',
  'ShortNavigationBar.kt',
  'WideNavigationRail.kt',
  'WideNavigationRailState.kt',
  'NavigationItem.kt',
  'AppBar.kt',
  'LoadingIndicator.kt',
  'FloatingActionButton.kt',
  'FloatingActionButtonMenu.kt',
  'Shapes.kt',
  'Menu.kt',
  'MenuDefaults.kt',
  'internal/MenuPosition.kt',
  'SplitButton.kt',
  'HorizontalCenterOptically.kt',
  'FloatingToolbar.kt',
  'ProgressIndicator.kt',
  'WavyProgressIndicator.kt',
  'internal/LinearWavyProgressModifiers.kt',
  'internal/CircularWavyProgressModifiers.kt',
  'SearchBar.kt',
  'TextFieldDefaults.kt',
  'internal/TextFieldImpl.kt',
  'ListItem.kt',
  'ListItemDefaults.kt',
  'ComposeMaterial3Flags.kt',
] as const;

/** Material3 samples the generator reads (values the Compose catalog renders, e.g. icon rotation). */
export const MATERIAL3_SAMPLES_PATH =
  'compose/material3/material3/samples/src/main/java/androidx/compose/material3/samples';
export const MATERIAL3_SAMPLE_SOURCES = [
  'AppBarSamples.kt',
  'SplitButtonSamples.kt',
  'ProgressIndicatorSamples.kt',
  'SearchBarSamples.kt',
  'NavigationRailSamples.kt',
] as const;

/** Android `actual`s the generator reads (DropdownMenu's popup margins, AndroidMenu.android.kt). */
export const MATERIAL3_ANDROID_PATH =
  'compose/material3/material3/src/androidMain/kotlin/androidx/compose/material3';
export const MATERIAL3_ANDROID_SOURCES = ['AndroidMenu.android.kt'] as const;

/** Compose spring physics ported by m3e-motion (and compiled as-is by its JVM reference harness). */
export const ANIMATION_CORE_PATH =
  'compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core';
export const ANIMATION_CORE_SOURCES = ['SpringSimulation.kt', 'SpringEstimation.kt'] as const;
/** Easing constants (FastOutSlowInEasing…), vendored apart so the spring harness stays minimal. */
export const ANIMATION_CORE_EASING_SOURCES = ['Easing.kt'] as const;
/** `animate*AsState` defaults: `spring()` and the `Spring` constants it defaults to. */
export const ANIMATION_CORE_SPEC_SOURCES = [
  'AnimateAsState.kt',
  'AnimationSpec.kt',
  'VectorizedAnimationSpec.kt',
] as const;

/** MaterialShapes and its helpers, ported by m3e-shapes (also compiled by its JVM harness). */
export const MATERIAL3_SHAPE_SOURCES = ['MaterialShapes.kt', 'internal/ShapeUtil.kt'] as const;

/** Compose UI Matrix (MaterialShapes rotates/scales presets with it). */
export const UI_GRAPHICS_PATH =
  'compose/ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics';
export const UI_GRAPHICS_SOURCES = ['Matrix.kt'] as const;

/** Compose UI graphics-layer defaults (`DefaultShadowColor` → `--m3e-sys-color-shadow`). */
export const UI_PATH = 'compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/graphics';
export const UI_SOURCES = ['GraphicsLayerScope.kt'] as const;

/**
 * Material Web (secondary source, CLAUDE.md) files read by the generator: the elevation shadow
 * table (Compose draws platform shadows, so no androidx value exists). From the npm tarball of the
 * SOURCE_PIN `material_web` version, verified against the registry's sha512 integrity.
 */
export const MATERIAL_WEB_PACKAGE = '@material/web';
export const MATERIAL_WEB_FILES = ['elevation/internal/_elevation.scss', 'LICENSE'] as const;

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
  /** Archive digest: a Maven sources jar sha256, or an npm tarball sha512 integrity. */
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

/** Reads the regular files of a (ustar) tar archive whose names are in `names`. */
export function readTarEntries(tar: Buffer, names: readonly string[]): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  for (let at = 0; at + 512 <= tar.length;) {
    const header = tar.subarray(at, at + 512);
    if (header.every((b) => b === 0)) break;
    const field = (start: number, length: number) =>
      header.toString('utf8', start, start + length).replace(/\0[\s\S]*$/, '');
    const prefix = field(345, 155);
    const name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1);
    if ((type === '0' || type === '') && names.includes(name)) {
      out.set(name, Buffer.from(tar.subarray(at + 512, at + 512 + size)));
    }
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

/**
 * Downloads `pkg@version` from the npm registry, verifies the tarball against the registry's
 * sha512 `integrity`, and vendors `files` (paths inside the package) flat into `outDir`.
 */
export async function fetchNpmFiles(
  pkg: string,
  version: string,
  files: readonly string[],
  outDir: string,
): Promise<Manifest> {
  const meta = JSON.parse(await get(`https://registry.npmjs.org/${pkg}/${version}`)) as {
    dist: { tarball: string; integrity: string };
  };
  const res = await fetch(meta.dist.tarball);
  if (!res.ok) throw new Error(`GET ${meta.dist.tarball}: ${String(res.status)}`);
  const tgz = Buffer.from(await res.arrayBuffer());
  const integrity = `sha512-${createHash('sha512').update(tgz).digest('base64')}`;
  if (integrity !== meta.dist.integrity) {
    throw new Error(
      `${meta.dist.tarball}: integrity ${integrity}, registry says ${meta.dist.integrity}`,
    );
  }
  const entries = readTarEntries(
    gunzipSync(tgz),
    files.map((f) => `package/${f}`),
  );
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const hashes: Record<string, string> = {};
  const upstream: Record<string, string> = {};
  for (const file of files) {
    const data = entries.get(`package/${file}`);
    if (!data) throw new Error(`${pkg}@${version}: ${file} not in tarball`);
    const text = data.toString('utf8').replace(/\r\n/g, '\n');
    const local = file.slice(file.lastIndexOf('/') + 1);
    writeFileSync(join(outDir, local), text);
    hashes[local] = sha256(text);
    if (local !== file) upstream[local] = file;
  }
  const manifest: Manifest = {
    repo: meta.dist.tarball,
    commit: version,
    path: pkg,
    files: hashes,
    upstream,
    sha256: integrity,
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export const fetchTokens = (repo: string, commit: string, outDir: string): Promise<Manifest> =>
  fetchVendor(repo, commit, TOKENS_PATH, outDir);

export function readVendor(dir: string): { manifest: Manifest; files: SourceFile[] } {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest;
  const onDisk = readdirSync(dir)
    .filter((n) => n !== 'manifest.json')
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
