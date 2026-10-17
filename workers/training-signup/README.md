# Training signup

The Astro form posts to `/api/training-signup/`. A separate Cloudflare Worker handles that route on the two production domains. Pages preview domains do not have this endpoint.

The Worker validates and limits requests, then stores the registration before attempting an inbox notification. A saved registration remains successful even if the notification fails. Recipient and event are fixed on the server. No payment or reservation is created. No rider details are logged or stored in browser storage. Rate limiting is per Cloudflare location, not a global quota.

## Local review

Run `npm run signup:dev` and `npm run dev`. Create `workers/training-signup/.dev.vars` with `LOCAL_PREVIEW=true` to allow the local Astro proxy. Email is simulated locally and is not delivered. The local compatibility-date override matches the installed runtime; production uses the configuration date.

## Checks

- `node --experimental-strip-types --test tests/training-signup.test.mjs`
- `npx tsc -p workers/training-signup/tsconfig.json`
- `npm run build:production`

## Publish

Deploy the endpoint with `npm run signup:deploy`, then the website with `npm run pages:deploy`. Verify delivery with an authorized test to the fixed recipient before publishing the form. Keep `LOCAL_PREVIEW=false` in production. Verified recipient is mxjj17@gmail.com, the existing ranch forwarding inbox. No automatic email to riders is sent.

## Rider database and consent

D1 database `club-ranch-riders` stores every registration separately and one contact per normalized email address. Only Cloudflare account access and the Worker binding can query records; there is no public contact-list endpoint.

Apply schema with `npx wrangler d1 migrations apply club-ranch-riders --config workers/training-signup/wrangler.jsonc --remote` (use `--local` for development).

`event_email_audience` is a deduplicated view of opted-in addresses. `registrations` holds rider name, email, phone, experience, bike, notes, event, date, and the consent choice. `contacts` tracks consent date/version and suppression status. An unchecked box does not subscribe someone; a registration cannot reverse an existing unsubscribe. Submission UUIDs prevent accidental retries from creating duplicate records or email notifications.

Consent version `event-updates-v1` is the unchecked, optional checkbox: “Email me about upcoming Club Ranch MX events and training. Optional; unsubscribe at any time.” Registrants can contact post@clubranchmx.com to withdraw consent or request deletion. Store future wording changes as a new version.

Use the authenticated Cloudflare D1 console to view registrations. A notification marked `failed` or `pending` needs review; signup storage succeeds independently of inbox notifications. No automatic notification retry is installed.

Before campaigns, connect a marketing email provider with unsubscribe links, bounce suppression, and consent verification. Sync unsubscribes back to `contacts` (set `marketing_status='unsubscribed'` and `unsubscribed_at`). The audience view alone is not a full campaign system. Do not export phone numbers or private registration notes for email campaigns. No campaigns are sent by this application.

If a contact requests deletion, delete their registrations before deleting the contact because of the foreign key; preserve any minimum suppression record needed by the selected mailing provider to avoid re-adding an unsubscribed address.

## Reuse for another event

Edit `src/data/signup-events.ts`. Add a new entry with a unique permanent `id`, `title`, `dateLabel`, ISO `dates`, and `signupOpen`. Keep existing IDs: changing a name is fine for a correction, but a new event needs a new ID so historical registrations stay separate.

The homepage renders `TrainingSignup` for each currently open event and generates its calendar dates from the same settings. The component accepts `event` as a prop, supports multiple independent forms, and links to `#signup-EVENT_ID`. The API validates the event against the same configuration, labels the email, and stores its ID. The signup fields and email-consent behavior remain shared.

Set `signupOpen: false` to close an event early. Events automatically stop accepting requests after their final date in America/Denver. Publish both the Worker and website when changing the event list. Editorial announcements, posters, and videos in News are separate content and should be updated when announcing a new event.


## Rider acknowledgments

Cloudflare Email Sending was enabled for clubranchmx.com on October 16, 2026. `RIDER_RECEIPTS_ENABLED` is `true`; the binding allows only post@clubranchmx.com as sender and supports rider recipients. Apply migration 0002 before deploying. Local preview email remains simulated; do not enable remote email in local previews by default. Provider acceptance is not inbox-delivery confirmation.

Each new saved signup sends an acknowledgment to its normalized submitted email independently of marketing consent and the staff notification. The wording confirms receipt only, not a booked place. Duplicate request IDs do not resend. `receipt_status` records not_sent/pending/accepted/failed; accepted means provider acceptance, not inbox delivery. Historical signups are not automatically emailed. Failed sends require operator follow-up; no automatic retry is configured. Receipt messages deliberately omit user-supplied names and notes.
