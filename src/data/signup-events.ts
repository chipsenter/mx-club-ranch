/** Shared by the website and signup API. Keep old IDs unchanged for registration history. */
export interface SignupEvent {
  id: string;
  title: string;
  dateLabel: string;
  dates: string[]; // YYYY-MM-DD, ranch local dates
  signupOpen: boolean;
}

export const signupEvents: SignupEvent[] = [
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
