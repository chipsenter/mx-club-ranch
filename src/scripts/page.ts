import type { TrainingSession } from '../data/site';

const menu = document.querySelector<HTMLDetailsElement>('.menu');
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
document.addEventListener('click', event => { if (menu && !menu.contains(event.target as Node)) menu.open = false; });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu?.open) { menu.open = false; menu.querySelector('summary')?.focus(); } });

const calendar = document.querySelector<HTMLElement>('[data-calendar]');
if (calendar) {
  const sessions: TrainingSession[] = JSON.parse(calendar.dataset.sessions || '[]');
  const now = new Date();
  let view = new Date(now.getFullYear(), now.getMonth(), 1);
  let selected = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const days = document.querySelector<HTMLElement>('#calendar-days')!;
  const result = document.querySelector<HTMLElement>('#calendar-result')!;
  const longDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const renderResult = () => {
    result.replaceChildren();
    const heading = document.createElement('h4'); heading.textContent = longDate.format(selected); result.append(heading);
    const matches = sessions.filter(session => session.date === key(selected));
    if (!matches.length) { const message = document.createElement('p'); message.textContent = 'No training sessions announced for this date.'; result.append(message); return; }
    matches.forEach(session => {
      const row = document.createElement('div'); row.className = 'session';
      const label = document.createElement('p'); label.textContent = [session.time, session.title].filter(Boolean).join(' · '); row.append(label);
      const inPast = session.date < key(now);
      try { const url = new URL(session.bookingUrl || ''); if (url.protocol === 'https:' && !inPast) { const link = document.createElement('a'); link.href = url.href; link.textContent = 'Check availability'; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link); } } catch { /* Incomplete links must not appear as bookable. */ }
      result.append(row);
    });
  };
  const render = (focusDate?: string) => {
    document.querySelector('#calendar-month')!.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(view);
    days.replaceChildren();
    const offset = (view.getDay() + 6) % 7;
    const length = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let i = 0; i < offset; i++) { const blank = document.createElement('span'); blank.className = 'calendar-blank'; days.append(blank); }
    for (let day = 1; day <= length; day++) {
      const date = new Date(view.getFullYear(), view.getMonth(), day);
      const dateKey = key(date);
      const hasSession = sessions.some(session => session.date === dateKey);
      const button = document.createElement('button'); button.type = 'button'; button.textContent = String(day); button.dataset.date = dateKey;
      button.setAttribute('aria-label', `${longDate.format(date)}${hasSession ? ', training scheduled' : ''}`);
      button.setAttribute('aria-pressed', String(dateKey === key(selected)));
      if (dateKey === key(now)) { button.classList.add('is-today'); button.setAttribute('aria-current', 'date'); }
      if (hasSession) button.classList.add('has-session');
      button.addEventListener('click', () => { selected = date; render(dateKey); });
      button.addEventListener('keydown', event => {
        const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (event.key in offsets) { event.preventDefault(); selected = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsets[event.key]); view = new Date(selected.getFullYear(), selected.getMonth(), 1); render(key(selected)); }
      });
      days.append(button);
    }
    renderResult();
    if (focusDate) days.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  };
  const changeMonth = (offset: number) => { view = new Date(view.getFullYear(), view.getMonth() + offset, 1); selected = new Date(view); render(); };
  document.querySelector('[data-month-prev]')?.addEventListener('click', () => changeMonth(-1));
  document.querySelector('[data-month-next]')?.addEventListener('click', () => changeMonth(1));
  document.querySelector('[data-today]')?.addEventListener('click', () => { selected = new Date(now.getFullYear(), now.getMonth(), now.getDate()); view = new Date(now.getFullYear(), now.getMonth(), 1); render(); });
  render();
}
const embed = document.querySelector<HTMLDetailsElement>('.booking-embed');
embed?.addEventListener('toggle', () => { const frame = embed.querySelector('iframe'); if (embed.open && frame && !frame.src && frame.dataset.src) frame.src = frame.dataset.src; });


const themeToggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
const applyTheme = (theme: 'light' | 'dark') => {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#172b3a' : '#e7e6dd');
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.title = dark ? 'Switch to light view' : 'Switch to dark view';
    const label = themeToggle.querySelector('[data-theme-label]');
    if (label) label.textContent = dark ? 'Light' : 'Dark';
  }
};
if (themeToggle) {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  themeToggle.hidden = false;
  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem('mx-club-ranch-theme', theme); } catch { /* The toggle still works with storage blocked. */ }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'mx-club-ranch-theme' || event.key === null) applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
  });
}


const photoTrack = document.querySelector<HTMLElement>('#event-photo-track');
if (photoTrack) {
  const photos = [...photoTrack.querySelectorAll<HTMLElement>('figure')];
  const previous = document.querySelector<HTMLButtonElement>('[data-photo-prev]');
  const next = document.querySelector<HTMLButtonElement>('[data-photo-next]');
  const count = document.querySelector<HTMLElement>('[data-photo-count]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  const position = (index: number) => photos[index].offsetLeft - photos[0].offsetLeft;
  const sync = () => {
    if (!photos.length) return;
    active = photos.reduce((closest, _, index) => Math.abs(position(index) - photoTrack.scrollLeft) < Math.abs(position(closest) - photoTrack.scrollLeft) ? index : closest, 0);
    if (previous) previous.disabled = active === 0;
    if (next) next.disabled = active === photos.length - 1;
    if (count) count.textContent = `${active + 1} / ${photos.length}`;
  };
  const go = (index: number) => {
    if (!photos.length) return;
    const target = Math.max(0, Math.min(photos.length - 1, index));
    photoTrack.scrollTo({ left: position(target), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  previous?.addEventListener('click', () => go(active - 1));
  next?.addEventListener('click', () => go(active + 1));
  photoTrack.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      go(event.key === 'Home' ? 0 : event.key === 'End' ? photos.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  photoTrack.addEventListener('scroll', sync, { passive: true });
  new ResizeObserver(() => { if (photos.length) photoTrack.scrollTo({ left: position(active), behavior: 'instant' }); sync(); }).observe(photoTrack);
  sync();
}
