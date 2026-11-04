/** Shared by the website and signup API. Keep old IDs unchanged for registration history. */
export interface SignupEvent {
  id: string;
  title: string;
  dateLabel: string;
  dates: string[]; // YYYY-MM-DD, ranch local dates
  signupOpen: boolean;
  kind?: 'ride-day';
  time?: string; // Local time range shown in the calendar, e.g. "11 AM–2 PM MST"
}

const longDate = (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

/** Recurring open ride day at the ranch. Add one line per date: rideDay('YYYY-MM-DD'). */
export const rideDay = (date: string): SignupEvent => ({
  id: `ride-day-${date}`,
  title: 'Club Ranch MX Ride Day',
  dateLabel: longDate(date),
  dates: [date],
  signupOpen: true,
  kind: 'ride-day',
});

/** One-day training session with a set time: training('id', 'Title', 'YYYY-MM-DD', '1 PM–4 PM MST'). */
export const training = (id: string, title: string, date: string, time: string): SignupEvent => ({
  id,
  title,
  dateLabel: `${longDate(date)} · ${time}`,
  dates: [date],
  signupOpen: true,
  time,
});

// Keep in date order: the signup buttons render in this order.
export const signupEvents: SignupEvent[] = [
  training('imondi-2026-11-04', 'Train with Robert Imondi', '2026-11-04', '11 AM–2 PM MST'),
  training('lamay-2026-11-06', 'Train with Ben Lamay', '2026-11-06', '1 PM–4 PM MST'),
  rideDay('2026-11-08'),
  {
    id: 'chisholm-2026-11-21',
    title: 'Train with Chisholm',
    dateLabel: 'November 21–22, 2026',
    dates: ['2026-11-21', '2026-11-22'],
    signupOpen: true,
  },
];

export const signupHref = (event: SignupEvent) => `#signup-${event.id}`;
/** Today's date (YYYY-MM-DD) at the ranch. */
export const ranchToday = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Denver' }).format(now);
/** Waiver season: one signed waiver covers every event in the calendar year of the event's first date. */
export const eventSeason = (event: Pick<SignupEvent, 'dates'>) => Number(event.dates[0].slice(0, 4));
export function acceptsSignups(event: SignupEvent, now = new Date()): boolean {
  const today = ranchToday(now);
  return event.signupOpen && event.dates.some(date => date >= today);
}

/** The soonest ride day still taking signups; drives the /rideday share link. */
export const nextRideDay = (now = new Date()) =>
  signupEvents.filter(event => event.kind === 'ride-day' && acceptsSignups(event, now)).sort((a, b) => a.dates[0].localeCompare(b.dates[0]))[0];
