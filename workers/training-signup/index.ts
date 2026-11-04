import { signupEvents, acceptsSignups, eventSeason } from '../../src/data/signup-events.ts';
import { waiver } from '../../src/data/waiver.ts';
import { formatUsPhone } from '../../src/data/phone.ts';
import { handleAdmin } from './admin.ts';
const reply = (status: number, message: string) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Competitive racer'];
// Text fields fit in 8 KB; a signed waiver adds its base64 size (4/3 of the file) plus a little JSON.
const maxBody = (n: number) => 8192 + Math.ceil(n / 3) * 4 + 512;
// Check the file really is what it claims, so only documents and photos are forwarded to staff.
const signatures: Record<string, (b: Uint8Array) => boolean> = {
  pdf: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  jpg: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: b => String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP',
  heic: b => String.fromCharCode(...b.subarray(4, 8)) === 'ftyp',
  heif: b => String.fromCharCode(...b.subarray(4, 8)) === 'ftyp',
};
type Waiver = { filename: string; type: string; content: string };
function readWaiver(value: unknown, riderName: string): Waiver | null | false {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { type, data } = value as Record<string, unknown>;
  if (typeof type !== 'string' || typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4) return false;
  const ext = waiver.types[type];
  if (!ext) return false;
  const size = data.length / 4 * 3 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  if (size < 16 || size > waiver.maxBytes) return false;
  const head = Uint8Array.from(atob(data.slice(0, 16)), char => char.charCodeAt(0));
  if (!signatures[ext](head)) return false;
  const slug = riderName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'rider';
  return { filename: `waiver-${waiver.season}-${slug}.${ext}`, type, content: data };
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/admin/')) return handleAdmin(request, env);
    if (new URL(request.url).pathname !== '/api/training-signup/') return reply(404, 'Not found.');
    if (request.method !== 'POST') return reply(405, 'Use the signup form to send a request.');
    const origin = request.headers.get('Origin');
    const localPreview = env.LOCAL_PREVIEW === 'true' && origin === 'http://127.0.0.1:4321';
    if (origin !== new URL(request.url).origin && !localPreview) return reply(403, 'Please submit from the ranch website.');
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415, 'Invalid request format.');
    if (!(await env.SIGNUP_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' })).success) return reply(429, 'Please wait a minute before trying again.');
    // Bound the actual stream, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, 'Please fill in the form.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody(waiver.maxBytes)) { await reader.cancel(); return reply(413, 'Your message is too long.'); }
      chunks.push(value);
    }
    let data: Record<string, unknown>;
    try {
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      data = parsed;
    } catch { return reply(400, 'Please check your form and try again.'); }
    const signupEvent = signupEvents.find(event => event.id === data.eventId);
    if (!signupEvent) return reply(400, 'Please choose a valid event.');
    if (!acceptsSignups(signupEvent)) return reply(409, 'Signup for this event is closed. Please contact the ranch for upcoming opportunities.');
    if (data.website) return reply(400, 'Please check your form and try again.');
    const limits: Record<string, number> = { riderName: 100, email: 254, phone: 40, experience: 40, bike: 100, notes: 1000 };
    const fields: Record<string, string> = {};
    for (const [key, max] of Object.entries(limits)) {
      const value = data[key] ?? '';
      if (typeof value !== 'string' || value.length > max) return reply(400, 'Please check your form fields.');
      fields[key] = value.trim();
    }
    const phone = formatUsPhone(fields.phone);
    if (!fields.riderName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || !phone || !levels.includes(fields.experience)) return reply(400, 'Please enter your name, valid email, a 10-digit US phone number, and riding experience.');
    fields.phone = phone;
    const signedWaiver = readWaiver(data.waiver, fields.riderName);
    if (signedWaiver === false) return reply(400, `The signed waiver must be a PDF or photo under ${waiver.maxBytes / 1024 / 1024} MB.`);
    if (data.marketingOptIn !== undefined && typeof data.marketingOptIn !== 'boolean') return reply(400, 'Invalid email preference.');
    if (data.waiverClaimed !== undefined && typeof data.waiverClaimed !== 'boolean') return reply(400, 'Invalid waiver answer.');
    const waiverClaimed = data.waiverClaimed === true;
    const season = eventSeason(signupEvent);
    if (typeof data.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId)) return reply(400, 'Please refresh the form and try again.');
    const id = data.requestId;
    const email = fields.email.toLowerCase();
    const optedIn = data.marketingOptIn === true;
    const createdAt = new Date().toISOString();
    const consentVersion = 'event-updates-v1';
    const savedMessage = 'Your request has been saved. The ranch team will contact you about availability and next steps. Your place is not confirmed yet.';
    try {
      // A retried submission must not create another registration or email.
      const existing = await env.DB.prepare('SELECT id FROM registrations WHERE id = ?').bind(id).first();
      if (existing) return reply(200, savedMessage);
      const results = await env.DB.batch([
        env.DB.prepare('INSERT INTO contacts (email, created_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING').bind(email, createdAt),
        env.DB.prepare(`INSERT INTO registrations (id, email, event_id, rider_name, phone, experience, bike, notes, marketing_opt_in, consent_version, created_at, waiver_status, waiver_claimed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
          .bind(id, email, signupEvent.id, fields.riderName, fields.phone, fields.experience, fields.bike, fields.notes, optedIn ? 1 : 0, optedIn ? consentVersion : null, createdAt, signedWaiver ? 'pending' : 'none', waiverClaimed ? 1 : 0),
        // An unchecked box never subscribes; a signup never reverses an unsubscribe.
        env.DB.prepare(`UPDATE contacts SET marketing_status = 'opted_in', consent_at = COALESCE(consent_at, ?), consent_version = COALESCE(consent_version, ?)
          WHERE email = ? AND marketing_status != 'unsubscribed' AND ? = 1 AND EXISTS (SELECT 1 FROM registrations WHERE id = ? AND email = ? AND marketing_opt_in = 1)`)
          .bind(createdAt, consentVersion, email, optedIn ? 1 : 0, id, email),
      ]);
      if (results[1].meta.changes === 0) return reply(200, savedMessage);
    } catch {
      console.error('training_signup_storage_failed');
      return reply(503, 'We could not save your request. Your details are still here. Please try again or email post@clubranchmx.com.');
    }
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    const notification = (waiverLine: string) => {
      const text = `Event request: ${signupEvent.title}, ${signupEvent.dateLabel}\n\nRider: ${fields.riderName}\nEmail: ${fields.email}\nPhone: ${fields.phone}\nExperience: ${fields.experience}\nBike: ${fields.bike || 'Not provided'}\nSigned waiver: ${waiverLine}\n\nNotes:\n${fields.notes || 'None'}\n\nThis is a registration request, not a confirmed booking.`;
      return { from: 'post@clubranchmx.com', to: 'mxjj17@gmail.com', replyTo: fields.email, subject: `${signupEvent.title} signup request${signedWaiver ? ' + signed waiver' : ''} — ${signupEvent.dateLabel}`, text, html: `<div style="white-space:pre-wrap">${escape(text)}</div>` };
    };
    let waiverDelivered = !signedWaiver;
    try {
      if (signedWaiver) {
        try {
          await env.EMAIL.send({ ...notification(`attached (${signedWaiver.filename})`), attachments: [{ ...signedWaiver, disposition: 'attachment' }] });
          waiverDelivered = true;
        } catch {
          // Still tell staff about the signup; the rider is asked to bring a paper copy instead.
          console.error('training_signup_waiver_attachment_failed');
          await env.EMAIL.send(notification('uploaded but could not be attached. Ask the rider to bring a signed paper copy.'));
        }
      } else {
        await env.EMAIL.send(notification(waiverClaimed ? `Rider says they already signed a ${season} waiver. Not verified; check the roster.` : 'not uploaded. Rider should bring a signed paper copy.'));
      }
      await env.DB.prepare("UPDATE registrations SET notification_status = 'accepted' WHERE id = ?").bind(id).run();
    } catch {
      console.error('training_signup_delivery_failed');
      try { await env.DB.prepare("UPDATE registrations SET notification_status = 'failed' WHERE id = ?").bind(id).run(); } catch { console.error('training_signup_notification_status_failed'); }
    }
    if (signedWaiver) {
      try { await env.DB.prepare('UPDATE registrations SET waiver_status = ? WHERE id = ?').bind(waiverDelivered ? 'emailed' : 'failed', id).run(); } catch { console.error('training_signup_waiver_status_failed'); }
    }
    const waiverMessage = waiverDelivered ? '' : ' We could not deliver your signed waiver, so please bring a signed paper copy on ride day.';
    // Transactional acknowledgment is independent of marketing consent and staff notification.
    // Enable only after the sending domain can send to arbitrary rider addresses.
    if (env.RIDER_RECEIPTS_ENABLED === 'true') {
      const receipt = `Thanks for signing up for ${signupEvent.title}!\n\nDates: ${signupEvent.dateLabel}\nLocation: Club Ranch MX, 11021 Yellowstone Rd, Longmont, CO 80504\n\nWe received your registration request. Your place is not confirmed yet. The ranch team will contact you about availability and next steps.\n\n${signedWaiver && waiverDelivered ? 'We received your signed waiver. Thank you!' : !signedWaiver && waiverClaimed ? `You told us you already signed a ${season} waiver. If you're not sure, bring a signed copy.` : `Every rider needs a signed ${waiver.season} waiver. Print it, sign it, and bring it to the track:\n${waiver.url}`}\n\nQuestions? Reply to this email or contact post@clubranchmx.com.\n\nClub Ranch MX`;
      const receiptHtml = escape(receipt);
      try {
        await env.DB.prepare("UPDATE registrations SET receipt_status = 'pending' WHERE id = ?").bind(id).run();
        await env.EMAIL.send({ from: 'post@clubranchmx.com', to: email, replyTo: 'post@clubranchmx.com', subject: `Request received: ${signupEvent.title}`, text: receipt, html: `<div style="white-space:pre-wrap">${receiptHtml}</div>` });
      } catch {
        console.error('training_signup_receipt_failed');
        try { await env.DB.prepare("UPDATE registrations SET receipt_status = 'failed' WHERE id = ?").bind(id).run(); } catch { console.error('training_signup_receipt_status_failed'); }
        return reply(200, `${savedMessage}${waiverMessage} We could not send your email acknowledgment; you do not need to submit again.`);
      }
      try { await env.DB.prepare("UPDATE registrations SET receipt_status = 'accepted' WHERE id = ?").bind(id).run(); } catch { console.error('training_signup_receipt_status_failed'); }
    }
    return reply(200, savedMessage + waiverMessage);
  },
} satisfies ExportedHandler<Env>;
