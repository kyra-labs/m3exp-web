// Runs an HTML example's module scripts on its example page, where there is no bundler: each
// `import … from '@kyralabs/m3e-elements/<entry>.js'` becomes an await of the page's loader for
// that entry (src/pages/examples/[slug]/[name].astro). The code tab still shows the file as
// written, for a bundler. Any other import fails the build.

const SCRIPT = /<script type="module">([\s\S]*?)<\/script>/g;
const IMPORT = /^[ \t]*import\s+(?:([^'"]*?)\s+from\s+)?'([^']+)';?[ \t]*$/gm;
const ENTRY = /^@kyralabs\/m3e-elements\/([\w-]+)\.js$/;

export function runnableExample(html: string): string {
  return html.replace(SCRIPT, (_script, body: string) => {
    const code = body.replace(IMPORT, (_line, names: string | undefined, specifier: string) => {
      const entry = ENTRY.exec(specifier)?.[1];
      if (entry === undefined) {
        throw new Error(
          `An HTML example imports ${specifier}: example pages resolve only @kyralabs/m3e-elements/<entry>.js`,
        );
      }
      const load = `await m3eImport('${entry}')`;
      if (names === undefined) return `${load};`;
      const namespace = /^\*\s+as\s+(\w+)$/.exec(names)?.[1];
      if (namespace !== undefined) return `const ${namespace} = ${load};`;
      if (!names.startsWith('{')) {
        throw new Error(
          `An HTML example imports ${names} from ${specifier}: entries have no default export`,
        );
      }
      return `const ${names.replace(/\s+as\s+/g, ': ')} = ${load};`;
    });
    return `<script type="module">${code}</script>`;
  });
}
