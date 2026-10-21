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
    const graph = homeGraph(
      'Tokens, CSS, elements and React.',
      'https://m3e.kyralabs.dev/logo.png',
    );
    const [org, site, code] = graph['@graph'];
    expect(org).toMatchObject({ '@type': 'Organization', name: 'Kyra Labs' });
    expect(site).toMatchObject({ '@type': 'WebSite', publisher: { '@id': org?.['@id'] } });
    expect(code).toMatchObject({ '@type': 'SoftwareSourceCode', author: { '@id': org?.['@id'] } });
  });
});

describe('jsonLd', () => {
  it('cannot close its script element', () => {
    expect(jsonLd({ name: '</script><b>' })).not.toContain('<');
  });
});
