import type { APIRoute } from 'astro';
import { seo } from '../lib/seo';
export const GET: APIRoute = () => new Response(
  // Let crawlers read the noindex meta tag on previews; Disallow would hide it.
  `User-agent: *\nAllow: /\n${seo.indexable ? `\nSitemap: ${seo.origin}sitemap.xml\n` : ''}`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
