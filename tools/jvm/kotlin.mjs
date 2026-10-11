// Compiles Kotlin sources with a pinned Kotlin compiler and runs a main class, writing its stdout
// to a file. Used for JVM reference harnesses (ROADMAP M3: Compose/graphics-shapes reference dumps).
//
//   node tools/jvm/kotlin.mjs --main <fq.MainKt> --out <file.json> <src.kt | dir>...
//
// Requires a JDK (java + jar) on PATH. The compiler is downloaded once into
// node_modules/.cache/kotlin-<version>, verified against JetBrains' published sha256.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const KOTLIN_VERSION = '2.4.21';
const BASE = `https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}`;
const ZIP = `kotlin-compiler-${KOTLIN_VERSION}.zip`;
const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = join(root, 'node_modules/.cache', `kotlin-${KOTLIN_VERSION}`);

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: ${String(res.status)}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** The running JDK's home (java prints -XshowSettings output on stderr). */
function javaHome() {
  const { stderr } = spawnSync('java', ['-XshowSettings:properties', '-version'], {
    encoding: 'utf8',
  });
  const home = /java\.home = (.+)/.exec(stderr)?.[1];
  if (!home) throw new Error('could not determine java.home from `java -XshowSettings`');
  return home.trim();
}

async function ensureCompiler() {
  const lib = join(cache, 'kotlinc', 'lib');
  if (existsSync(join(lib, 'kotlin-compiler.jar'))) return lib;
  mkdirSync(cache, { recursive: true });
  const [zip, sha] = await Promise.all([
    download(`${BASE}/${ZIP}`),
    download(`${BASE}/${ZIP}.sha256`),
  ]);
  const expected = new TextDecoder().decode(sha).trim().split(/\s+/)[0];
  const actual = createHash('sha256').update(zip).digest('hex');
  if (actual !== expected) throw new Error(`${ZIP}: sha256 ${actual} != published ${expected}`);
  writeFileSync(join(cache, ZIP), zip);
  // `jar` (JDK) extracts zip files identically on every platform; it is not always on PATH.
  execFileSync(join(javaHome(), 'bin', 'jar'), ['xf', ZIP], { cwd: cache, stdio: 'inherit' });
  rmSync(join(cache, ZIP));
  return lib;
}

const expand = (path) =>
  statSync(path).isDirectory()
    ? readdirSync(path)
        .filter((f) => f.endsWith('.kt'))
        .map((f) => join(path, f))
    : [path];

const { values, positionals } = parseArgs({
  options: { main: { type: 'string' }, out: { type: 'string' } },
  allowPositionals: true,
});
if (!values.main || !values.out || positionals.length === 0) {
  console.error('usage: node tools/jvm/kotlin.mjs --main <fq.MainKt> --out <file> <src.kt|dir>...');
  process.exit(2);
}

const lib = await ensureCompiler();
const sources = positionals.flatMap((p) => expand(resolve(p))).sort();
const build = join(cache, 'build', values.main);
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
const jarOut = join(build, 'reference.jar');
// Vendored KMP sources may pair a commonMain `expect` with its jvmMain `actual` (graphics-shapes'
// Format.kt / Format.jvm.kt). K2 rejects both in one module, so declaring files go to a `common`
// fragment that the `jvm` fragment (everything else) refines.
const expectFiles = sources.filter((f) =>
  /^\s*(internal |public |private )?expect /m.test(readFileSync(f, 'utf8')),
);
const fragmentArgs =
  expectFiles.length === 0
    ? []
    : [
        '-Xmulti-platform',
        '-Xfragments=common,jvm',
        '-Xfragment-refines=jvm:common',
        ...sources.map(
          (f) => `-Xfragment-sources=${expectFiles.includes(f) ? 'common' : 'jvm'}:${f}`,
        ),
      ];
const compilerCp = readdirSync(lib)
  .filter((f) => f.endsWith('.jar'))
  .map((f) => join(lib, f))
  .join(delimiter);
console.error(`kotlinc ${KOTLIN_VERSION}: ${sources.length} sources`);
execFileSync(
  'java',
  [
    '-cp',
    compilerCp,
    'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler',
    '-kotlin-home',
    join(cache, 'kotlinc'),
    '-include-runtime',
    '-nowarn',
    ...fragmentArgs,
    '-d',
    jarOut,
    ...sources,
  ],
  { stdio: ['ignore', 'inherit', 'inherit'] },
);
const output = execFileSync('java', ['-cp', jarOut, values.main], {
  maxBuffer: 256 * 1024 * 1024,
});
writeFileSync(resolve(values.out), output);
console.error(`wrote ${values.out} (${String(output.length)} bytes)`);
