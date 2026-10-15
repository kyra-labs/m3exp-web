// Loads everything `generate` reads from packages/m3e-codegen/vendor, checking each vendor
// directory against SOURCE_PIN. Shared by the CLI and the generator tests.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GenerateOptions } from './generate.js';
import { type SourcePin, requirePin } from './pin.js';
import { readVendor } from './vendor.js';

const vendorFile = (dir: string, name: string, expected: string) => {
  const { manifest, files } = readVendor(dir);
  if (manifest.commit !== expected) {
    throw new Error(`${dir} is at ${manifest.commit}, SOURCE_PIN says ${expected}; run fetch`);
  }
  const file = files.find((f) => f.name === name);
  if (!file) throw new Error(`${name} is not vendored in ${dir}; run fetch`);
  return { manifest, files, content: file.content };
};

export function readGeneratorInputs(root: string, pin: SourcePin): GenerateOptions {
  const vendor = (name: string) => join(root, 'packages/m3e-codegen/vendor', name);
  const commit = requirePin(pin, 'androidx_commit');
  const tokens = readVendor(vendor('androidx-material3-tokens'));
  if (tokens.manifest.commit !== commit) {
    throw new Error(
      `vendor is at ${tokens.manifest.commit} but SOURCE_PIN says ${commit}; run fetch`,
    );
  }
  const materialWebVersion = requirePin(pin, 'material_web');
  const iconManifest = JSON.parse(
    readFileSync(join(vendor('material-symbols'), 'manifest.json'), 'utf8'),
  ) as { axes: Record<string, { default: number; max: number }>; version: string };
  return {
    files: tokens.files,
    commit,
    upstreamPath: tokens.manifest.path,
    colorSchemeKt: vendorFile(vendor('androidx-material3-sources'), 'ColorScheme.kt', commit)
      .content,
    material3Sources: Object.fromEntries(
      [
        ...vendorFile(vendor('androidx-material3-sources'), 'ColorScheme.kt', commit).files,
        ...vendorFile(
          vendor('androidx-material3-android-sources'),
          'AndroidMenu.android.kt',
          commit,
        ).files,
        ...vendorFile(vendor('androidx-material3-samples'), 'SplitButtonSamples.kt', commit).files,
        ...vendorFile(vendor('androidx-animation-core-specs'), 'AnimateAsState.kt', commit).files,
      ].map((f) => [f.name, f.content]),
    ),
    easingKt: vendorFile(vendor('androidx-animation-easing'), 'Easing.kt', commit).content,
    graphicsLayerScopeKt: vendorFile(vendor('androidx-ui-sources'), 'GraphicsLayerScope.kt', commit)
      .content,
    elevationScss: vendorFile(vendor('material-web'), '_elevation.scss', materialWebVersion)
      .content,
    materialWebVersion,
    iconAxes: Object.fromEntries(
      Object.entries(iconManifest.axes).map(([tag, axis]) => [tag, axis.default]),
    ),
    iconFillMax: iconManifest.axes['FILL']?.max ?? Number.NaN,
    iconVersion: iconManifest.version,
  };
}
