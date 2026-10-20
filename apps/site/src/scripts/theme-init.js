// Inlined into every page's <head> before the stylesheets apply (no flash of the wrong theme).
// Marks the document as scripted (the chrome's no-JS fallbacks key off `.site-js`), applies the color
// theme the reader chose in the theme menu (light / dark; system needs nothing) and the seed
// theme generated on the home page, both stored by src/scripts/theme.ts.
(() => {
  const root = document.documentElement;
  root.classList.add('site-js');
  try {
    const mode = localStorage.getItem('m3e-site:mode');
    if (mode === 'light' || mode === 'dark') root.dataset['theme'] = mode;
    const css = localStorage.getItem('m3e-site:theme-css');
    if (css) {
      const style = document.createElement('style');
      style.id = 'site-theme';
      style.textContent = css;
      document.head.append(style);
    }
  } catch {
    // Storage blocked (private mode, sandboxed frames): the baseline theme applies.
  }
})();
