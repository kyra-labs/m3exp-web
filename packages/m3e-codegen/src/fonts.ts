// Google Sans Flex (D1): pinned from google/fonts, split into per-script woff2 chunks using the
// unicode ranges Google Fonts itself serves, plus a metric-matched local fallback face.
//
//   fetchFontSources()  pin time (network): METADATA.pb, OFL.txt, TRADEMARKS.md and the Google
//                       Fonts CSS2 response into vendor/; TTF sha256 into the manifest.
//   buildFonts()        deterministic: TTF (sha-verified) → packages/m3e-tokens/fonts/*.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as fontkit from 'fontkit';
import subsetFont from 'subset-font';

export const FAMILY = 'Google Sans Flex';
export const FALLBACK_FAMILY = 'Google Sans Flex Fallback';
const SLUG = 'google-sans-flex';
const GOOGLE_FONTS_REPO = 'google/fonts';
const FONT_DIR = 'ofl/googlesansflex';
export const TTF_NAME = 'GoogleSansFlex[ROND,opsz,slnt,wdth,wght].ttf';
const TEXT_FILES = ['METADATA.pb', 'OFL.txt', 'TRADEMARKS.md'] as const;
/**
 * Google Fonts CSS2 request for every axis. Only the per-script unicode ranges and the
 * style/weight/stretch/display descriptors are used. The API rejects opsz below 6 (HTTP 400)
 * although METADATA.pb lists 1–144; our chunks keep the TTF's full axis ranges regardless.
 */
const CSS2_URL =
  'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,slnt,wdth,wght,ROND@6..144,-10..0,25..151,1..1000,0..100&display=swap';
/** A woff2-capable UA, so the CSS2 API returns woff2 faces with unicode-range splits. */
const CSS2_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/**
 * Output profiles (D11, D15): the default keeps the axes the typescale uses (wght; opsz via
 * `font-optical-sizing: auto`) and instances the rest at their defaults (~139 KiB latin vs
 * ~1 MiB); the opt-in ROND profile is a drop-in replacement for the default that also keeps
 * roundness (~205 KiB latin), set only via `font-variation-settings: "ROND" n`; the full profile
 * keeps every axis.
 */
export const PROFILES = [
  {
    css: 'fonts.css',
    prefix: SLUG,
    pin: ['wdth', 'ROND', 'slnt'],
    description:
      'Default profile: wght + opsz variable; wdth, ROND and slnt fixed at their defaults.',
  },
  {
    css: 'fonts-rond.css',
    prefix: `${SLUG}-rond`,
    pin: ['wdth', 'slnt'],
    description:
      'ROND profile (D15): wght + opsz + ROND variable; wdth and slnt fixed at their defaults.',
  },
  {
    css: 'fonts-full.css',
    prefix: `${SLUG}-full`,
    pin: [] as string[],
    description: 'Full profile: every axis (ROND, opsz, slnt, wdth, wght).',
  },
] as const;

/** Uniform sample for average advance width: printable ASCII (U+0020–U+007E). */
const SAMPLE: readonly number[] = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i);

export interface FallbackMetrics {
  family: string;
  /** `local()` names, in order. */
  local: string[];
  measuredFrom: string;
  unitsPerEm: number;
  /** Average advance over SAMPLE, font units. */
  avgAdvance: number;
}

