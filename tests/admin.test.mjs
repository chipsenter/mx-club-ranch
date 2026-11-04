import test from 'node:test';
import assert from 'node:assert/strict';
import { accessEnv, goodClaims, jwt, adminRequest, otherPair } from './helpers/access.mjs';
import { verifyAccess } from '../workers/training-signup/access.ts';

const now = () => Math.floor(Date.now() / 1000);

test('valid Access token returns the admin email', async () => {
  assert.equal(await verifyAccess(adminRequest('/api/admin/events', await jwt()), accessEnv()), 'jflsolutionsco@gmail.com');
});

test('rejects missing, expired, wrong aud, wrong issuer, unlisted email, bad signature, unknown kid', async () => {
  const bad = [
    undefined,
    'not.a.jwt',
    await jwt({ ...goodClaims(), exp: now() - 5 }),
    await jwt({ ...goodClaims(), nbf: now() + 600 }),
    await jwt({ ...goodClaims(), aud: ['other'] }),
    await jwt({ ...goodClaims(), iss: 'https://evil.example' }),
    await jwt({ ...goodClaims(), email: 'stranger@gmail.com' }),
    await jwt(goodClaims(), { key: otherPair.privateKey }),
    await jwt(goodClaims(), { kid: 'nope' }),
  ];
  for (const [i, token] of bad.entries()) assert.equal(await verifyAccess(adminRequest('/api/admin/events', token), accessEnv()), null, `case ${i}`);
});

test('empty ACCESS_AUD denies', async () => {
  assert.equal(await verifyAccess(adminRequest('/api/admin/events', await jwt({ ...goodClaims(), aud: [''] })), accessEnv({ ACCESS_AUD: '' })), null);
});

test('LOCAL_PREVIEW only bypasses on localhost', async () => {
  const env = accessEnv({ LOCAL_PREVIEW: 'true' });
  assert.equal(await verifyAccess(new Request('http://127.0.0.1:8787/api/admin/events'), env), 'local@preview');
  assert.equal(await verifyAccess(new Request('https://clubranchmx.com/api/admin/events'), env), null);
  assert.equal(await verifyAccess(new Request('http://127.0.0.1:8787/api/admin/events'), accessEnv()), null);
});

// --- Admin API ---
import { environment } from './helpers/env.mjs';
import worker from '../workers/training-signup/index.ts';

async function adminEnv(rows = []) {
  const env = { ...environment(), ...accessEnv() };
  const insert = env.db.prepare(`INSERT INTO contacts (email, created_at) VALUES (?, '2026-10-01T00:00:00Z') ON CONFLICT(email) DO NOTHING`);
  const reg = env.db.prepare(`INSERT INTO registrations (id, email, event_id, rider_name, phone, experience, bike, notes, marketing_opt_in, created_at, waiver_status, waiver_claimed) VALUES (?, ?, ?, ?, '(303) 555-0112', 'Intermediate', '', '', 0, ?, ?, ?)`);
  rows.forEach((r, i) => { insert.run(r.email); reg.run(`r${i}`, r.email, r.event, r.name, r.created ?? '2026-11-01T18:00:00Z', r.waiver ?? 'none', r.claimed ?? 0); });
  return env;
}
const get = async (env, path, token) => worker.fetch(adminRequest(path, token === undefined ? await jwt() : token), env);

test('events lists upcoming with counts and keeps orphan events under past', async () => {
  const env = await adminEnv([
    { email: 'a@x.co', name: 'Ann Able', event: 'ride-day-2026-11-08', waiver: 'emailed' },
    { email: 'b@x.co', name: 'Bo Bee', event: 'ride-day-2026-11-08' },
    { email: 'c@x.co', name: 'Cy Old', event: 'old-2025', created: '2025-06-01T18:00:00Z' },
  ]);
  const res = await get(env, '/api/admin/events');
  assert.equal(res.status, 200);
  const { today, events } = await res.json();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const nov8 = events.find(e => e.id === 'ride-day-2026-11-08');
  assert.deepEqual(nov8.counts, { riders: 2, onFile: 1, claimed: 0, missing: 1 });
  const old = events.find(e => e.id === 'old-2025');
  assert.equal(old.upcoming, false);
  assert.equal(old.counts.riders, 1);
  const firstPast = events.findIndex(e => !e.upcoming);
  assert.ok(events.slice(0, firstPast).every(e => e.upcoming) && events.slice(firstPast).every(e => !e.upcoming));
});

