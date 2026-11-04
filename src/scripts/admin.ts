// Shared helpers for the owner admin pages. Rider data is only ever placed with textContent, never parsed as HTML.
import type { Waiver, EventInfo, Counts, Rider, Report } from '../../workers/training-signup/roster.ts';
export type { Waiver, EventInfo, Counts, Rider, Report };
export type AdminEvent = EventInfo & { counts: Counts };

export class AdminAuthError extends Error {}

export async function fetchAdmin<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
  } catch {
    // Access answers an expired session with a cross-origin redirect to its login page; fetch can't follow it and throws.
    throw new AdminAuthError('Please sign in again.');
  }
  // A same-origin redirect or an HTML login page also means the session is gone.
  if (response.status === 401 || response.status === 403 || response.redirected || !response.headers.get('Content-Type')?.includes('application/json')) throw new AdminAuthError('Please sign in again.');
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || 'Something went wrong.');
  return body as T;
}

type Child = Node | string | number | null | undefined | false;
/** Tiny DOM builder: attributes via setAttribute, text via text nodes. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string | boolean | undefined> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(name === 'className' ? 'class' : name, value === true ? '' : value);
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(typeof child === 'object' ? child : String(child));
  return node;
}

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' });
export const shortDate = (iso: string) => fmt({ month: 'short', day: 'numeric' }).format(utc(iso));
export const dayLabel = (iso: string) => fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(utc(iso));
export const longDate = (iso: string) => fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(utc(iso));

export function waiverLabel(w: Waiver, _season: number, currentEventId: string): { text: string; tone: 'ok' | 'claimed' | 'missing' } {
  if (w.kind === 'on_file') return { text: w.fromEventId === currentEventId ? '✔ on file' : `✔ on file (${shortDate(w.fromDate)})`, tone: 'ok' };
  if (w.kind === 'claimed') return { text: '☑ rider says signed', tone: 'claimed' };
  return { text: '✖ NEEDS PAPER', tone: 'missing' };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Report presets around a ranch-local "today" (YYYY-MM-DD). Weeks run Monday–Sunday. */
export function presetRange(kind: 'week' | 'month' | 'year', today: string): { from: string; to: string } {
  const d = new Date(`${today}T00:00:00Z`);
  if (kind === 'week') {
    const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }
  if (kind === 'month') return { from: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))), to: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))) };
  return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
}

/** "Your login expired" box with a reload link, shown in place of content. */
export function authExpired(): HTMLElement {
  return el('div', { className: 'admin-notice', role: 'alert' }, el('p', {}, 'Your login expired. '), el('a', { className: 'button', href: location.pathname + location.search }, 'Sign in again'));
}
export function failure(message: string): HTMLElement {
  return el('div', { className: 'admin-notice', role: 'alert' }, el('p', {}, message), el('a', { className: 'text-link', href: location.pathname + location.search }, 'Try again'));
}