export interface FontSourceManifest {
  repo: string;
  commit: string;
  path: string;
  version: string;
  files: Record<string, string>;
  ttf: { name: string; sha256: string };
  css2: { url: string; userAgent: string; fetched: string; sha256: string };
  fallback: FallbackMetrics;
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

const rawUrl = (commit: string, name: string) =>
  `https://raw.githubusercontent.com/${GOOGLE_FONTS_REPO}/${commit}/${FONT_DIR}/${encodeURIComponent(name)}`;

/** Font version from the name table, e.g. "5.000". */
function fontVersion(font: fontkit.Font): string {
  const raw = font.version as unknown;
  const text = typeof raw === 'string' ? raw : String(raw);
  return /(\d+\.\d+)/.exec(text)?.[1] ?? text;
}

/** Average advance (font units) over SAMPLE. */
export function averageAdvance(font: fontkit.Font): number {
  const advances = SAMPLE.map((cp) => font.glyphForCodePoint(cp).advanceWidth);
  return advances.reduce((a, b) => a + b, 0) / advances.length;
}

export function measureFallback(path: string, family: string, local: string[]): FallbackMetrics {
  const font = fontkit.openSync(path) as fontkit.Font;
  return {
    family,
    local,
    measuredFrom: `${font.fullName} ${String(font.version)} (sha256 ${sha256(readFileSync(path)).slice(0, 16)})`,
    unitsPerEm: font.unitsPerEm,
    avgAdvance: Number(averageAdvance(font).toFixed(4)),
  };
}

export async function fetchFontSources(
  commit: string,
  vendorDir: string,
  cacheDir: string,
  fallback: FallbackMetrics,
): Promise<FontSourceManifest> {
  rmSync(vendorDir, { recursive: true, force: true });
  mkdirSync(vendorDir, { recursive: true });
  const files: Record<string, string> = {};
  for (const name of TEXT_FILES) {
    const text = new TextDecoder().decode(await get(rawUrl(commit, name)));
    writeFileSync(join(vendorDir, name), text);
    files[name] = sha256(text);
  }
  const css2 = new TextDecoder().decode(
    await get(CSS2_URL, { headers: { 'user-agent': CSS2_USER_AGENT } }),
  );
  writeFileSync(join(vendorDir, 'css2.css'), css2);
  const ttf = await get(rawUrl(commit, TTF_NAME));
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, TTF_NAME), ttf);
  const font = fontkit.create(Buffer.from(ttf)) as fontkit.Font;
  const manifest: FontSourceManifest = {
    repo: `https://github.com/${GOOGLE_FONTS_REPO}`,
    commit,
    path: FONT_DIR,
    version: fontVersion(font),
    files,
    ttf: { name: TTF_NAME, sha256: sha256(ttf) },
    css2: {
      url: CSS2_URL,
      userAgent: CSS2_USER_AGENT,
      fetched: new Date().toISOString().slice(0, 10),
      sha256: sha256(css2),
    },
    fallback,
  };
  writeFileSync(join(vendorDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export interface Css2Face {
  subset: string;
  descriptors: Record<string, string>;
  unicodeRange: string;
}

/** Parses the CSS2 response: one `/* subset *\/ @font-face {…}` per chunk. */
export function parseCss2(css: string): Css2Face[] {
  const faces = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]*)\}/g)].map(
    ([, subset, body]) => {
      const descriptors: Record<string, string> = {};
      for (const decl of body!.split(';')) {
        const at = decl.indexOf(':');
        if (at > 0) descriptors[decl.slice(0, at).trim()] = decl.slice(at + 1).trim();
      }
      const unicodeRange = descriptors['unicode-range'];
      if (!unicodeRange) throw new Error(`css2: ${subset!} has no unicode-range`);
      return { subset: subset!, descriptors, unicodeRange };
    },
  );
  if (faces.length === 0) throw new Error('css2: no @font-face blocks found');
  return faces;
}

/** Expands `U+0000-00FF, U+0131, U+0??` into code points. */
export function expandUnicodeRange(range: string): number[] {
  const points: number[] = [];
  for (const part of range.split(',').map((p) => p.trim().replace(/^U\+/i, ''))) {
    const [from, to = from] = part.includes('?')
      ? [part.replace(/\?/g, '0'), part.replace(/\?/g, 'F')]
      : (part.split('-') as [string, string?]);
    for (let cp = parseInt(from, 16); cp <= parseInt(to, 16); cp++) points.push(cp);
  }
  return points;
}

export interface FontOutput {
  /** Relative to packages/m3e-tokens/fonts. */
  files: Map<string, Uint8Array | string>;
}

const pct = (n: number) => `${String(Number((n * 100).toFixed(4)))}%`;

