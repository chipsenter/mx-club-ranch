import { signupEvents, acceptsSignups } from '../../src/data/signup-events.ts';
const reply = (status: number, message: string) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
const levels = ['Beginner', 'Intermediate', 'Advanced', 'Competitive racer'];
export default {
  async fetch(request, env) {
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
      if (size > 8192) { await reader.cancel(); return reply(413, 'Your message is too long.'); }
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
    if (!fields.riderName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || !/^[+()\d\s.-]{7,40}$/.test(fields.phone) || !levels.includes(fields.experience)) return reply(400, 'Please enter your name, valid email, phone number, and riding experience.');
    if (data.marketingOptIn !== undefined && typeof data.marketingOptIn !== 'boolean') return reply(400, 'Invalid email preference.');
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
        env.DB.prepare(`INSERT INTO registrations (id, email, event_id, rider_name, phone, experience, bike, notes, marketing_opt_in, consent_version, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
          .bind(id, email, signupEvent.id, fields.riderName, fields.phone, fields.experience, fields.bike, fields.notes, optedIn ? 1 : 0, optedIn ? consentVersion : null, createdAt),
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
    const text = `Event request: ${signupEvent.title}, ${signupEvent.dateLabel}\n\nRider: ${fields.riderName}\nEmail: ${fields.email}\nPhone: ${fields.phone}\nExperience: ${fields.experience}\nBike: ${fields.bike || 'Not provided'}\n\nNotes:\n${fields.notes || 'None'}\n\nThis is a registration request, not a confirmed booking.`;
    const escaped = text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    try {
      await env.EMAIL.send({ from: 'post@clubranchmx.com', to: 'mxjj17@gmail.com', replyTo: fields.email, subject: `${signupEvent.title} signup request — ${signupEvent.dateLabel}`, text, html: `<div style="white-space:pre-wrap">${escaped}</div>` });
      await env.DB.prepare("UPDATE registrations SET notification_status = 'accepted' WHERE id = ?").bind(id).run();
    } catch {
      console.error('training_signup_delivery_failed');
      try { await env.DB.prepare("UPDATE registrations SET notification_status = 'failed' WHERE id = ?").bind(id).run(); } catch { console.error('training_signup_notification_status_failed'); }
    }
    // Transactional acknowledgment is independent of marketing consent and staff notification.
    // Enable only after the sending domain can send to arbitrary rider addresses.
    if (env.RIDER_RECEIPTS_ENABLED === 'true') {
      const receipt = `Thanks for signing up for ${signupEvent.title}!\n\nDates: ${signupEvent.dateLabel}\nLocation: Club Ranch MX, 11021 Yellowstone Rd, Longmont, CO 80504\n\nWe received your registration request. Your place is not confirmed yet. The ranch team will contact you about availability and next steps.\n\nQuestions? Reply to this email or contact post@clubranchmx.com.\n\nClub Ranch MX`;
      const receiptHtml = receipt.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
      try {
        await env.DB.prepare("UPDATE registrations SET receipt_status = 'pending' WHERE id = ?").bind(id).run();
        await env.EMAIL.send({ from: 'post@clubranchmx.com', to: email, replyTo: 'post@clubranchmx.com', subject: `Request received: ${signupEvent.title}`, text: receipt, html: `<div style="white-space:pre-wrap">${receiptHtml}</div>` });
      } catch {
        console.error('training_signup_receipt_failed');
        try { await env.DB.prepare("UPDATE registrations SET receipt_status = 'failed' WHERE id = ?").bind(id).run(); } catch { console.error('training_signup_receipt_status_failed'); }
        return reply(200, `${savedMessage} We could not send your email acknowledgment; you do not need to submit again.`);
      }
      try { await env.DB.prepare("UPDATE registrations SET receipt_status = 'accepted' WHERE id = ?").bind(id).run(); } catch { console.error('training_signup_receipt_status_failed'); }
    }
    return reply(200, savedMessage);
  },
} satisfies ExportedHandler<Env>;
