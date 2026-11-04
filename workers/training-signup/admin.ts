// Read-only owner admin API: /api/admin/events, /api/admin/roster, /api/admin/report. Behind Cloudflare Access + verifyAccess.
import { ranchToday } from '../../src/data/signup-events.ts';
import { verifyAccess } from './access.ts';
import { eventCatalog, roster, counts, report, type Row } from './roster.ts';

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const json = (status: number, body: unknown) => Response.json(body, { status, headers });
const isoDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
const MAX_REPORT_DAYS = 400;

async function loadRows(env: Env): Promise<Row[]> {
  const { results } = await env.DB.prepare('SELECT id, email, event_id, rider_name, phone, experience, bike, notes, created_at, waiver_status, waiver_claimed FROM registrations').bind().all<Row>();
  return results;
}

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAccess(request, env))) return json(403, { message: 'Please sign in again.' });
  if (request.method !== 'GET') return json(405, { message: 'The admin is read-only.' });
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/admin\//, '').replace(/\/$/, '');
  if (!['events', 'roster', 'report'].includes(route)) return json(404, { message: 'Not found.' });
  const today = ranchToday();
  const rows = await loadRows(env);
  const events = eventCatalog(rows, today);

  if (route === 'events') {
    const list = [...events.values()].map(event => ({ ...event, counts: counts(roster(event.id, rows, events)) }));
    const upcoming = list.filter(e => e.upcoming).sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
    const past = list.filter(e => !e.upcoming).sort((a, b) => b.dates[0].localeCompare(a.dates[0]));
    return json(200, { today, events: [...upcoming, ...past] });
  }

  if (route === 'roster') {
    const event = events.get(url.searchParams.get('event') || '');
    if (!event) return json(404, { message: 'Event not found.' });
    const date = url.searchParams.get('date') || event.dates[0];
    if (!event.dates.includes(date)) return json(400, { message: 'That date is not part of this event.' });
    const riders = roster(event.id, rows, events);
    return json(200, { event, date, counts: counts(riders), riders });
  }

  const from = url.searchParams.get('from'), to = url.searchParams.get('to');
  if (!isoDate(from) || !isoDate(to) || from > to) return json(400, { message: 'Choose a valid date range.' });
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_REPORT_DAYS) return json(400, { message: `Reports cover at most ${MAX_REPORT_DAYS} days.` });
  return json(200, report(from, to, rows, events));
}
