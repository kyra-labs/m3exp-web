// HTML rendered from a repository Markdown file (docs/2.0-removal-plan.md), adapted to a site
// page: the file's own h1 goes (the page has one), links relative to the file point at its
// neighbours on GitHub, and each table scrolls inside a named, focusable region (as
// ScrollTable.astro does), so the page never scrolls sideways at 360px.

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .trim();

/**
 * @param html the rendered Markdown
 * @param fileUrl the file's GitHub URL, e.g. `https://github.com/o/r/blob/main/docs/plan.md`
 */
export function adaptRepoMarkdown(html: string, fileUrl: string): string {
  let heading = 'Table';
  let tables = 0;
  return html
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, '')
    .replace(/href="([^"]*)"/g, (match, href: string) =>
      href === '' || /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)
        ? match
        : `href="${new URL(href, fileUrl).href}"`,
    )
    .replace(
      /<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>|<table\b[\s\S]*?<\/table>/g,
      (match, _level, inner?: string) => {
        if (inner !== undefined) {
          heading = plain(inner);
          return match;
        }
        tables += 1;
        const label = `${heading} (table ${String(tables)})`.replace(/"/g, '&quot;');
        return `<div class="site-table" role="region" aria-label="${label}" tabindex="0">${match}</div>`;
      },
    );
}