export async function buildFonts(vendorDir: string, cacheDir: string): Promise<FontOutput> {
  const manifest = JSON.parse(
    readFileSync(join(vendorDir, 'manifest.json'), 'utf8'),
  ) as FontSourceManifest;
  const ttfPath = join(cacheDir, TTF_NAME);
  if (!existsSync(ttfPath)) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(ttfPath, await get(rawUrl(manifest.commit, TTF_NAME)));
  }
  const ttf = readFileSync(ttfPath);
  if (sha256(ttf) !== manifest.ttf.sha256)
    throw new Error(`${TTF_NAME}: sha256 mismatch with manifest`);
  const css2 = readFileSync(join(vendorDir, 'css2.css'), 'utf8').replace(/\r\n/g, '\n');
  if (sha256(css2) !== manifest.css2.sha256)
    throw new Error('css2.css: sha256 mismatch with manifest');

  const font = fontkit.create(ttf) as fontkit.Font;
  const cmap = new Set(font.characterSet);
  const axes = font.variationAxes;
  const files = new Map<string, Uint8Array | string>();

  // Metric-matched fallback (size-adjust + ascent/descent/line-gap overrides), so layout does not
  // shift when the web font swaps in. Overrides are divided by size-adjust because size-adjust
  // also scales the overridden metrics (CSS Fonts 5 §size-adjust).
  const { fallback } = manifest;
  const sizeAdjust =
    averageAdvance(font) / font.unitsPerEm / (fallback.avgAdvance / fallback.unitsPerEm);
  const metric = (units: number) => pct(Math.abs(units) / font.unitsPerEm / sizeAdjust);
  const fallbackFace = [
    `/* Metric-matched fallback: ${fallback.family}, measured from ${fallback.measuredFrom} */`,
    '@font-face {',
    `  font-family: "${FALLBACK_FAMILY}";`,
    `  src: ${fallback.local.map((n) => `local("${n}")`).join(', ')};`,
    `  size-adjust: ${pct(sizeAdjust)};`,
    `  ascent-override: ${metric(font.ascent)};`,
    `  descent-override: ${metric(font.descent)};`,
    `  line-gap-override: ${metric(font.lineGap)};`,
    '}',
  ];

  const chunks: Record<
    string,
    Record<string, { file: string; codepoints: number; bytes: number; sha256: string }>
  > = {};
  for (const profile of PROFILES) {
    // Pinned axes are instanced at the font's own defaults (fvar), so default rendering is unchanged.
    const pinned = Object.fromEntries(
      profile.pin.map((tag) => {
        const axis = axes[tag];
        if (!axis) throw new Error(`${FAMILY} has no ${tag} axis`);
        return [tag, axis.default];
      }),
    );
    const descriptorOverrides: Record<string, string> = {};
    if ('slnt' in pinned)
      descriptorOverrides['font-style'] =
        pinned['slnt'] === 0 ? 'normal' : `oblique ${String(-(pinned['slnt'] ?? 0))}deg`;
    if ('wdth' in pinned) descriptorOverrides['font-stretch'] = `${String(pinned['wdth'])}%`;
    const faces: string[] = [];
    const profileChunks: (typeof chunks)[string] = {};
    for (const face of parseCss2(css2)) {
      const codepoints = expandUnicodeRange(face.unicodeRange).filter((cp) => cmap.has(cp));
      if (codepoints.length === 0) continue;
      const woff2 = await subsetFont(ttf, String.fromCodePoint(...codepoints), {
        targetFormat: 'woff2',
        ...(profile.pin.length > 0 ? { variationAxes: pinned } : {}),
      });
      const file = `${profile.prefix}-${face.subset}.woff2`;
      files.set(file, woff2);
      profileChunks[face.subset] = {
        file,
        codepoints: codepoints.length,
        bytes: woff2.length,
        sha256: sha256(woff2),
      };
      const descriptors = { ...face.descriptors, ...descriptorOverrides };
      faces.push(
        `/* ${face.subset} */`,
        '@font-face {',
        `  font-family: "${FAMILY}";`,
        ...['font-style', 'font-weight', 'font-stretch', 'font-display']
          .filter((d) => descriptors[d])
          .map((d) => `  ${d}: ${descriptors[d]!};`),
        `  src: url("./${file}") format("woff2");`,
        `  unicode-range: ${face.unicodeRange};`,
        '}',
      );
    }
    chunks[profile.css] = profileChunks;
    const banner = [
      '/*',
      ` * Generated by @kyralabs/m3e-codegen — do not edit.`,
      ` * ${FAMILY} ${manifest.version} from ${manifest.repo}/tree/${manifest.commit}/${manifest.path}`,
      ` * ${profile.description}`,
      ' * SIL Open Font License 1.1: see LICENSE-google-sans-flex.txt. "Google", "Google Sans" and',
      ' * "Google Sans Flex" are trademarks of Google LLC (TRADEMARKS-google-sans-flex.md);',
      ' * m3exp-web is not affiliated with or endorsed by Google.',
      ' */',
    ];
    files.set(profile.css, `${[...banner, ...faces, ...fallbackFace].join('\n')}\n`);
  }
  files.set(
    'LICENSE-google-sans-flex.txt',
    readFileSync(join(vendorDir, 'OFL.txt'), 'utf8').replace(/\r\n/g, '\n'),
  );
  files.set(
    'TRADEMARKS-google-sans-flex.md',
    readFileSync(join(vendorDir, 'TRADEMARKS.md'), 'utf8').replace(/\r\n/g, '\n'),
  );
  files.set(
    'google-sans-flex.manifest.json',
    `${JSON.stringify(
      {
        family: FAMILY,
        version: manifest.version,
        source: `${manifest.repo}@${manifest.commit}/${manifest.path}/${TTF_NAME}`,
        sourceSha256: manifest.ttf.sha256,
        axes: font.variationAxes,
        metrics: {
          unitsPerEm: font.unitsPerEm,
          ascent: font.ascent,
          descent: font.descent,
          lineGap: font.lineGap,
          avgAdvance: Number(averageAdvance(font).toFixed(4)),
        },
        fallback: { ...fallback, sizeAdjust: Number(sizeAdjust.toFixed(6)) },
        chunks,
      },
      null,
      2,
    )}\n`,
  );
  return { files };
}
