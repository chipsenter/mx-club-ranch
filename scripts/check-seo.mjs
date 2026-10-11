import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSeoConfig } from '../src/lib/seo-config.mjs';

assert.deepEqual(resolveSeoConfig(), { origin: undefined, indexable: false });
assert.throws(() => resolveSeoConfig({ SITE_INDEXABLE: 'true' }));
for (const url of ['http://example.com', 'https://example.com/path', 'https://example.com/?q=x', 'https://example.com/#top', 'https://name:pass@example.com', 'https://localhost', 'https://127.0.0.1']) assert.throws(() => resolveSeoConfig({ SITE_URL: url }));
assert.deepEqual(resolveSeoConfig({ SITE_URL: 'https://example.com', SITE_INDEXABLE: 'true' }), { origin: 'https://example.com/', indexable: true });
assert.equal(resolveSeoConfig({ SITE_URL: 'https://example.com', SITE_INDEXABLE: 'true', CF_PAGES_BRANCH: 'preview' }).indexable, false);

const html = readFileSync('dist/index.html', 'utf8');
const robots = readFileSync('dist/robots.txt', 'utf8');
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
const errorPage = readFileSync('dist/404.html', 'utf8');
const live = process.argv.includes('--indexable');
const origin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin + '/' : undefined;
assert.equal((html.match(/<title>/g) || []).length, 1);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.match(html, /Colorado Motocross Training/);
assert.match(html, /Denver, Broomfield, Longmont, Fort Collins, and Boulder/);
assert.match(html, /name="description" content="[^\"]{80,180}"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.match(errorPage, /name="robots" content="noindex, follow"/);
assert.match(robots, /User-agent: \*\nAllow: \//);
assert.doesNotMatch(sitemap, /#training|#news|404|lastmod|priority/);
if (live) {
  assert.ok(origin);
  assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/);
  assert.ok(html.includes(`rel="canonical" href="${origin}"`));
  assert.ok(robots.includes(`Sitemap: ${origin}sitemap.xml`));
  assert.ok(sitemap.includes(`<loc>${origin}</loc>`));
  assert.ok(html.includes(`property="og:image" content="${origin}images/`));
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(json['@graph'].map(node => node['@type']), ['Organization', 'WebSite', 'WebPage']);
  assert.ok(json['@graph'][0].sameAs.includes('https://www.instagram.com/clubranchmx/'));
  assert.equal(json['@graph'][0].address, undefined);
} else {
  assert.match(html, /name="robots" content="noindex, follow"/);
  assert.doesNotMatch(sitemap, /<loc>/);
  assert.doesNotMatch(robots, /Sitemap:/);
  if (!origin) assert.doesNotMatch(html, /rel="canonical"|property="og:url"|application\/ld\+json/);
}
console.log(`SEO checks passed (${live ? 'production' : 'preview'} build).`);
