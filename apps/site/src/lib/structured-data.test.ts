import { describe, expect, it } from 'vitest';
import { breadcrumbList, homeGraph, jsonLd } from './structured-data';

describe('breadcrumbList', () => {
  it('puts the section index between home and the page', () => {
    const list = breadcrumbList('/components/button/', 'Button');
    expect(list.itemListElement.map((c) => [c.position, c.name, c.item])).toEqual([
      [1, 'M3 Expressive Web', 'https://m3e.kyralabs.dev/'],
      [2, 'Components', 'https://m3e.kyralabs.dev/components/'],
      [3, 'Button', 'https://m3e.kyralabs.dev/components/button/'],
    ]);
  });

  it('has no middle crumb for a top-level page', () => {
    const list = breadcrumbList('/privacy/', 'Privacy policy');
    expect(list.itemListElement.map((c) => c.name)).toEqual([
      'M3 Expressive Web',
      'Privacy policy',
    ]);
  });
});

describe('homeGraph', () => {
  it('names Kyra Labs as the publisher of the site and the author of the library', () => {
    const graph = homeGraph('Tokens, CSS, elements and React.');
    const [org, site, code] = graph['@graph'];
    expect(org).toMatchObject({ '@type': 'Organization', name: 'Kyra Labs' });
    expect(site).toMatchObject({ '@type': 'WebSite', publisher: { '@id': org?.['@id'] } });
    expect(code).toMatchObject({
      '@type': 'SoftwareSourceCode',
      '@id': 'https://m3e.kyralabs.dev/#library',
      author: { '@id': org?.['@id'] },
    });
  });

  it('keeps the WebSite node the site name comes from', () => {
    const site = homeGraph('Tokens, CSS, elements and React.')['@graph'][1];
    expect(site).toMatchObject({
      '@type': 'WebSite',
      name: 'M3 Expressive Web',
      alternateName: 'm3exp-web',
      url: 'https://m3e.kyralabs.dev/',
    });
  });

  it('describes Kyra Labs exactly as every Kyra Labs site does', () => {
    expect(homeGraph('Tokens, CSS, elements and React.')['@graph'][0]).toEqual({
      '@type': 'Organization',
      '@id': 'https://kyralabs.dev/#organization',
      name: 'Kyra Labs',
      url: 'https://kyralabs.dev/',
      logo: 'https://kyralabs.dev/web-app-manifest-512x512.png',
      description:
        'Kyra Labs is an independent, one-person app studio building practical, privacy-conscious apps for everyday life.',
      email: 'contact@kyralabs.dev',
      sameAs: ['https://github.com/kyra-labs', 'https://www.instagram.com/kyra__labs/'],
    });
  });
});

describe('jsonLd', () => {
  it('cannot close its script element', () => {
    expect(jsonLd({ name: '</script><b>' })).not.toContain('<');
  });
});
