// Second lock behind Cloudflare Access: verify the Access JWT ourselves so a misconfigured policy alone can't expose rider data.
type Jwk = JsonWebKey & { kid?: string };
let certs: { team: string; keys: Jwk[]; fetchedAt: number } | null = null;
const CERT_TTL_MS = 10 * 60 * 1000;

async function loadKeys(team: string, force: boolean): Promise<Jwk[]> {
  if (!force && certs && certs.team === team && Date.now() - certs.fetchedAt < CERT_TTL_MS) return certs.keys;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error('certs unavailable');
  const { keys } = await response.json() as { keys: Jwk[] };
  certs = { team, keys, fetchedAt: Date.now() };
  return keys;
}

const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const json = (part: string) => JSON.parse(new TextDecoder().decode(decode(part)));

/** Returns the signed-in admin's email (lower-cased), or null for anyone else. */
export async function verifyAccess(request: Request, env: Env): Promise<string | null> {
  try {
    const url = new URL(request.url);
    if (env.LOCAL_PREVIEW === 'true' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')) return 'local@preview';
    const team = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD;
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!team || !aud || !token) return null;
    const [head, body, sig] = token.split('.');
    if (!head || !body || !sig) return null;
    const header = json(head) as { alg?: string; kid?: string };
    if (header.alg !== 'RS256' || !header.kid) return null;
    let jwk = (await loadKeys(team, false)).find(k => k.kid === header.kid);
    if (!jwk) jwk = (await loadKeys(team, true)).find(k => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(sig), new TextEncoder().encode(`${head}.${body}`)))) return null;
    const claims = json(body) as { aud?: string | string[]; iss?: string; exp?: number; nbf?: number; email?: string };
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(aud) || claims.iss !== `https://${team}`) return null;
    if (typeof claims.exp !== 'number' || claims.exp <= now || (typeof claims.nbf === 'number' && claims.nbf > now)) return null;
    const email = claims.email?.trim().toLowerCase();
    const allowed = (env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return email && allowed.includes(email) ? email : null;
  } catch {
    return null;
  }
}
