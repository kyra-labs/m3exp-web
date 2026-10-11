// Material Symbols (D5): the upstream variable woff2 files ship unmodified (Apache 2.0) in
// packages/m3e-tokens/fonts; this module pins them and writes their @font-face CSS.
//
//   fetchIconSources()  pin time (network): woff2 + .codepoints per style, LICENSE, and the
//                       Google Fonts CSS2 response per style (descriptors).
//   buildIconCss()      deterministic: material-symbols*.css from the vendored descriptors.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as fontkit from 'fontkit';

const REPO = 'google/material-design-icons';
const DIR = 'variablefont';
export const ICON_STYLES = ['rounded', 'outlined', 'sharp'] as const;
export type IconStyle = (typeof ICON_STYLES)[number];
/**
 * Style served by `material-symbols.css`: a project brand choice (D12, REQUIREMENTS §10). No M3
 * source names a default style; Google's own tooling defaults to Outlined.
 */
export const DEFAULT_ICON_STYLE: IconStyle = 'rounded';

const title = (style: IconStyle) => style[0]!.toUpperCase() + style.slice(1);
export const iconFamily = (style: IconStyle) => `Material Symbols ${title(style)}`;
const upstreamName = (style: IconStyle, ext: string) =>
  `MaterialSymbols${title(style)}[FILL,GRAD,opsz,wght].${ext}`;
export const shippedName = (style: IconStyle, ext: string) => `material-symbols-${style}.${ext}`;
const CSS2_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const css2Url = (style: IconStyle) =>
  `https://fonts.googleapis.com/css2?family=Material+Symbols+${title(style)}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`;

export interface IconSourceManifest {
  repo: string;
  commit: string;
  version: string;
  axes: Record<string, { min: number; default: number; max: number }>;
  /** Shipped file → sha256 (byte-exact upstream copies) and upstream path. */
  files: Record<string, { sha256: string; upstream: string; bytes: number }>;
  css2: Record<IconStyle, { url: string; sha256: string }>;
  fetched: string;
}

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

async function get(url: string, init?: RequestInit): Promise<Uint8Array> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return new Uint8Array(await res.arrayBuffer());
    if (attempt >= 5 || (res.status !== 429 && res.status < 500)) {
      throw new Error(`GET ${url}: ${String(res.status)}`);
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
}

const raw = (commit: string, path: string) =>
  `https://raw.githubusercontent.com/${REPO}/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`;

export async function fetchIconSources(
  commit: string,
  vendorDir: string,
  fontsDir: string,
): Promise<IconSourceManifest> {
  rmSync(vendorDir, { recursive: true, force: true });
  mkdirSync(vendorDir, { recursive: true });
  const files: IconSourceManifest['files'] = {};
  const css2 = {} as IconSourceManifest['css2'];
  let version = '';
  let axes: IconSourceManifest['axes'] = {};
  for (const style of ICON_STYLES) {
    for (const ext of ['woff2', 'codepoints']) {
      const upstream = `${DIR}/${upstreamName(style, ext)}`;
      const data = await get(raw(commit, upstream));
      writeFileSync(join(fontsDir, shippedName(style, ext)), data);
      files[shippedName(style, ext)] = { sha256: sha256(data), upstream, bytes: data.length };
      if (ext === 'woff2') {
        const font = fontkit.create(Buffer.from(data)) as fontkit.Font;
        const v = /(\d+\.\d+)/.exec(String(font.version))?.[1] ?? String(font.version);
        if (version && v !== version)
          throw new Error(`Material Symbols styles differ in version: ${version} vs ${v}`);
        version = v;
        axes = Object.fromEntries(
          Object.entries(font.variationAxes).flatMap(([tag, a]) =>
            a ? [[tag, { min: a.min, default: a.default, max: a.max }]] : [],
          ),
        );
      }
    }
    const css = new TextDecoder().decode(
      await get(css2Url(style), { headers: { 'user-agent': CSS2_USER_AGENT } }),
    );
    writeFileSync(join(vendorDir, `css2-${style}.css`), css);
    css2[style] = { url: css2Url(style), sha256: sha256(css) };
  }
  const license = await get(raw(commit, 'LICENSE'));
  writeFileSync(join(fontsDir, 'LICENSE-material-symbols.txt'), license);
  files['LICENSE-material-symbols.txt'] = {
    sha256: sha256(license),
    upstream: 'LICENSE',
    bytes: license.length,
  };
  const manifest: IconSourceManifest = {
    repo: `https://github.com/${REPO}`,
    commit,
    version,
    axes,
    files,
    css2,
    fetched: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(join(vendorDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** `@font-face` descriptors Google Fonts serves for a style (font-style, font-weight, …). */
export function css2Descriptors(css: string): Record<string, string> {
  const body = /@font-face \{([^}]*)\}/.exec(css)?.[1];
  if (!body) throw new Error('css2: no @font-face');
  const out: Record<string, string> = {};
  for (const decl of body.split(';')) {
    const at = decl.indexOf(':');
    const key = decl.slice(0, at).trim();
    if (at > 0 && key !== 'src' && key !== 'font-family') out[key] = decl.slice(at + 1).trim();
  }
  return out;
}

/** Generates material-symbols*.css (and verifies the shipped fonts against the manifest). */
export function buildIconCss(vendorDir: string, fontsDir: string): Map<string, string> {
  const manifest = JSON.parse(
    readFileSync(join(vendorDir, 'manifest.json'), 'utf8'),
  ) as IconSourceManifest;
  for (const [file, { sha256: expected }] of Object.entries(manifest.files)) {
    if (sha256(readFileSync(join(fontsDir, file))) !== expected) {
      throw new Error(`${file}: sha256 mismatch with vendor manifest; run icons:fetch`);
    }
  }
  const out = new Map<string, string>();
  const face = (style: IconStyle) => {
    const css = readFileSync(join(vendorDir, `css2-${style}.css`), 'utf8').replace(/\r\n/g, '\n');
    if (sha256(css) !== manifest.css2[style].sha256)
      throw new Error(`css2-${style}.css: sha256 mismatch`);
    const descriptors = css2Descriptors(css);
    return [
      '@font-face {',
      `  font-family: "${iconFamily(style)}";`,
      ...Object.entries(descriptors).map(([k, v]) => `  ${k}: ${v};`),
      `  src: url("./${shippedName(style, 'woff2')}") format("woff2");`,
      '}',
    ];
  };
  const banner = (what: string) => [
    '/*',
    ' * Generated by @kyralabs/m3e-codegen — do not edit.',
    ` * Material Symbols ${manifest.version} from ${manifest.repo}/tree/${manifest.commit}/variablefont`,
    ' * Apache License 2.0: see LICENSE-material-symbols.txt.',
    ` * ${what}`,
    ' * Production: `m3e-icons subset` writes a font with only the icons you use.',
    ' */',
  ];
  for (const style of ICON_STYLES) {
    out.set(
      `material-symbols-${style}.css`,
      `${[...banner(`${iconFamily(style)} (full font, every icon and axis).`), ...face(style)].join('\n')}\n`,
    );
  }
  out.set(
    'material-symbols.css',
    `${[...banner(`Default style: ${iconFamily(DEFAULT_ICON_STYLE)} (project choice, D12).`), ...face(DEFAULT_ICON_STYLE)].join('\n')}\n`,
  );
  return out;
}
