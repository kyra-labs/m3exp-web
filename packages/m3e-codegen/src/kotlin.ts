// Parser for the generated androidx Material3 token files (tokens/*Tokens.kt).
//
// The files are machine-generated Kotlin with a small, regular grammar: an object (or class)
// whose members are `val`/`const val`/`inline val … get() =` with literal or reference values.
// Anything outside the known grammar is a hard error so a pin bump can never silently drop
// or misread a token.

export type Expr =
  | { kind: 'dp'; value: number }
  | { kind: 'sp'; value: number }
  | { kind: 'number'; value: number }
  | { kind: 'ref'; object: string; member: string }
  | { kind: 'key'; type: string; id: number }
  | { kind: 'rgb'; red: number; green: number; blue: number }
  | { kind: 'corners'; topStart: number; topEnd: number; bottomEnd: number; bottomStart: number }
  | { kind: 'circle' }
  | { kind: 'rectangle' }
  | { kind: 'cornerSize'; value: number }
  | { kind: 'cubicBezier'; points: [number, number, number, number] }
  | { kind: 'fontFamily'; name: string }
  | { kind: 'fontWeight'; name: string }
  | { kind: 'textStyle'; fields: Record<string, Expr> }
  | { kind: 'opaque'; text: string };

export interface Member {
  name: string;
  /** 1-based line of the `val` declaration in the source file. */
  line: number;
  /** Source expression, whitespace-normalized. */
  raw: string;
  expr: Expr;
  /** `//` comment attached to the member (e.g. upstream TODOs), if any. */
  comment?: string;
}

export interface TokenFile {
  object: string;
  /** `// VERSION:` header written by the upstream token generator, if present. */
  version?: string;
  members: Member[];
  /** `//` comments after the last member (e.g. upstream "missing tokens" TODO lists). */
  notes?: string[];
}

/** Members whose expressions are Compose runtime plumbing, not design values. */
const OPAQUE_MEMBERS = new Set([
  'TypographyTokens.DefaultLineHeightStyle',
  'TypographyTokens.DefaultTextStyle',
]);

const NUM = String.raw`-?\d+(?:\.\d+)?`;
const parseNum = (text: string): number => Number(text.replace(/[fL]$/, ''));

/** Replaces block comments with whitespace, keeping line numbers stable. */
const stripBlockComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

