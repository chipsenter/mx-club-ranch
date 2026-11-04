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
