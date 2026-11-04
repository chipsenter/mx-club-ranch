import test from 'node:test';
import assert from 'node:assert/strict';
import { riderKey, displayName, eventCatalog, roster, counts, report } from '../workers/training-signup/roster.ts';

let n = 0;
const row = over => ({ id: `r${++n}`, email: 'kid@example.com', event_id: 'ride-day-2026-11-08', rider_name: 'Kyle Anderson', phone: '(303) 555-0112', experience: 'Intermediate', bike: '250F', notes: '', created_at: '2026-11-01T18:00:00Z', waiver_status: 'none', waiver_claimed: 0, ...over });
const TODAY = '2026-11-03';
const rosterFor = (eventId, rows) => roster(eventId, rows, eventCatalog(rows, TODAY));

test('displayName puts the last word first', () => {
  assert.equal(displayName('Kyle Anderson'), 'Anderson, Kyle');
  assert.equal(displayName('  ana  maria lopez '), 'lopez, ana maria');
  assert.equal(displayName('Cher'), 'Cher');
});

test('riderKey normalizes email and name', () => {
  assert.equal(riderKey(' Kid@Example.com ', '  Kyle   ANDERSON '), riderKey('kid@example.com', 'kyle anderson'));
  assert.notEqual(riderKey('kid@example.com', 'Mia Baker'), riderKey('kid@example.com', 'Leo Baker'));
});

test('upload at an earlier event is on file later in the season', () => {
  const rows = [row({ event_id: 'imondi-2026-11-04', waiver_status: 'emailed' }), row({})];
  const [rider] = rosterFor('ride-day-2026-11-08', rows);
  assert.deepEqual(rider.waiver, { kind: 'on_file', fromEventId: 'imondi-2026-11-04', fromDate: '2026-11-04' });
});

test('waiver does not cross seasons', () => {
  const rows = [row({ event_id: 'old-2025', created_at: '2025-06-01T18:00:00Z', waiver_status: 'emailed' }), row({})];
  assert.deepEqual(rosterFor('ride-day-2026-11-08', rows)[0].waiver, { kind: 'missing' });
});

test('claim shows as claimed, failed upload is missing, pending is missing', () => {
  const kinds = ['claimed', 'failed', 'pending'].map(c => {
    const r = c === 'claimed' ? row({ waiver_claimed: 1 }) : row({ waiver_status: c });
    return rosterFor('ride-day-2026-11-08', [r])[0].waiver.kind;
  });
  assert.deepEqual(kinds, ['claimed', 'missing', 'missing']);
});

test('upload beats a claim', () => {
  const rows = [row({ waiver_claimed: 1 }), row({ event_id: 'imondi-2026-11-04', waiver_status: 'emailed' })];
  assert.equal(rosterFor('ride-day-2026-11-08', rows)[0].waiver.kind, 'on_file');
});

test('siblings sharing an email are separate riders', () => {
  const rows = [row({ rider_name: 'Mia Baker', waiver_status: 'emailed' }), row({ rider_name: 'Leo Baker' })];
  const riders = rosterFor('ride-day-2026-11-08', rows);
  assert.equal(riders.length, 2);
  assert.deepEqual(riders.map(r => [r.display, r.waiver.kind]), [['Baker, Leo', 'missing'], ['Baker, Mia', 'on_file']]);
});

test('resubmission shows once with latest details', () => {
  const rows = [row({ bike: '85', waiver_status: 'emailed', created_at: '2026-11-01T10:00:00Z' }), row({ bike: '125', created_at: '2026-11-02T10:00:00Z' })];
  const riders = rosterFor('ride-day-2026-11-08', rows);
  assert.equal(riders.length, 1);
  assert.equal(riders[0].bike, '125');
  assert.equal(riders[0].waiver.kind, 'on_file');
});

test('roster sorts by last name', () => {
  const rows = [row({ rider_name: 'Sam Diaz', email: 'a@x.co' }), row({ rider_name: 'Leo Chen', email: 'b@x.co' }), row({ rider_name: 'Kyle Anderson', email: 'c@x.co' })];
  assert.deepEqual(rosterFor('ride-day-2026-11-08', rows).map(r => r.display), ['Anderson, Kyle', 'Chen, Leo', 'Diaz, Sam']);
});

test('orphan event ids fall back to created_at date', () => {
  const events = eventCatalog([row({ event_id: 'old-2025', created_at: '2025-06-01T18:00:00Z' })], TODAY);
  const old = events.get('old-2025');
  assert.equal(old.listed, false);
  assert.deepEqual(old.dates, ['2025-06-01']);
  assert.equal(old.upcoming, false);
  assert.equal(old.season, 2025);
  assert.equal(events.get('ride-day-2026-11-08').listed, true);
  assert.equal(events.get('ride-day-2026-11-08').upcoming, true);
});

test('a two-day event stays upcoming until its last day', () => {
  const events = eventCatalog([], '2026-11-22');
  assert.equal(events.get('chisholm-2026-11-21').upcoming, true);
  assert.equal(eventCatalog([], '2026-11-23').get('chisholm-2026-11-21').upcoming, false);
});

test('report totals', () => {
  const vet = { email: 'vet@x.co', rider_name: 'Val Vet' };
  const rows = [
    row({ ...vet, event_id: 'oct-25', created_at: '2026-10-20T18:00:00Z' }),
    row({ ...vet, event_id: 'imondi-2026-11-04', waiver_status: 'emailed' }),
    row({ ...vet, event_id: 'ride-day-2026-11-08' }),
    row({ email: 'new@x.co', rider_name: 'Nia New', event_id: 'ride-day-2026-11-08' }),
    row({ email: 'later@x.co', rider_name: 'Lee Later', event_id: 'chisholm-2026-11-21' }),
  ];
  const r = report('2026-11-02', '2026-11-08', rows, eventCatalog(rows, TODAY));
  const { events, signups, uniqueRiders, firstTimers, returning, onFile, claimed, missing } = r.totals;
  assert.deepEqual({ events, signups, uniqueRiders, firstTimers, returning }, { events: 2, signups: 3, uniqueRiders: 2, firstTimers: 1, returning: 1 });
  assert.deepEqual({ onFile, claimed, missing }, { onFile: 1, claimed: 0, missing: 1 });
  assert.deepEqual(r.events.map(e => e.event.id), ['imondi-2026-11-04', 'ride-day-2026-11-08']);
});

test('counts add up', () => {
  const rows = [row({ email: 'a@x.co', waiver_status: 'emailed' }), row({ email: 'b@x.co', waiver_claimed: 1 }), row({ email: 'c@x.co' })];
  const c = counts(rosterFor('ride-day-2026-11-08', rows));
  assert.deepEqual(c, { riders: 3, onFile: 1, claimed: 1, missing: 1 });
});