export function parseExpr(raw: string): Expr {
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^(${NUM})\\.dp$`).exec(raw))) return { kind: 'dp', value: parseNum(m[1]!) };
  if ((m = new RegExp(`^(${NUM})\\.sp$`).exec(raw))) return { kind: 'sp', value: parseNum(m[1]!) };
  if ((m = new RegExp(`^(${NUM})[fL]?$`).exec(raw)))
    return { kind: 'number', value: parseNum(m[1]!) };
  if ((m = /^([A-Z]\w*Tokens)\.([A-Z]\w*)$/.exec(raw))) {
    return { kind: 'ref', object: m[1]!, member: m[2]! };
  }
  if ((m = /^(ColorToken|ShapeToken|TypographyToken|MotionSchemeToken)\((\d+)\)$/.exec(raw))) {
    return { kind: 'key', type: m[1]!, id: Number(m[2]) };
  }
  if ((m = /^Color\(red = (\d+), green = (\d+), blue = (\d+)\)$/.exec(raw))) {
    return { kind: 'rgb', red: Number(m[1]), green: Number(m[2]), blue: Number(m[3]) };
  }
  if ((m = new RegExp(`^RoundedCornerShape\\((${NUM})\\.dp\\)$`).exec(raw))) {
    const v = parseNum(m[1]!);
    return { kind: 'corners', topStart: v, topEnd: v, bottomEnd: v, bottomStart: v };
  }
  if (raw.startsWith('RoundedCornerShape(')) {
    const args = Object.fromEntries(
      [
        ...raw.matchAll(new RegExp(`(topStart|topEnd|bottomEnd|bottomStart) = (${NUM})\\.dp`, 'g')),
      ].map((a) => [a[1]!, parseNum(a[2]!)]),
    );
    const { topStart, topEnd, bottomEnd, bottomStart } = args;
    if (
      topStart !== undefined &&
      topEnd !== undefined &&
      bottomEnd !== undefined &&
      bottomStart !== undefined &&
      Object.keys(args).length === 4
    ) {
      return { kind: 'corners', topStart, topEnd, bottomEnd, bottomStart };
    }
  }
  if (raw === 'CircleShape') return { kind: 'circle' };
  if (raw === 'RectangleShape') return { kind: 'rectangle' };
  if ((m = new RegExp(`^CornerSize\\((${NUM})\\.dp\\)$`).exec(raw))) {
    return { kind: 'cornerSize', value: parseNum(m[1]!) };
  }
  if (
    (m = new RegExp(`^CubicBezierEasing\\((${NUM})f?, (${NUM})f?, (${NUM})f?, (${NUM})f?\\)$`).exec(
      raw,
    ))
  ) {
    return {
      kind: 'cubicBezier',
      points: [parseNum(m[1]!), parseNum(m[2]!), parseNum(m[3]!), parseNum(m[4]!)],
    };
  }
  if ((m = /^FontFamily\.(\w+)$/.exec(raw))) return { kind: 'fontFamily', name: m[1]! };
  if ((m = /^FontWeight\.(\w+)$/.exec(raw))) return { kind: 'fontWeight', name: m[1]! };
  if ((m = /^DefaultTextStyle\.copy\((.*)\)$/.exec(raw))) {
    const fields: Record<string, Expr> = {};
    for (const part of m[1]!
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)) {
      const field = /^(\w+) = (?:fontFamily \?: )?(.+)$/.exec(part);
      if (!field) throw new Error(`Unrecognized TextStyle field: ${part}`);
      fields[field[1]!] = parseExpr(field[2]!);
    }
    return { kind: 'textStyle', fields };
  }
  return { kind: 'opaque', text: raw };
}

const MEMBER =
  /^[ \t]*(?:@\w+[ \t]+)*(?:(?:inline|const|internal|override)[ \t]+)*val[ \t]+(\w+)[ \t]*(?::[ \t]*[\w.?<>]+)?[ \t]*(?:=|\n[ \t]*(?:inline[ \t]+)?get\(\)[ \t]*=)/gm;

export function parseTokenFile(src: string): TokenFile {
  const text = stripBlockComments(src.replace(/\r\n/g, '\n'));
  const version = /^\/\/ VERSION: (\S+)/m.exec(text)?.[1];
  const decl = /^internal (?:object|class) (\w+)[^{]*\{/m.exec(text);
  if (!decl) throw new Error('No `internal object|class` declaration found');
  const object = decl[1]!;
  const bodyStart = decl.index + decl[0].length;
  const bodyEnd = text.lastIndexOf('}');
  const body = text.slice(bodyStart, bodyEnd);
  const lineOf = (offset: number) => text.slice(0, bodyStart + offset).split('\n').length;

  const matches = [...body.matchAll(MEMBER)];
  // Whole-line `//` comments after a member's expression belong to the *next* member (they sit
  // above its declaration); inline comments belong to the member on that line. Comments after
  // the last member are file-level notes.
  let pending: string[] = [];
  const members: Member[] = matches.map((match, i) => {
    const start = match.index + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    const comments = pending;
    pending = [];
    const code: string[] = [];
    for (const line of body.slice(start, end).split('\n')) {
      const at = line.indexOf('//');
      const before = at === -1 ? line : line.slice(0, at);
      const comment = at === -1 ? '' : line.slice(at + 2).trim();
      if (before.trim()) {
        code.push(before);
        if (comment) comments.push(comment);
      } else if (comment) {
        pending.push(comment);
      }
    }
    const raw = code
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/,\s*\)/g, ')')
      .trim();
    const name = match[1]!;
    let expr = parseExpr(raw);
    // A bare member name refers to the same object (e.g. ColorDarkTokens.SurfaceTint = Primary).
    if (expr.kind === 'opaque' && /^[A-Z]\w*$/.test(raw))
      expr = { kind: 'ref', object, member: raw };
    if (expr.kind === 'opaque' && !OPAQUE_MEMBERS.has(`${object}.${name}`)) {
      throw new Error(`${object}.${name}: unrecognized expression "${raw}"`);
    }
    const member: Member = { name, line: lineOf(match.index + match[0].indexOf('val')), raw, expr };
    if (comments.length > 0) member.comment = comments.join(' ');
    return member;
  });
  const result: TokenFile = { object, members };
  if (version !== undefined) result.version = version;
  if (pending.length > 0) result.notes = pending;
  return result;
}
