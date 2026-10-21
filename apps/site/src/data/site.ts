// Site-wide facts shown in the chrome and the home page. Versions come from the packages, so the
// site always states what `main` documents (DECISIONS D27).
import umbrella from '@kyralabs/m3exp-web/package.json';

/** The project's display name. `m3exp-web` stays the npm and repository name. */
export const SITE_NAME = 'M3 Expressive Web';
export const SITE_TAGLINE = 'Material 3 Expressive for the web';
export const SITE_URL = 'https://m3e.kyralabs.dev';
export const VERSION: string = umbrella.version;
export const REPO_URL = 'https://github.com/kyra-labs/m3exp-web';
export const NPM_URL = 'https://www.npmjs.com/package/@kyralabs/m3exp-web';
export const PLAYGROUND_URL = 'https://m3epg.kyralabs.dev';
export const INSTALL = 'npm install @kyralabs/m3exp-web @kyralabs/m3e-tokens';

export const ORG_NAME = 'Kyra Labs';
export const ORG_URL = 'https://kyralabs.dev';
