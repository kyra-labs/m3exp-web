// A small Markdown subset for text taken from COMPONENT_SPEC, JSDoc and CSS comments: paragraphs,
// "- " lists, `code`, **bold**, *emphasis* and links. Everything else is escaped text.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline Markdown → HTML. */
export function inline(text: string): string {
  const codes: string[] = [];
  let html = escape(text.replace(/\{@link\s+([^}\s]+)\s*\}/g, '`$1`')).replace(
    /`([^`]+)`/g,
    (_, code: string) => {
      codes.push(`<code>${code}</code>`);
      return `\uE000${String(codes.length - 1)}\uE001`;
    },
  );
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/)?\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(
      /(^|[\s(])((?:https?:\/\/)?m3\.material\.io\/[^\s),;]*[^\s),;.])/g,
      (_, pre: string, url: string) =>
        `${pre}<a href="${url.startsWith('http') ? url : `https://${url}`}">${url}</a>`,
    );
  return html.replace(/\uE000(\d+)\uE001/g, (_, i: string) => codes[Number(i)] ?? '');
}

/** Block Markdown (paragraphs and "- " lists, nested by indentation) → HTML. */
export function block(text: string): string {
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length > 0) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const items: string[] = [];
  const flushList = () => {
    if (items.length > 0)
      out.push(`<ul>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`);
    items.length = 0;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const item = /^[-*] (?:\[[ x]\] )?(.*)$/.exec(line);
    if (item) {
      flush();
      items.push(item[1] ?? '');
    } else if (line === '') {
      flush();
      flushList();
    } else if (items.length > 0 && /^\s/.test(raw)) {
      items[items.length - 1] = `${items.at(-1) ?? ''} ${line}`;
    } else {
      flushList();
      para.push(line);
    }
  }
  flush();
  flushList();
  return out.join('\n');
}
