import { spawnSync } from 'node:child_process';
const env = { ...process.env, SITE_URL: 'https://clubranchmx.com', SITE_INDEXABLE: 'true' };
if (env.CF_PAGES_BRANCH && env.CF_PAGES_BRANCH !== 'main') throw new Error('Use npm run build for preview branches.');
for (const args of [['node_modules/astro/bin/astro.mjs', 'check'], ['node_modules/astro/bin/astro.mjs', 'build'], ['scripts/check-seo.mjs', '--indexable']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