test('roster for a two-day event accepts each date and rejects others', async () => {
  const env = await adminEnv([{ email: 'a@x.co', name: 'Ann Able', event: 'chisholm-2026-11-21' }]);
  const ok = await get(env, '/api/admin/roster/?event=chisholm-2026-11-21&date=2026-11-22');
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.date, '2026-11-22');
  assert.equal(body.riders[0].display, 'Able, Ann');
  assert.equal((await (await get(env, '/api/admin/roster/?event=chisholm-2026-11-21')).json()).date, '2026-11-21');
  assert.equal((await get(env, '/api/admin/roster/?event=chisholm-2026-11-21&date=2026-11-23')).status, 400);
  assert.equal((await get(env, '/api/admin/roster/?event=invented')).status, 404);
});

test('report validates range', async () => {
  const env = await adminEnv();
  assert.equal((await get(env, '/api/admin/report/?from=2026-11-09&to=2026-11-01')).status, 400);
  assert.equal((await get(env, '/api/admin/report/?from=bad&to=2026-11-01')).status, 400);
  assert.equal((await get(env, '/api/admin/report/?from=2024-01-01&to=2026-11-01')).status, 400);
  const ok = await get(env, '/api/admin/report/?from=2026-11-01&to=2026-11-30');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).totals.events, 0);
});

test('admin responses are no-store and noindex; POST is 405; no token is 403 and reads nothing', async () => {
  const env = await adminEnv();
  const res = await get(env, '/api/admin/events');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex');
  assert.equal((await worker.fetch(adminRequest('/api/admin/events', await jwt(), { method: 'POST' }), env)).status, 405);
  assert.equal((await get(env, '/api/admin/nope')).status, 404);
  env.DB.prepare = () => { throw Error('must not read'); };
  const denied = await get(env, '/api/admin/events', null);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Cache-Control'), 'no-store');
  assert.equal((await get(env, '/api/admin/events', await jwt({ ...goodClaims(), email: 'stranger@gmail.com' }))).status, 403);
});

test('signup route is unchanged', async () => {
  const env = await adminEnv();
  const body = { eventId: 'chisholm-2026-11-21', requestId: crypto.randomUUID(), riderName: 'Test Rider', email: 'rider@example.com', phone: '+1 607 624 9173', experience: 'Intermediate' };
  const res = await worker.fetch(new Request('https://clubranchmx.com/api/training-signup/', { method: 'POST', headers: { Origin: 'https://clubranchmx.com', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
  assert.equal(res.status, 200);
});

// --- Admin page helpers ---
import { readFileSync } from 'node:fs';
import { waiverLabel, shortDate, longDate, presetRange } from '../src/scripts/admin.ts';

test('admin renderer never interprets rider text as HTML', () => {
  assert.equal(waiverLabel({ kind: 'on_file', fromEventId: 'a', fromDate: '2026-11-04' }, 2026, 'b').text, '✔ on file (Nov 4)');
  assert.equal(waiverLabel({ kind: 'on_file', fromEventId: 'b', fromDate: '2026-11-04' }, 2026, 'b').text, '✔ on file');
  assert.deepEqual(waiverLabel({ kind: 'claimed' }, 2026, 'b'), { text: '☑ rider says signed', tone: 'claimed' });
  assert.deepEqual(waiverLabel({ kind: 'missing' }, 2026, 'b'), { text: '✖ NEEDS PAPER', tone: 'missing' });
  for (const file of ['src/scripts/admin.ts', 'src/pages/admin/index.astro', 'src/pages/admin/roster.astro']) assert.doesNotMatch(readFileSync(file, 'utf8'), /innerHTML|set:html|insertAdjacentHTML/, file);
});

test('admin date helpers', () => {
  assert.equal(shortDate('2026-11-04'), 'Nov 4');
  assert.equal(longDate('2026-11-08'), 'Sunday, November 8, 2026');
  assert.deepEqual(presetRange('week', '2026-11-04'), { from: '2026-11-02', to: '2026-11-08' });
  assert.deepEqual(presetRange('week', '2026-11-08'), { from: '2026-11-02', to: '2026-11-08' });
  assert.deepEqual(presetRange('month', '2026-11-04'), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(presetRange('month', '2026-02-10'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(presetRange('year', '2026-11-04'), { from: '2026-01-01', to: '2026-12-31' });
});
