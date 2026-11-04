# Training signup

The Astro form posts to `/api/training-signup/`. A separate Cloudflare Worker handles that route on the two production domains. Pages preview domains do not have this endpoint.

The Worker validates and limits requests, then stores the registration before attempting an inbox notification. A saved registration remains successful even if the notification fails. Recipient and event are fixed on the server. No payment or reservation is created. No rider details are logged or stored in browser storage. Rate limiting is per Cloudflare location, not a global quota.

## Local review

Run `npm run signup:dev` and `npm run dev`. Create `workers/training-signup/.dev.vars` with `LOCAL_PREVIEW=true` to allow the local Astro proxy. Email is simulated locally and is not delivered. The local compatibility-date override matches the installed runtime; production uses the configuration date.

## Checks

- `node --experimental-strip-types --test 'tests/*.test.mjs'`
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

## Liability waiver

The review step offers the season waiver PDF (`public/waivers/clubranchmx-waiver-2026.pdf`) and an optional upload of a signed copy. The PDF is rendered from `scripts/waiver/clubranchmx-waiver-2026.html` with headless Chrome (print to PDF, Letter, no header/footer). For a new season, copy the HTML, change the year, render the PDF, and update `src/data/waiver.ts`.

An uploaded waiver (PDF, JPEG, PNG, WebP or HEIC, up to 8 MB, checked by file signature) is attached to the staff notification email only; it is never stored in D1 or elsewhere, so the inbox is the record. `waiver_status` is none/pending/emailed/failed. If the attachment is rejected, staff still receive the signup without it, and the rider is told to bring a paper copy. Apply migration 0003 before deploying.

## Owner admin

`https://clubranchmx.com/admin/` lists upcoming and past events with rider counts and waiver status, prints a per-day check-in sheet (US Letter, landscape), and runs week/month/year/custom reports. It is read-only: corrections still go through the D1 console.

Pages are static (`src/pages/admin/`) and contain no rider data. They read `GET /api/admin/events/`, `/api/admin/roster/?event=&date=` and `/api/admin/report/?from=&to=` from this Worker. Every admin response is `no-store` and `noindex`.

**Who can log in:** `mxjj17@gmail.com` and `jflsolutionsco@gmail.com`. They're kept in two places: the Access policy, and the Worker's `ADMIN_EMAILS` variable.

**Waiver rule:**
- A rider is one email plus one name, so siblings stay separate.
- One waiver covers every event in the calendar year of the event's first date.
- ✔ on file: a waiver upload for any event that season reached the ranch inbox (`waiver_status = 'emailed'`).
- ☑ rider says signed: the rider ticked "I already signed a {year} waiver" (`waiver_claimed = 1`). Unverified.
- Anything else is ✖ NEEDS PAPER.

### Cloudflare Access setup (one time)

1. Cloudflare dashboard → **Zero Trust**. Choose a team name; that gives you the team domain `<team>.cloudflareaccess.com`. Pick the Free plan. Cloudflare may ask for a payment method, but it isn't charged on Free.
2. **Settings → Authentication → Login methods.** Make sure **One-time PIN** is enabled.
3. **Access → Applications → Add → Self-hosted:**
   - Name: `Club Ranch Admin`.
   - Session duration: 30 days.
   - Add these four destinations: `clubranchmx.com/admin`, `clubranchmx.com/api/admin`, `www.clubranchmx.com/admin`, `www.clubranchmx.com/api/admin`.
4. Add a policy:
   - Name: `Owners`.
   - Action: Allow.
   - Include → Emails: `mxjj17@gmail.com`, `jflsolutionsco@gmail.com`.
5. Open the application's **Overview** and copy the **Application Audience (AUD) Tag**. In `wrangler.jsonc`, set:
   - `ACCESS_AUD` to that tag.
   - `ACCESS_TEAM_DOMAIN` to `<team>.cloudflareaccess.com`.
6. Apply the migration: `npx wrangler d1 migrations apply club-ranch-riders --config workers/training-signup/wrangler.jsonc --remote`.
7. Deploy: `npm run signup:deploy`, then `npm run pages:deploy`.
8. Check from a logged-out terminal: `curl -s -o /dev/null -w "%{http_code}" https://clubranchmx.com/api/admin/events/`. It must print `302` or `403`, never `200`.

Logging out is at `/cdn-cgi/access/logout`. If `ACCESS_AUD` or `ACCESS_TEAM_DOMAIN` is empty, the admin API refuses everyone.

### Local admin

Run `npm run signup:dev`. It passes `--local-upstream 127.0.0.1:8787`, so the localhost bypass works. Then run `npm run dev` and open `http://127.0.0.1:4321/admin/`. With `LOCAL_PREVIEW=true` in `.dev.vars`, the admin skips Access on localhost only. Apply migrations locally with `--local` first.
