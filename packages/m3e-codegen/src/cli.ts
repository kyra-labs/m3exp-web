// m3e-codegen fetch             download the pinned androidx token files into vendor/
// m3e-codegen generate          regenerate packages/m3e-tokens/src/generated from vendor/
// m3e-codegen generate --check  fail if the generated files are out of date (CI)
// m3e-codegen fonts:fetch [--measure-fallback <arial.ttf>]
//                               pin bumps only: vendor Google Sans Flex sources (SOURCE_PIN)
// m3e-codegen fonts [--check]   rebuild packages/m3e-tokens/fonts from the pinned TTF
// m3e-codegen icons:fetch        pin bumps only: Material Symbols fonts + descriptors (SOURCE_PIN)
// m3e-codegen icons [--check]   regenerate material-symbols*.css (verifies shipped font hashes)
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { buildFonts, fetchFontSources, measureFallback, type FontSourceManifest } from './fonts.js';
import { generate } from './generate.js';
import { buildIconCss, fetchIconSources } from './icons.js';
import { readGeneratorInputs } from './inputs.js';
import { findRepoRoot, readPin, requirePin } from './pin.js';
import {
  ANIMATION_CORE_PATH,
  FOUNDATION_RES_PATH,
  FOUNDATION_RES_SOURCES,
  MATERIAL3_RES_PATH,
  MATERIAL3_RES_SOURCES,
  UI_RES_PATH,
  UI_RES_SOURCES,
  ANIMATION_CORE_SOURCES,
  ANIMATION_CORE_EASING_SOURCES,
  ANIMATION_CORE_SPEC_SOURCES,
  GRAPHICS_SHAPES_ARTIFACT,
  GRAPHICS_SHAPES_SOURCE_SETS,
  MATERIAL3_SHAPE_SOURCES,
  UI_GRAPHICS_PATH,
  UI_GRAPHICS_SOURCES,
  UI_PATH,
  UI_SOURCES,
  MATERIAL_WEB_FILES,
  MATERIAL_WEB_PACKAGE,
  MATERIAL3_PATH,
  MATERIAL3_SOURCES,
  MATERIAL3_ANDROID_PATH,
  MATERIAL3_ANDROID_SOURCES,
  MATERIAL3_SAMPLES_PATH,
  MATERIAL3_SAMPLE_SOURCES,
  MATERIAL3_ADAPTIVE_PATH,
  MATERIAL3_ADAPTIVE_SOURCES,
  WINDOW_CORE_PATH,
  WINDOW_CORE_SOURCES,
  fetchMavenSources,
  fetchNpmFiles,
  fetchTokens,
  fetchVendor,
} from './vendor.js';

const root = findRepoRoot(process.cwd());
const vendorDir = join(root, 'packages/m3e-codegen/vendor/androidx-material3-tokens');
const sourcesDir = join(root, 'packages/m3e-codegen/vendor/androidx-material3-sources');
const androidSourcesDir = join(
  root,
  'packages/m3e-codegen/vendor/androidx-material3-android-sources',
);
const animationDir = join(root, 'packages/m3e-codegen/vendor/androidx-animation-core');
const easingDir = join(root, 'packages/m3e-codegen/vendor/androidx-animation-easing');
const animationSpecsDir = join(root, 'packages/m3e-codegen/vendor/androidx-animation-core-specs');
const samplesDir = join(root, 'packages/m3e-codegen/vendor/androidx-material3-samples');
const uiSourcesDir = join(root, 'packages/m3e-codegen/vendor/androidx-ui-sources');
const materialWebDir = join(root, 'packages/m3e-codegen/vendor/material-web');
const shapesVendor = (name: string) => join(root, 'packages/m3e-codegen/vendor', name);
const outDir = join(root, 'packages/m3e-tokens/src/generated');
const fontVendorDir = join(root, 'packages/m3e-codegen/vendor/google-fonts-googlesansflex');
const fontOutDir = join(root, 'packages/m3e-tokens/fonts');
const cacheDir = join(root, 'node_modules/.cache/m3e-codegen');
const iconVendorDir = join(root, 'packages/m3e-codegen/vendor/material-symbols');

/**
 * Files in packages/m3e-tokens/fonts produced by `fonts`: chunks, manifest, licenses and every
 * profile stylesheet (`fonts.css`, `fonts-<profile>.css`). Material Symbols files belong to `icons`.
 */
const ownsGoogleSansFlex = (path: string) =>
  /^(google-sans-flex[\w.-]*|fonts(-[a-z]+)?\.css|(LICENSE|TRADEMARKS)-google-sans-flex\.\w+)$/.test(
    path,
  );

/**
 * Writes `output` into `dir`, or with `check` reports stale/unexpected files instead. Only files
 * matching `owns` are this generator's: others in `dir` (another pipeline's) are left alone.
 */
