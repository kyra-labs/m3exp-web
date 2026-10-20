// Codemod: makes m3e-elements' `static properties` declarations pure, so bundlers can drop
// element classes a page imports but never uses (and never registers).
//
//   static override properties = { ...M3eElement.properties, open: { type: Boolean } };
//
// reads a member of another class while the class is defined. Bundlers (rolldown, esbuild) must
// assume that read has side effects (`properties` could be a getter), so they keep the class,
// its parent and everything its methods reference. The same object built inside a
// `/* @__PURE__ */` arrow function that is called at once is created at the same moment, with
// the same value and the same inferred type, and bundlers may drop it when the class is unused:
//
//   static override properties = /* @__PURE__ */ (() => ({
//     ...M3eElement.properties,
//     open: { type: Boolean },
//   }))();
//
// Re-runnable and idempotent: `node tools/pure-statics.js` rewrites every declaration that still
// spreads a member into `static properties` (then formats the files it changed with Prettier);
// `node tools/pure-statics.js --check` lists them and exits 1 without writing. Paths given as
// arguments limit it to those files or directories (default: packages/m3e-elements/src).
// ESLint enforces the same rule (eslint.config.js), and pure-statics.test.js checks that the
// classes really tree-shake.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DEFAULT_DIR = join(ROOT, 'packages/m3e-elements/src');
const PURE = '/* @__PURE__ */ ';

const isStatic = (node) =>
  ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;

/**
 * Static `properties` initializers in `source` that bundlers cannot drop: object literals with a
 * spread (`...Parent.properties`). Returns `{ start, end, line }` of each initializer.
 */
export function findImpureStatics(source, fileName = 'file.ts') {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const found = [];
  const visit = (node) => {
    if (
      ts.isPropertyDeclaration(node) &&
      isStatic(node) &&
      node.name.getText(file) === 'properties' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer) &&
      node.initializer.properties.some((p) => ts.isSpreadAssignment(p))
    ) {
      const start = node.initializer.getStart(file);
      found.push({
        start,
        end: node.initializer.getEnd(),
        line: file.getLineAndCharacterOfPosition(start).line + 1,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** `source` with every impure static `properties` initializer wrapped in a pure IIFE. */
export function makeStaticsPure(source, fileName) {
  let out = source;
  // Back to front, so earlier offsets stay valid.
  for (const { start, end } of findImpureStatics(source, fileName).reverse()) {
    out = `${out.slice(0, start)}${PURE}(() => (${out.slice(start, end)}))()${out.slice(end)}`;
  }
  return out;
}

function* tsFiles(path) {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path).sort()) {
      if (name !== 'node_modules') yield* tsFiles(join(path, name));
    }
  } else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.endsWith('.d.ts')) {
    yield path;
  }
}

/** Files under `paths` (default: m3e-elements' sources) with impure static `properties`. */
export function scan(paths = [DEFAULT_DIR]) {
  const result = [];
  for (const path of paths) {
    for (const file of tsFiles(resolve(path))) {
      const source = readFileSync(file, 'utf8');
      const found = findImpureStatics(source, file);
      if (found.length) result.push({ file, source, found });
    }
  }
  return result;
}

async function main(args) {
  const check = args.includes('--check');
  const paths = args.filter((a) => a !== '--check');
  const files = scan(paths.length ? paths : undefined);
  const list = files.flatMap(({ file, found }) =>
    found.map(({ line }) => `${relative(ROOT, file)}:${line}`),
  );
  if (check) {
    if (!list.length) return 0;
    console.error(
      `Impure \`static properties\` (run \`node tools/pure-statics.js\`):\n  ${list.join('\n  ')}`,
    );
    return 1;
  }
  const prettier = await import('prettier');
  for (const { file, source } of files) {
    const options = (await prettier.resolveConfig(file)) ?? {};
    const formatted = await prettier.format(makeStaticsPure(source, file), {
      ...options,
      filepath: file,
    });
    writeFileSync(file, formatted);
  }
  console.log(`pure-statics: rewrote ${list.length} declaration(s) in ${files.length} file(s)`);
  for (const entry of list) console.log(`  ${entry}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
