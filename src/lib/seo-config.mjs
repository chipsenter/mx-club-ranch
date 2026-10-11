/** Single source for canonical identity. Never derive this from a preview request host. */
export function resolveSeoConfig(env = {}) {
  const raw = String(env.SITE_URL || '').trim();
  let origin;
  if (raw) {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !url.hostname.includes('.') || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.test') || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
      throw new Error('SITE_URL must be the verified public HTTPS origin, with no path, query, credentials, or port.');
    }
    origin = url.origin + '/';
  }
  if (env.SITE_INDEXABLE === 'true' && !origin) throw new Error('Set SITE_URL before enabling SITE_INDEXABLE.');
  const isBranchPreview = Boolean(env.CF_PAGES_BRANCH && env.CF_PAGES_BRANCH !== 'main');
  return { origin, indexable: Boolean(origin && env.SITE_INDEXABLE === 'true' && !isBranchPreview) };
}
