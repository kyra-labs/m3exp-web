// schema.org JSON-LD for search engines: the site, its publisher and the library on the home
// page, and a breadcrumb trail on every other page.
import { ORG_NAME, ORG_URL, REPO_URL, SITE_NAME, SITE_URL, VERSION } from '../data/site';

/** Section index pages, by path: the middle crumbs. */
const SECTIONS: Record<string, string> = {
  '/get-started/': 'Get started',
  '/foundations/': 'Foundations',
  '/components/': 'Components',
  '/changelog/': 'Changelog',
};

const abs = (path: string) => new URL(path, SITE_URL).href;

/** Home › section › page, for any page but the home page. */
export function breadcrumbList(pathname: string, title: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [{ name: SITE_NAME, path: '/' }];
  for (let i = 1; i < parts.length; i++) {
    const path = `/${parts.slice(0, i).join('/')}/`;
    const name = SECTIONS[path];
    if (name) crumbs.push({ name, path });
  }
  crumbs.push({ name: title, path: pathname });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

/** The site, Kyra Labs as its publisher and the library itself, for the home page. */
export function homeGraph(description: string, logoUrl: string) {
  const org = { '@id': `${ORG_URL}/#organization` };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        ...org,
        name: ORG_NAME,
        url: ORG_URL,
        logo: logoUrl,
        sameAs: ['https://github.com/kyra-labs'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: 'm3exp-web',
        url: abs('/'),
        description,
        inLanguage: 'en',
        publisher: org,
      },
      {
        '@type': 'SoftwareSourceCode',
        name: SITE_NAME,
        alternateName: '@kyralabs/m3exp-web',
        description,
        url: abs('/'),
        codeRepository: REPO_URL,
        programmingLanguage: ['TypeScript', 'CSS'],
        runtimePlatform: 'Web browser',
        license: 'https://www.apache.org/licenses/LICENSE-2.0',
        version: VERSION,
        author: org,
      },
    ],
  };
}

/** JSON for a `<script type="application/ld+json">`: `<` escaped so it cannot close the tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
