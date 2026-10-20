// Site-wide facts shown in the chrome and the home page. Versions come from the packages, so the
// site always states what `main` documents (DECISIONS D27).
import umbrella from '@kyralabs/m3exp-web/package.json';

export const SITE_NAME = 'm3exp-web';
export const SITE_TAGLINE = 'Material 3 Expressive for the web';
export const VERSION: string = umbrella.version;
export const REPO_URL = 'https://github.com/kyra-labs/m3exp-web';
export const PLAYGROUND_URL = 'https://m3epg.kyralabs.dev';
export const INSTALL = 'npm install @kyralabs/m3exp-web @kyralabs/m3e-tokens';
