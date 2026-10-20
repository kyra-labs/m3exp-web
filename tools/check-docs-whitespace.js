// Fails if the built docs (apps/docs/dist) glue a word to an inline element (run after the docs
// build). Astro's default compressHTML deletes a whitespace run that contains a line break when it
// touches a tag, so prose wrapped before a `<code>` (or after a `</code>`) renders as "and<code>x".
// Fix such a spot at the source with `{' '}` at the end of the line; `compressHTML: false` would
// also change the whitespace between template-generated inline siblings (progress, top app bar).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const INLINE = new Set([
  'A',
  'ABBR',
  'B',
  'CITE',
  'CODE',
  'DFN',
  'EM',
  'I',
  'KBD',
  'MARK',
  'OUTPUT',
  'Q',
  'S',
  'SAMP',
  'SMALL',
  'STRONG',
  'TIME',
  'U',
  'VAR',
]);
// Prose containers: only text inside one of these is checked.
const FLOW = new Set([
  'BLOCKQUOTE',
  'CAPTION',
  'DD',
  'DT',
  'FIGCAPTION',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LEGEND',
  'LI',
  'P',
  'SUMMARY',
  'TD',
  'TH',
]);
const SKIP = new Set(['PRE', 'SCRIPT', 'STYLE', 'SVG', 'TEMPLATE', 'TEXTAREA']);
// A character that takes a space after it when an inline element follows.
const SPACE_AFTER = /[\p{L}\p{N},;:!?%)\]”’/.]/u;
// A character that takes a space before it when it follows an inline element.
const SPACE_BEFORE = /[\p{L}\p{N}([“‘]/u;

const isIcon = (n) => n.classList?.contains('m3e-icon') === true;
const isInline = (n) => n?.nodeType === 1 && INLINE.has(n.tagName) && !isIcon(n);
const textOf = (n) => (n.nodeType === 3 ? n.data : (n.textContent ?? ''));

function inProse(node) {
  for (let n = node.parentNode; n?.nodeType === 1; n = n.parentNode) {
    if (SKIP.has(n.tagName) || isIcon(n)) return false;
    if (FLOW.has(n.tagName)) return true;
  }
  return false;
}

/**
 * Deliberate glue written that way in the source:
 * - a plural after an inline element (`<code>&lt;TabPanel&gt;</code>s`),
 * - a slash joining two inline elements (`<code>Medium</code>/<code>Large…</code>`).
 */
function allowed(node, next) {
  if (isInline(node) && next.nodeType === 3 && /^s(?![\p{L}\p{N}])/u.test(next.data)) return true;
  if (node.nodeType === 3 && node.data === '/' && isInline(node.previousSibling) && isInline(next))
    return true;
  return false;
}

const show = (n, fromEnd) => {
  const s = textOf(n).replace(/\s+/g, ' ');
  const t = fromEnd ? s.slice(-30) : s.slice(0, 30);
  return n.nodeType === 3 ? t : `<${n.tagName.toLowerCase()}>${t}</${n.tagName.toLowerCase()}>`;
};

/** Every glued text/inline-element boundary in one HTML document, as "before⟂after" strings. */
export function gluedBoundaries(html) {
  const win = new Window();
  try {
    const doc = win.document;
    doc.write(html);
    const found = [];
    const walker = doc.createTreeWalker(doc.body, 1 | 4); // elements and text
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const next = n.nextSibling;
      if (!next || !inProse(n)) continue;
      const a = textOf(n);
      const b = textOf(next);
      if (!a || !b || /\s/.test(a.at(-1)) || /\s/.test(b[0])) continue;
      const glued =
        (n.nodeType === 3 && isInline(next) && SPACE_AFTER.test(a.at(-1))) ||
        (isInline(n) && next.nodeType === 3 && SPACE_BEFORE.test(b[0])) ||
        (isInline(n) && isInline(next));
      if (glued && !allowed(n, next)) found.push(`${show(n, true)}⟂${show(next, false)}`);
    }
    return found;
  } finally {
    void win.happyDOM.close();
  }
}

const htmlFiles = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => join(e.parentPath, e.name));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? fileURLToPath(new URL('../apps/docs/dist/', import.meta.url));
  if (!existsSync(dist)) {
    console.error(`::error::${dist} does not exist; build the docs first.`);
    process.exit(1);
  }
  let count = 0;
  for (const file of htmlFiles(dist).sort()) {
    for (const glued of gluedBoundaries(readFileSync(file, 'utf8'))) {
      console.error(`::error::${relative(dist, file)}: glued words ${glued}`);
      count++;
    }
  }
  if (count) {
    console.error(`${count} glued words. Add {' '} at the end of the source line (see this file).`);
    process.exit(1);
  }
  console.log('No glued words in the built docs.');
}
