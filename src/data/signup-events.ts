/** Shared by the website and signup API. Keep old IDs unchanged for registration history. */
export interface SignupEvent {
  id: string;
  title: string;
  dateLabel: string;
  dates: string[]; // YYYY-MM-DD, ranch local dates
  signupOpen: boolean;
}

/** Recurring open ride day at the ranch. Add one line per date: rideDay('YYYY-MM-DD'). */
export const rideDay = (date: string): SignupEvent => ({
  id: `ride-day-${date}`,
  title: 'Club Ranch MX Ride Day',
  dateLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)),
  dates: [date],
  signupOpen: true,
});

// Keep in date order: the signup buttons render in this order.
export const signupEvents: SignupEvent[] = [
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
export function acceptsSignups(event: SignupEvent, now = new Date()): boolean {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Denver' }).format(now);
  return event.signupOpen && event.dates.some(date => date >= today);
}
