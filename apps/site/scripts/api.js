// Generates src/generated/api.json, the API tables of the component pages (DECISIONS D27: from
// source, never by hand):
// - react: every runtime export of m3e-react, from its published .d.ts (TypeScript checker):
//   description, @deprecated, and the props declared by m3e-react (inherited DOM / React Aria
//   props are summarized, not listed);
// - elements: every registered <m3e-*> tag, from the m3e-elements sources (TypeScript AST):
//   entry, class description, attributes from `static properties`, events from the
//   `M3e<Name>EventMap` interface;
// - css: every m3e-css file: the DOM contract and Sources from its header comment, the
//   --m3e-comp-* properties it reads with their defaults from the m3e-tokens component files;
// - spec: every COMPONENT_SPEC section: title and its labelled bullets.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = dirname(dirname(SITE));
const PKG = (name, ...rest) => join(REPO, 'packages', name, ...rest);
const OUT = join(SITE, 'src/generated/api.json');

/** JSDoc text and tags of a node. */
function jsdoc(node) {
  const docs = ts.getJSDocCommentsAndTags(node).filter((d) => ts.isJSDoc(d));
  const text = docs
    .map((d) => (typeof d.comment === 'string' ? d.comment : ts.getTextOfJSDocComment(d.comment)))
    .filter(Boolean)
    .join('\n\n');
  const tags = {};
  for (const tag of ts.getJSDocTags(node)) {
    const comment = ts.getTextOfJSDocComment(tag.comment) ?? '';
    tags[tag.tagName.text] = comment || true;
  }
  return { text: text ?? '', tags };
}

// --- React ----------------------------------------------------------------------------------

