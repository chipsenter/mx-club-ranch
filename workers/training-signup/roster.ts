// Pure roster, waiver and report logic for the owner admin. No I/O: the admin handler loads rows and calls these.
import { signupEvents, eventSeason } from '../../src/data/signup-events.ts';

export type Row = { id: string; email: string; event_id: string; rider_name: string; phone: string; experience: string; bike: string; notes: string; created_at: string; waiver_status: 'none' | 'pending' | 'emailed' | 'failed'; waiver_claimed: 0 | 1 };
export type EventInfo = { id: string; title: string; dates: string[]; time?: string; season: number; upcoming: boolean; listed: boolean };
export type Waiver = { kind: 'on_file'; fromEventId: string; fromDate: string } | { kind: 'claimed' } | { kind: 'missing' };
export type Rider = { key: string; name: string; display: string; phone: string; experience: string; bike: string; notes: string; waiver: Waiver };
export type Counts = { riders: number; onFile: number; claimed: number; missing: number };
export type Report = { from: string; to: string; totals: { events: number; signups: number; uniqueRiders: number; firstTimers: number; returning: number } & Omit<Counts, 'riders'>; events: { event: EventInfo; riders: Rider[] }[] };

const clean = (name: string) => name.trim().replace(/\s+/g, ' ');
const denverDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Denver' });

/** One rider = one email + one name, so siblings registered by a parent stay separate. */
export const riderKey = (email: string, name: string) => `${email.trim().toLowerCase()}|${clean(name).toLowerCase()}`;

export function displayName(name: string): string {
  const parts = clean(name).split(' ');
  return parts.length < 2 ? parts[0] : `${parts.at(-1)}, ${parts.slice(0, -1).join(' ')}`;
}

/** Every event on the site plus any event id found in registrations (events since removed from the site). */
export function eventCatalog(rows: Row[], today: string): Map<string, EventInfo> {
  const events = new Map<string, EventInfo>();
  for (const e of signupEvents) events.set(e.id, { id: e.id, title: e.title, dates: e.dates, time: e.time, season: eventSeason(e), upcoming: e.dates.at(-1)! >= today, listed: true });
  const firstSeen = new Map<string, string>();
  for (const r of rows) if (!events.has(r.event_id) && (!firstSeen.has(r.event_id) || r.created_at < firstSeen.get(r.event_id)!)) firstSeen.set(r.event_id, r.created_at);
  for (const [id, createdAt] of firstSeen) {
    const date = denverDate.format(new Date(createdAt));
    events.set(id, { id, title: id, dates: [date], season: Number(date.slice(0, 4)), upcoming: date >= today, listed: false });
  }
  return events;
}

function waiverFor(key: string, season: number, rows: Row[], events: Map<string, EventInfo>): Waiver {
  const sameSeason = rows.filter(r => riderKey(r.email, r.rider_name) === key && events.get(r.event_id)?.season === season);
  const uploads = sameSeason.filter(r => r.waiver_status === 'emailed').map(r => events.get(r.event_id)!).sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
  if (uploads.length) return { kind: 'on_file', fromEventId: uploads[0].id, fromDate: uploads[0].dates[0] };
  return sameSeason.some(r => r.waiver_claimed === 1) ? { kind: 'claimed' } : { kind: 'missing' };
}

const byName = (a: Rider, b: Rider) => a.display.localeCompare(b.display, 'en', { sensitivity: 'base' });

export function roster(eventId: string, rows: Row[], events: Map<string, EventInfo>): Rider[] {
  const event = events.get(eventId);
  if (!event) return [];
  const latest = new Map<string, Row>();
  for (const r of rows) {
    if (r.event_id !== eventId) continue;
    const key = riderKey(r.email, r.rider_name);
    if (!latest.has(key) || r.created_at > latest.get(key)!.created_at) latest.set(key, r);
  }
  return [...latest].map(([key, r]) => ({ key, name: clean(r.rider_name), display: displayName(r.rider_name), phone: r.phone, experience: r.experience, bike: r.bike, notes: r.notes, waiver: waiverFor(key, event.season, rows, events) })).sort(byName);
}

export function counts(riders: Rider[]): Counts {
  const c = { riders: riders.length, onFile: 0, claimed: 0, missing: 0 };
  for (const r of riders) c[r.waiver.kind === 'on_file' ? 'onFile' : r.waiver.kind]++;
  return c;
}

/** Events with signups whose first date falls in [from, to], with totals. First-timer = earliest event ever is inside the range. */
export function report(from: string, to: string, rows: Row[], events: Map<string, EventInfo>): Report {
  const inRange = [...events.values()].filter(e => e.dates[0] >= from && e.dates[0] <= to).sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
  const sections = inRange.map(event => ({ event, riders: roster(event.id, rows, events) })).filter(s => s.riders.length > 0);
  const firstEver = new Map<string, string>();
  for (const r of rows) {
    const date = events.get(r.event_id)?.dates[0];
    const key = riderKey(r.email, r.rider_name);
    if (date && (!firstEver.has(key) || date < firstEver.get(key)!)) firstEver.set(key, date);
  }
  const latestState = new Map<string, Rider>(); // sections are date-ordered, so the last write is the rider's latest event
  for (const s of sections) for (const r of s.riders) latestState.set(r.key, r);
  const unique = [...latestState.keys()];
  const firstTimers = unique.filter(k => firstEver.get(k)! >= from && firstEver.get(k)! <= to).length;
  const { onFile, claimed, missing } = counts([...latestState.values()]);
  return {
    from, to,
    totals: { events: sections.length, signups: sections.reduce((n, s) => n + s.riders.length, 0), uniqueRiders: unique.length, firstTimers, returning: unique.length - firstTimers, onFile, claimed, missing },
    events: sections,
  };
}