function syncDir(
  dir: string,
  output: ReadonlyMap<string, string | Uint8Array>,
  check: boolean,
  owns: (path: string) => boolean = () => true,
): number {
  const same = (path: string, data: string | Uint8Array) => {
    try {
      const disk = readFileSync(join(dir, path));
      return typeof data === 'string'
        ? disk.toString('utf8').replace(/\r\n/g, '\n') === data
        : Buffer.compare(disk, Buffer.from(data)) === 0;
    } catch {
      return false;
    }
  };
  if (check) {
    const stale = [...output].filter(([path, data]) => !same(path, data)).map(([p]) => p);
    const extra = listFiles(dir).filter((p) => owns(p) && !output.has(p));
    for (const path of stale) console.error(`stale: ${path}`);
    for (const path of extra) console.error(`unexpected: ${path}`);
    if (stale.length > 0 || extra.length > 0) {
      console.error(`${relative(root, dir)} is out of date.`);
      return 1;
    }
    console.log(`${relative(root, dir)} is up to date (${String(output.size)} files)`);
    return 0;
  }
  for (const path of listFiles(dir).filter(owns)) rmSync(join(dir, path));
  for (const [path, data] of output) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), data);
  }
  console.log(`wrote ${String(output.size)} files to ${relative(root, dir)}`);
  return 0;
}

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
  if (command === 'fonts:fetch') {
    const at = flags.indexOf('--measure-fallback');
    const arialPath = at === -1 ? undefined : flags[at + 1];
    let fallback: FontSourceManifest['fallback'];
    if (arialPath) fallback = measureFallback(arialPath, 'Arial', ['Arial', 'ArialMT']);
    else {
      const previous = JSON.parse(
        readFileSync(join(fontVendorDir, 'manifest.json'), 'utf8'),
      ) as FontSourceManifest;
      fallback = previous.fallback;
    }
    const manifest = await fetchFontSources(
      requirePin(pin, 'google_fonts_commit'),
      fontVendorDir,
      cacheDir,
      fallback,
    );
    console.log(`fetched Google Sans Flex ${manifest.version} @ google/fonts ${manifest.commit}`);
    return 0;
  }
  if (command === 'icons:fetch') {
    const manifest = await fetchIconSources(
      requirePin(pin, 'material_symbols_commit'),
      iconVendorDir,
      fontOutDir,
    );
    console.log(`fetched Material Symbols ${manifest.version} @ ${manifest.commit}`);
    return 0;
  }
  if (command === 'icons') {
    const css = buildIconCss(iconVendorDir, fontOutDir);
    return syncDir(fontOutDir, css, flags.includes('--check'), (p) =>
      /^material-symbols[\w-]*\.css$/.test(p),
    );
  }
  if (command === 'fonts') {
    const { files } = await buildFonts(fontVendorDir, cacheDir);
    return syncDir(fontOutDir, files, flags.includes('--check'), ownsGoogleSansFlex);
  }
  const commit = requirePin(pin, 'androidx_commit');
  if (command === 'fetch') {
    const repo = requirePin(pin, 'androidx_repo');
    const manifest = await fetchTokens(repo, commit, vendorDir);
    await fetchVendor(repo, commit, MATERIAL3_PATH, sourcesDir, MATERIAL3_SOURCES);
    await fetchVendor(
      repo,
      commit,
      MATERIAL3_ANDROID_PATH,
      androidSourcesDir,
      MATERIAL3_ANDROID_SOURCES,
    );
    await fetchVendor(repo, commit, ANIMATION_CORE_PATH, animationDir, ANIMATION_CORE_SOURCES);
    await fetchVendor(repo, commit, ANIMATION_CORE_PATH, easingDir, ANIMATION_CORE_EASING_SOURCES);
    await fetchVendor(
      repo,
      commit,
      ANIMATION_CORE_PATH,
      animationSpecsDir,
      ANIMATION_CORE_SPEC_SOURCES,
    );
    await fetchVendor(repo, commit, MATERIAL3_SAMPLES_PATH, samplesDir, MATERIAL3_SAMPLE_SOURCES);
    await fetchVendor(repo, commit, UI_PATH, uiSourcesDir, UI_SOURCES);
    await fetchVendor(
      repo,
      commit,
      FOUNDATION_RES_PATH,
      shapesVendor('androidx-foundation-res'),
      FOUNDATION_RES_SOURCES,
    );
    await fetchVendor(
      repo,
      commit,
      MATERIAL3_RES_PATH,
      shapesVendor('androidx-material3-res'),
      MATERIAL3_RES_SOURCES,
    );
    await fetchVendor(repo, commit, UI_RES_PATH, shapesVendor('androidx-ui-res'), UI_RES_SOURCES);
    await fetchVendor(
      repo,
      commit,
      WINDOW_CORE_PATH,
      shapesVendor('androidx-window-core'),
      WINDOW_CORE_SOURCES,
    );
    await fetchVendor(
      repo,
      commit,
      MATERIAL3_ADAPTIVE_PATH,
      shapesVendor('androidx-material3-adaptive'),
      MATERIAL3_ADAPTIVE_SOURCES,
    );
    await fetchNpmFiles(
      MATERIAL_WEB_PACKAGE,
      requirePin(pin, 'material_web'),
      MATERIAL_WEB_FILES,
      materialWebDir,
    );
    await fetchVendor(
      repo,
      commit,
      MATERIAL3_PATH,
      shapesVendor('androidx-material3-shapes'),
      MATERIAL3_SHAPE_SOURCES,
    );
    await fetchVendor(
      repo,
      commit,
      UI_GRAPHICS_PATH,
      shapesVendor('androidx-ui-graphics'),
      UI_GRAPHICS_SOURCES,
    );
    await fetchMavenSources(
      GRAPHICS_SHAPES_ARTIFACT,
      requirePin(pin, 'graphics_shapes'),
      requirePin(pin, 'graphics_shapes_sources_sha256'),
      GRAPHICS_SHAPES_SOURCE_SETS,
      shapesVendor('androidx-graphics-shapes'),
    );
    console.log(
      `fetched ${String(Object.keys(manifest.files).length)} token files + ${MATERIAL3_SOURCES.join(', ')} @ ${commit}`,
    );
    return 0;
  }
  if (command !== 'generate') {
    console.error(
      'usage: m3e-codegen <fetch | generate [--check] | fonts:fetch | fonts [--check] | icons:fetch | icons [--check]>',
    );
    return 2;
  }
  const output = generate(readGeneratorInputs(root, pin));
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
