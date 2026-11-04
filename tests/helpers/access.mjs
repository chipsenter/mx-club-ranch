// Fake Cloudflare Access team: signs JWTs with a test key and serves its certs through a stubbed fetch.
export const TEAM = 'team.example';
const b64url = bytes => Buffer.from(bytes).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
export const otherPair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1', alg: 'RS256' };
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === `https://${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [jwk] });
  return realFetch(input, init);
};
export const accessEnv = (over = {}) => ({ ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: 'aud1', ADMIN_EMAILS: 'mxjj17@gmail.com,jflsolutionsco@gmail.com', LOCAL_PREVIEW: 'false', ...over });
export const goodClaims = () => ({ aud: ['aud1'], iss: `https://${TEAM}`, email: 'JFLSolutionsCo@gmail.com', exp: Math.floor(Date.now() / 1000) + 600 });
export async function jwt(claims = goodClaims(), { kid = 'k1', key = pair.privateKey } = {}) {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const body = b64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}
export const adminRequest = (path, token, init = {}) => new Request(`https://clubranchmx.com${path}`, { ...init, headers: { ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}), ...init.headers } });