function reactApi() {
  const file = PKG('m3e-react', 'dist', 'index.d.ts');
  const program = ts.createProgram([file], {
    strict: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  const out = {};
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const decl = symbol.valueDeclaration;
    if (!decl) continue; // types only
    const name = exported.getName();
    const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
    const doc = jsdoc(ts.isVariableDeclaration(decl) ? decl.parent.parent : decl);
    const signatures = type.getCallSignatures();
    const isComponent = /^[A-Z]/.test(name) && signatures.length > 0;
    const entry = {
      kind: isComponent ? 'component' : /^use[A-Z]/.test(name) ? 'hook' : 'function',
      description: doc.text,
      deprecated: doc.tags.deprecated ?? null,
      props: [],
      inherits: [],
    };
    if (isComponent) {
      const propsType = checker.getTypeOfSymbol(signatures[0].getParameters()[0]);
      const inherited = new Set();
      for (const prop of checker.getPropertiesOfType(propsType)) {
        const pdecl = prop.declarations?.[0];
        if (!pdecl) continue;
        const from = pdecl.getSourceFile().fileName;
        if (prop.getName() === 'ref' || prop.getName() === 'key') continue;
        if (!from.includes('m3e-react')) {
          if (from.includes('@types/react')) inherited.add('HTML attributes');
          else if (from.includes('react-aria') || from.includes('@react-types')) {
            inherited.add('React Aria props');
          }
          continue;
        }
        const pdoc = jsdoc(pdecl);
        const declared = ts.isPropertySignature(pdecl) && pdecl.type ? pdecl.type.getText() : null;
        const description = pdoc.text;
        const def = /Default(?:s to)?:? `([^`]+)`/.exec(description);
        // A named union of literals (`ButtonVariant`) is shown with its values.
        const propType = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, pdecl));
        const values =
          declared && /^[A-Z]\w*(\s*\|\s*undefined)?$/.test(declared) && propType.isUnion()
            ? propType.types.every((t) => t.isLiteral())
              ? propType.types.map((t) => checker.typeToString(t)).join(' | ')
              : null
            : null;
        entry.props.push({
          name: prop.getName(),
          type:
            declared ??
            checker.typeToString(
              checker.getTypeOfSymbolAtLocation(prop, pdecl),
              undefined,
              ts.TypeFormatFlags.NoTruncation,
            ),
          values,
          optional: Boolean(prop.flags & ts.SymbolFlags.Optional),
          description,
          default: def ? def[1] : null,
          deprecated: pdoc.tags.deprecated ?? null,
        });
      }
      entry.inherits = [...inherited].sort();
    }
    out[name] = entry;
  }
  return out;
}

// --- Elements -------------------------------------------------------------------------------

const elementsSrc = PKG('m3e-elements', 'src');
const parsed = new Map();
function parse(path) {
  let sf = parsed.get(path);
  if (!sf) {
    sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    parsed.set(path, sf);
  }
  return sf;
}

/** Every class declared in m3e-elements/src (non-test files): name → { node, file }. */
function elementClasses() {
  const classes = new Map();
  const interfaces = new Map();
  for (const e of readdirSync(elementsSrc, { withFileTypes: true, recursive: true })) {
    if (!e.isFile() || !e.name.endsWith('.ts') || e.name.includes('.test.')) continue;
    const sf = parse(join(e.parentPath, e.name));
    for (const st of sf.statements) {
      if (ts.isClassDeclaration(st) && st.name) classes.set(st.name.text, st);
      if (ts.isInterfaceDeclaration(st)) {
        const list = interfaces.get(st.name.text) ?? [];
        list.push(st);
        interfaces.set(st.name.text, list);
      }
    }
  }
  return { classes, interfaces };
}

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function staticProperties(cls, classes) {
  const member = cls.members.find(
    (m) =>
      ts.isPropertyDeclaration(m) &&
      m.name.getText() === 'properties' &&
      m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
  );
  if (!member?.initializer) {
    // No own declaration: the properties are the base class's.
    const base = cls.heritageClauses
      ?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)
      ?.types[0]?.expression.getText();
    const bcls = base ? classes.get(base) : undefined;
    return bcls ? staticProperties(bcls, classes) : [];
  }
  // `/* @__PURE__ */ (() => ({ ...Parent.properties, a: {}, b: { type: Boolean } }))()` or a literal.
  let obj = null;
  const find = (node) => {
    if (obj) return;
    if (ts.isObjectLiteralExpression(node)) obj = node;
    else ts.forEachChild(node, find);
  };
  find(member.initializer);
  if (!obj) return [];
  const props = [];
  for (const p of obj.properties) {
    if (ts.isSpreadAssignment(p)) {
      const parent = p.expression.getText().replace(/\.properties$/, '');
      const pcls = classes.get(parent);
      if (pcls) props.push(...staticProperties(pcls, classes));
      continue;
    }
    if (!ts.isPropertyAssignment(p)) continue;
    const name = p.name.getText();
    const opts = {};
    if (ts.isObjectLiteralExpression(p.initializer)) {
      for (const o of p.initializer.properties) {
        if (ts.isPropertyAssignment(o)) opts[o.name.getText()] = o.initializer.getText();
      }
    }
    const declared = cls.members.find((m) => m.name?.getText() === name);
    const doc = declared ? jsdoc(declared) : { text: '', tags: {} };
    props.push({
      property: name,
      attribute:
        opts.attribute === 'false'
          ? null
          : opts.attribute
            ? opts.attribute.replace(/['"]/g, '')
            : kebab(name),
      type: opts.type ?? 'String',
      reflect: opts.reflect === 'true',
      declaredType:
        declared && ts.isPropertyDeclaration(declared) && declared.type
          ? declared.type.getText()
          : null,
      description: doc.text,
      deprecated: doc.tags.deprecated ?? null,
    });
  }
  // A subclass may redeclare a property; keep the last.
  return [...new Map(props.map((p) => [p.property, p])).values()];
}

function eventsOf(className, interfaces, classes) {
  const list = interfaces.get(`${className}EventMap`);
  if (!list) {
    const base = classes
      .get(className)
      ?.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)
      ?.types[0]?.expression.getText();
    return base && base !== 'M3eElement' ? eventsOf(base, interfaces, classes) : [];
  }
  const events = [];
  for (const iface of list) {
    for (const m of iface.members) {
      if (!ts.isPropertySignature(m)) continue;
      const doc = jsdoc(m);
      const type = m.type?.getText() ?? '';
      events.push({
        name: m.name.getText().replace(/['"]/g, ''),
        detail: /^CustomEvent<(.*)>$/s.exec(type)?.[1] ?? type,
        description: doc.text,
        deprecated: doc.tags.deprecated ?? null,
      });
    }
  }
  return events;
}

function elementsApi() {
  const { classes, interfaces } = elementClasses();
  const out = {};
  for (const e of readdirSync(elementsSrc, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const index = join(elementsSrc, e.name, 'index.ts');
    let sf;
    try {
      sf = parse(index);
    } catch {
      continue;
    }
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'define' &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const tag = node.arguments[0].text;
        const className = node.expression.expression.getText();
        const cls = classes.get(className);
        if (cls) {
          const doc = jsdoc(cls);
          out[tag] = {
            entry: e.name,
            class: className,
            description: doc.text,
            deprecated: doc.tags.deprecated ?? null,
            attributes: staticProperties(cls, classes).filter((p) => p.attribute !== null),
            events: eventsOf(className, interfaces, classes),
          };
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

// --- CSS ------------------------------------------------------------------------------------

/** --m3e-comp-* defaults from every m3e-tokens component file. */
function tokenDefaults() {
  const dir = PKG('m3e-tokens', 'src', 'generated', 'components');
  const map = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.css')) continue;
    const css = readFileSync(join(dir, f), 'utf8');
    for (const m of css.matchAll(/(--m3e-comp-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      if (!map.has(m[1])) map.set(m[1], { value: m[2].trim(), file: f });
    }
  }
  return map;
}

function cssApi() {
  const dir = PKG('m3e-css', 'src');
  const defaults = tokenDefaults();
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.css') || f === 'index.css') continue;
    const css = readFileSync(join(dir, f), 'utf8');
    const header = /^\/\*([\s\S]*?)\*\//.exec(css)?.[1] ?? '';
    const lines = header.split('\n').map((l) => l.replace(/^\s*\* ?/, ''));
    const text = lines.join('\n').trim();
    const sourcesAt = text.search(/^Sources\b/m);
    const reads = [...new Set([...css.matchAll(/var\((--m3e-comp-[a-z0-9-]+)/g)].map((m) => m[1]))];
    const declares = [
      ...new Set([...css.matchAll(/^\s*(--m3e-comp-[a-z0-9-]+)\s*:/gm)].map((m) => m[1])),
    ];
    const classes = [
      ...new Set(
        [
          ...css.matchAll(/\.(m3e-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?)/g),
        ].map((m) => m[1]),
      ),
    ].sort();
    out[f.replace(/\.css$/, '')] = {
      overview: (sourcesAt >= 0 ? text.slice(0, sourcesAt) : text).trim(),
      sources: sourcesAt >= 0 ? text.slice(sourcesAt).trim() : '',
      classes,
      customProperties: reads
        .filter((name) => !declares.includes(name) || defaults.has(name))
        .map((name) => ({
          name,
          default: defaults.get(name)?.value ?? null,
          tokens: defaults.get(name)?.file ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  return out;
}

// --- COMPONENT_SPEC --------------------------------------------------------------------------

function specApi() {
  const text = readFileSync(join(REPO, 'COMPONENT_SPEC.md'), 'utf8');
  const out = {};
  const sections = text.split(/^## /m).slice(1);
  for (const section of sections) {
    const [heading, ...body] = section.split('\n');
    const m = /^(\d+[a-z]?)\. (.*)$/.exec(heading.trim());
    if (!m) continue;
    const fields = {};
    let current = null;
    for (const line of body) {
      const field = /^- \*\*([^*]+?):?\*\*:?\s*(.*)$/.exec(line);
      if (field) {
        current = field[1].replace(/:$/, '').trim();
        fields[current] = field[2];
      } else if (current && /^\s+\S/.test(line)) {
        fields[current] += `\n${line}`;
      } else if (current && line.trim() === '') {
        fields[current] += '\n';
      } else if (/^\S/.test(line)) {
        current = null;
      }
    }
    for (const k of Object.keys(fields)) fields[k] = fields[k].trim();
    out[m[1]] = { title: m[2].trim(), fields };
  }
  return out;
}

/**
 * Loaders for the HTML example pages, imported on demand: every m3e-elements entry (the ones
 * that register tags, and helpers such as top-app-bar's attachTopAppBarScroll), and the entry
 * that registers each tag.
 */
function writeEntries(elements) {
  const entries = readdirSync(PKG('m3e-elements', 'src'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(PKG('m3e-elements', 'src', e.name, 'index.ts')))
    .map((e) => e.name)
    .sort();
  writeFileSync(
    join(dirname(OUT), 'element-entries.ts'),
    [
      '// Generated by scripts/api.js: every m3e-elements entry, and the one that registers each tag.',
      'export const ELEMENT_ENTRIES: Record<string, () => Promise<unknown>> = {',
      ...entries.map((e) => `  '${e}': () => import('@kyralabs/m3e-elements/${e}.js'),`),
      '};',
      'export const TAG_ENTRY: Record<string, string> = {',
      ...Object.entries(elements)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, e]) => `  '${tag}': '${e.entry}',`),
      '};',
      '',
    ].join('\n'),
  );
}

// `astro check` needs only the generated modules' types. CI's lint job type-checks without
// building m3e-react, whose .d.ts this script reads, so `--stub-if-missing` writes empty
// modules when there are none yet. The build always generates the real ones.
if (process.argv.includes('--stub-if-missing')) {
  if (!existsSync(OUT)) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ react: {}, elements: {}, css: {}, spec: {} }));
    writeEntries({});
    console.log('src/generated/api.json: empty stub for type checking');
  }
  process.exit(0);
}

const api = {
  react: reactApi(),
  elements: elementsApi(),
  css: cssApi(),
  spec: specApi(),
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(api, null, 1));
writeEntries(api.elements);
console.log(
  `src/generated/api.json: ${String(Object.keys(api.react).length)} React exports, ` +
    `${String(Object.keys(api.elements).length)} elements, ${String(Object.keys(api.css).length)} CSS files, ` +
    `${String(Object.keys(api.spec).length)} spec sections`,
);
