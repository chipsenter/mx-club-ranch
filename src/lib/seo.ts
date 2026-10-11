import { resolveSeoConfig } from './seo-config.mjs';
import { site } from '../data/site';
export const seo = resolveSeoConfig({
  SITE_URL: import.meta.env.SITE_URL,
  SITE_INDEXABLE: import.meta.env.SITE_INDEXABLE,
  CF_PAGES_BRANCH: import.meta.env.CF_PAGES_BRANCH,
});
export const pageTitle = 'Club Ranch MX | Colorado Motocross Training & Events';
export const socialImagePath = '/images/ranch-event-mountain-jump.png';
export const socialImageAlt = 'A motocross rider jumping above the Club Ranch MX track, with mountains in the distance.';
export const absoluteUrl = (path: string) => seo.origin ? new URL(path, seo.origin).href : undefined;
export const structuredData = seo.origin ? {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${seo.origin}#organization`, name: site.name, url: seo.origin,
      description: site.description, logo: { '@type': 'ImageObject', url: absoluteUrl('/images/club-ranch-logo.png'), width: 355, height: 367 },
      sameAs: [site.instagram, site.facebook].filter(Boolean),
      ...(site.phone ? { telephone: site.phone } : {}), ...(site.email ? { email: site.email } : {}),
    },
    { '@type': 'WebSite', '@id': `${seo.origin}#website`, name: site.name, url: seo.origin,
      inLanguage: 'en-US', publisher: { '@id': `${seo.origin}#organization` } },
    { '@type': 'WebPage', '@id': `${seo.origin}#webpage`, name: pageTitle, url: seo.origin,
      description: site.description, inLanguage: 'en-US', isPartOf: { '@id': `${seo.origin}#website` },
      about: { '@id': `${seo.origin}#organization` }, primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(socialImagePath), width: 1170, height: 745 } },
  ],
} : null;
