# Owner Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private `/admin/` area where the ranch owner sees upcoming and past events with head counts and waiver status, prints a per-day check-in sheet, and runs week/month/year/custom reports. Riders can also tick "I already signed a {year} waiver" on signup.

**Architecture:**
- **Admin pages:** static Astro pages under `src/pages/admin/` that fetch JSON from new `GET /api/admin/*` routes.
- **Admin API:** served by the existing `club-ranch-training-signup` Worker over the existing D1 database.
- **Waiver and report logic:** lives in a pure module (`roster.ts`), so it is unit-testable without HTTP.
- **Auth:** Cloudflare Access sits in front of both `/admin*` and `/api/admin/*`. The Worker independently verifies the Access JWT and an email allowlist.

**Tech Stack:** Astro 7 (static), TypeScript, Cloudflare Workers + D1, WebCrypto (RS256 JWT verify), `node:test` with `node:sqlite`.

**Spec:** `docs/superpowers/specs/2026-11-03-owner-admin-design.md`

## Global Constraints

- No new npm dependencies and no new paid services. Keep Astro + Worker + D1.
- Admin is read-only: only `GET` is allowed on `/api/admin/*`; anything else gets 405.
- Every `/api/admin/*` response carries `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- Every `/admin/*` page carries `Cache-Control: no-store` and `X-Robots-Tag: noindex` (via `public/_headers`) plus `<meta name="robots" content="noindex, nofollow">`.
- **No rider PII in logs, in URLs beyond `event`/`date`/`from`/`to`, in `localStorage`, or in the static build.**
- Allowed admins: `mxjj17@gmail.com`, `jflsolutionsco@gmail.com`.
- Waiver season = calendar year of the event's first date. A waiver never crosses seasons.
- Rider identity = `lower(trim(email))` + `|` + name lower-cased, trimmed and whitespace-collapsed.
- Ranch timezone is `America/Denver` for "today", upcoming/past, and week boundaries (weeks run Mon–Sun).
- Run tests with `node --experimental-strip-types --test tests/` (local Node is 22.17).
- **Deviation from spec (builder's call):** `robots.txt` stays as is, with no `Disallow: /admin/`. The repo deliberately avoids Disallow so crawlers can read noindex (see the comment in `src/pages/robots.txt.ts`). The noindex header and meta cover it.

## Review Focus

1. **Rider-supplied text rendered in admin.** Names, notes and bike containing `<script>` or `<img onerror>` must show as text, never as HTML. Tested in Task 5 by rendering a row with markup through the shared renderer.
2. **The same parent email registering two kids.** They must stay two rows with independent waiver states. Tested in Task 2 (`siblings sharing an email are separate riders`).
3. **A forged or stale login.** A JWT that is expired, for the wrong AUD, wrongly signed, for a non-allowlisted email, or missing must get 403. `LOCAL_PREVIEW=true` must not open production hosts. Tested in Task 3.
4. **A rider who re-submits for the same event.** They appear once, with the latest details. An upload from the earlier submission still counts as on file. Tested in Task 2.
5. **Event ids in D1 that are no longer in `signupEvents`** (old events removed from the site). They must still appear under Past events and in reports, not crash or vanish. Tested in Task 2 (`orphan event ids fall back to created_at date`) and Task 4.

---

## File Structure

| File | Responsibility |
|---|---|
| `workers/training-signup/migrations/0004_waiver_claimed.sql` | new column |
| `src/data/signup-events.ts` | add `ranchToday()`, `eventSeason()` |
| `workers/training-signup/index.ts` | accept `waiverClaimed`, email copy, dispatch `/api/admin/*` |
| `workers/training-signup/roster.ts` | pure: identity, waiver rule, roster, report |
| `workers/training-signup/access.ts` | Access JWT verification |
| `workers/training-signup/admin.ts` | `/api/admin/*` HTTP handler |
| `workers/training-signup/wrangler.jsonc` | routes + vars |
| `src/components/TrainingSignup.astro` | the checkbox |
| `src/scripts/admin.ts` | shared client: `fetchAdmin`, safe DOM helpers, waiver label |
| `src/pages/admin/index.astro` | Events + Reports tabs |
| `src/pages/admin/roster.astro` | check-in sheet (screen + print) |
| `public/_headers`, `astro.config.mjs` | no-store/noindex; dev proxy for `/api/admin/` |
| `tests/helpers/env.mjs` | shared in-memory D1 harness (moved out of the signup test, adds `.all()`) |
| `tests/roster.test.mjs`, `tests/admin.test.mjs` | new tests |
| `workers/training-signup/README.md` | Access setup + admin docs |

---

### Task 1: "Already signed" checkbox end to end

**Files:**
- Create: `workers/training-signup/migrations/0004_waiver_claimed.sql`, `tests/helpers/env.mjs`
- Modify: `src/data/signup-events.ts`, `workers/training-signup/index.ts`, `src/components/TrainingSignup.astro`, `tests/training-signup.test.mjs`

**Interfaces:**
- Produces:
  - `ranchToday(now?: Date): string` (YYYY-MM-DD in America/Denver) and `eventSeason(event: SignupEvent): number`, from `src/data/signup-events.ts`. `acceptsSignups` uses `ranchToday`.
  - `environment(send?, allowed?)` from `tests/helpers/env.mjs`. It returns `{db, EMAIL, SIGNUP_LIMIT, DB}`; `DB.prepare(sql).bind(...).all()` returns `{results: rows}`, and it applies migrations 0001–0004.
  - Registration column `waiver_claimed INTEGER NOT NULL DEFAULT 0 CHECK (waiver_claimed IN (0,1))`.

- [ ] **Step 1:** Move `environment()` from `tests/training-signup.test.mjs` into `tests/helpers/env.mjs`:
  - Load every `migrations/*.sql` in sorted order.
  - Add `all: async () => ({ results: db.prepare(sql).all(...args) })` to the bound statement.
  - Import it back into the signup test. Run `node --experimental-strip-types --test tests/`. Expected: 18 pass.
- [ ] **Step 2: Write the failing tests** in `tests/training-signup.test.mjs`:
  - `'claimed waiver is stored and told to staff and rider'`. Post `{...valid(), waiverClaimed: true}` with receipts enabled, then:
    - `waiver_claimed === 1`.
    - The staff `sent.text` includes `Signed waiver: Rider says they already signed a 2026 waiver. Not verified; check the roster.`
    - The receipt text includes `You told us you already signed a 2026 waiver. If you're not sure, bring a signed copy.`
  - `'upload wins over claim in emails'`. Post a valid PDF waiver plus `waiverClaimed: true`. The staff text still includes `attached (`, and `waiver_claimed === 1`.
  - Add `{...valid(), waiverClaimed: 'yes'}` to the invalid-inputs list, expecting 400.
  - `'eventSeason uses the first event date'`: `eventSeason(rideDay('2027-01-09')) === 2027`.
- [ ] **Step 3:** Run the tests. Expected: the 4 new assertions FAIL.
- [ ] **Step 4: Implement.**
  - Migration `0004_waiver_claimed.sql` with the column above.
  - In the Worker:
    - Validate `data.waiverClaimed` as `undefined | boolean`. Anything else returns `reply(400, 'Invalid waiver answer.')`.
    - Bind it into the INSERT.
    - When `!signedWaiver && claimed`, the staff waiver line and the receipt waiver paragraph use the exact copy above, with `{year} = eventSeason(signupEvent)`.
  - In the form, add after `.waiver-upload`: `<label class="waiver-claim"><input type="checkbox" name="waiverClaimed"/><span>I already signed a {eventSeason(event)} waiver <em>Handed in at the track or uploaded before</em></span></label>`.
  - In the submit body, add `waiverClaimed: data.has('waiverClaimed')` after the spread.
  - Style it like `.signup-consent`.
- [ ] **Step 5:** Run the tests. Expected: all pass. Then run `npx tsc -p workers/training-signup/tsconfig.json` and `npm run build`. Expected: both clean.
- [ ] **Step 6: Commit** with the message `Add "already signed a waiver" checkbox to signup`.

### Task 2: Roster and report logic (pure)

**Files:**
- Create: `workers/training-signup/roster.ts`, `tests/roster.test.mjs`

**Interfaces:**
- Consumes: `signupEvents`, `eventSeason`, `ranchToday` from Task 1.
- Produces (all exported from `roster.ts`):
```ts
export type Row = { id: string; email: string; event_id: string; rider_name: string; phone: string; experience: string; bike: string; notes: string; created_at: string; waiver_status: 'none'|'pending'|'emailed'|'failed'; waiver_claimed: 0|1 };
export type EventInfo = { id: string; title: string; dates: string[]; time?: string; season: number; upcoming: boolean; listed: boolean };
export type Waiver = { kind: 'on_file'; fromEventId: string; fromDate: string } | { kind: 'claimed' } | { kind: 'missing' };
export type Rider = { key: string; name: string; display: string; phone: string; experience: string; bike: string; notes: string; waiver: Waiver };
export type Counts = { riders: number; onFile: number; claimed: number; missing: number };
export type Report = { from: string; to: string; totals: { events: number; signups: number; uniqueRiders: number; firstTimers: number; returning: number } & Omit<Counts,'riders'>; events: { event: EventInfo; riders: Rider[] }[] };
export function riderKey(email: string, name: string): string;
export function displayName(name: string): string;           // "Ana Maria Lopez" -> "Lopez, Ana Maria"; "Cher" -> "Cher"
export function eventCatalog(rows: Row[], today: string): Map<string, EventInfo>;
export function roster(eventId: string, rows: Row[], events: Map<string, EventInfo>): Rider[];
export function counts(riders: Rider[]): Counts;              // onFile+claimed+missing === riders
export function report(from: string, to: string, rows: Row[], events: Map<string, EventInfo>): Report;
```
- `eventCatalog` contains every event in `signupEvents` (`listed: true`) plus any `event_id` in the rows that isn't listed (`listed: false`). An unlisted event has title = its id, `dates` = [the Denver date of its earliest `created_at`], and `season` = the year of that date. `upcoming` means the last date is on or after `today`.
- `roster` works like this:
  - Rows for the event are grouped by `riderKey`. Each rider shows the latest `created_at` row's fields.
  - The waiver rule is spec §"Waiver status per rider", checked against every row with the same key whose event has the same season. `on_file` picks the earliest such event date.
  - Riders are sorted by `display`, compared with `localeCompare(…, 'en', {sensitivity:'base'})`.
- `report` covers events whose first date falls within `[from, to]`, sorted by date:
  - `signups` = the sum of roster lengths.
  - `uniqueRiders` = distinct keys.
  - `firstTimers` = keys whose minimum first-date across **all** rows/events falls in range.
  - `returning` = `uniqueRiders - firstTimers`.
  - The waiver totals count each unique rider once, using their state in their latest event within the range.

- [ ] **Step 1: Write the failing tests** in `tests/roster.test.mjs`. Build rows with a small `row({...})` factory, defaulting `waiver_status:'none'`, `waiver_claimed:0`.
  - `displayName`: `'Kyle Anderson'→'Anderson, Kyle'`, `'  ana  maria lopez '→'lopez, ana maria'`, `'Cher'→'Cher'`.
  - `'upload at an earlier event is on file later in the season'`:
    - The rider uploaded (`emailed`) for `imondi-2026-11-04` and has no upload for `ride-day-2026-11-08`.
    - On the Nov 8 roster, `waiver` deep-equals `{kind:'on_file', fromEventId:'imondi-2026-11-04', fromDate:'2026-11-04'}`.
  - `'waiver does not cross seasons'`:
    - An upload on an unlisted 2025 event (row `created_at:'2025-06-01T18:00:00Z'`, `event_id:'old-2025'`).
    - On the Nov 8 roster, the waiver is `missing`.
  - `'claim shows as claimed, failed upload is missing, pending is missing'`.
  - `'siblings sharing an email are separate riders'`: same email, names `Mia Baker` and `Leo Baker`, one emailed and one none. The roster has 2 riders with different waiver kinds.
  - `'resubmission shows once with latest details'`:
    - Two rows for the same rider and event: the older one has `bike:'85'` and `waiver_status:'emailed'`, the newer one has `bike:'125'`.
    - The roster has 1 rider with `bike === '125'` and waiver `on_file`.
  - `'orphan event ids fall back to created_at date'`: `eventCatalog` contains `'old-2025'` with `listed:false`, `dates:['2025-06-01']` and `upcoming:false`.
  - `'report totals'`, with rows across Nov 4, Nov 8 and Nov 21:
    - One rider attends Nov 4 and Nov 8 and first rode on Oct 25 (an unlisted event).
    - One new rider is on Nov 8 only.
    - `report('2026-11-02','2026-11-08', …)` gives totals `{events:2, signups:3, uniqueRiders:2, firstTimers:1, returning:1}`, and the Nov 21 event is excluded.
  - `counts` sums: `onFile + claimed + missing === riders`.
- [ ] **Step 2:** Run `node --experimental-strip-types --test tests/roster.test.mjs`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `roster.ts` to the interfaces above. Get the Denver date of `created_at` with `new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Denver'})`.
- [ ] **Step 4:** Run the tests. Expected: all pass. Then run `npx tsc -p workers/training-signup/tsconfig.json`. Expected: clean.
- [ ] **Step 5: Commit** with the message `Add roster, waiver-on-file and report logic`.

### Task 3: Access JWT verification

**Files:**
- Create: `workers/training-signup/access.ts`, tests in `tests/admin.test.mjs`
- Modify: `workers/training-signup/wrangler.jsonc` (vars), `worker-configuration.d.ts` (run `npx wrangler types --config workers/training-signup/wrangler.jsonc workers/training-signup/worker-configuration.d.ts`, or add the three vars by hand)

**Interfaces:**
- Produces: `verifyAccess(request: Request, env: Env): Promise<string | null>` resolves to the allowed admin's lower-cased email, or null.
- Env vars:
  - `ACCESS_TEAM_DOMAIN`, e.g. `"<team>.cloudflareaccess.com"`.
  - `ACCESS_AUD`, the application AUD tag.
  - `ADMIN_EMAILS`, set to `"mxjj17@gmail.com,jflsolutionsco@gmail.com"`.
- Placeholders in `wrangler.jsonc` are `ACCESS_TEAM_DOMAIN: ""` and `ACCESS_AUD: ""`. **An empty value means everything is denied.**

- [ ] **Step 1: Write the failing tests** in `tests/admin.test.mjs`:
  - **Test setup:**
    - Generate an RS256 key pair with `crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'}, true, ['sign','verify'])`.
    - Export the public JWK with `kid:'k1'`.
    - Stub `globalThis.fetch`: for `https://team.example/cdn-cgi/access/certs`, return `{keys:[jwk]}`.
    - Use a helper `jwt(claims, {kid='k1', key=private})` that builds header.payload.signature in base64url.
  - **Default env:** `{ACCESS_TEAM_DOMAIN:'team.example', ACCESS_AUD:'aud1', ADMIN_EMAILS:'mxjj17@gmail.com,jflsolutionsco@gmail.com', LOCAL_PREVIEW:'false'}`.
  - **Default good claims:** `{aud:['aud1'], iss:'https://team.example', email:'JFLSolutionsCo@gmail.com', exp:now+600}`.
  - `'valid Access token returns the admin email'`: the request carries header `Cf-Access-Jwt-Assertion: <jwt>`. The result is `'jflsolutionsco@gmail.com'`.
  - `'rejects missing, expired, wrong aud, wrong issuer, unlisted email, bad signature, unknown kid'`. Each returns null.
  - `'empty ACCESS_AUD denies'`. Returns null.
  - `'LOCAL_PREVIEW only bypasses on localhost'`. With `LOCAL_PREVIEW:'true'` and no token:
    - URL `http://127.0.0.1:8787/api/admin/events` → `'local@preview'`.
    - URL `https://clubranchmx.com/api/admin/events` → null.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement:
  - Decode the header and payload, and find the JWK by `kid`.
  - Verify with `crypto.subtle.importKey('jwk', …, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['verify'])`.
  - Check `aud` (string or array) includes `ACCESS_AUD`, `iss === 'https://' + ACCESS_TEAM_DOMAIN`, `exp > now` and `nbf <= now` when present, and that the email is in the allowlist (case-insensitive).
  - Cache the certs in module scope for 10 minutes, refetching once when a `kid` is unknown.
  - Any thrown error resolves to null.
- [ ] **Step 4:** Run the tests and `tsc`. Expected: all pass, clean.
- [ ] **Step 5: Commit** with the message `Verify Cloudflare Access tokens for admin API`.

### Task 4: Admin API

**Files:**
- Create: `workers/training-signup/admin.ts`
- Modify: `workers/training-signup/index.ts` (dispatch), `workers/training-signup/wrangler.jsonc` (routes `clubranchmx.com/api/admin/*` and `www.clubranchmx.com/api/admin/*`), `tests/admin.test.mjs`

**Interfaces:**
- Consumes: `verifyAccess` (Task 3), and `eventCatalog`, `roster`, `counts`, `report` (Task 2).
- Produces: `handleAdmin(request: Request, env: Env): Promise<Response>`. `index.ts` calls it when `pathname.startsWith('/api/admin/')`, before the existing signup path check. JSON shapes:
  - `GET /api/admin/events` → `{ today: string, events: (EventInfo & { counts: Counts })[] }`. Upcoming events come first in ascending date order, then past events in descending order.
  - `GET /api/admin/roster?event=<id>&date=<YYYY-MM-DD>` → `{ event: EventInfo, date: string, counts: Counts, riders: Rider[] }`.
    - `date` defaults to `event.dates[0]`.
    - Unknown event → 404 `{message:'Event not found.'}`.
    - A date not in `event.dates` → 400.
  - `GET /api/admin/report?from=&to=` → `Report`. A non-ISO date, `from > to`, or a span longer than 400 days → 400.
  - Every response: `Cache-Control: no-store`, `X-Robots-Tag: noindex`. No token → 403 `{message:'Please sign in again.'}`. A non-GET → 405. An unknown `/api/admin/*` path → 404.
  - The handler loads rows once per request with `SELECT id,email,event_id,rider_name,phone,experience,bike,notes,created_at,waiver_status,waiver_claimed FROM registrations`. That is fine at this volume (hundreds of rows a year).

- [ ] **Step 1: Write the failing tests** in `tests/admin.test.mjs`. Use the `environment()` harness plus the Task 3 env vars and a valid token. Seed rows by POSTing real signups through `worker.fetch` where practical, otherwise by inserting directly.
  - `'events lists upcoming with counts and keeps orphan events under past'`.
  - `'roster for a two-day event accepts each date and rejects others'`:
    - The Chisholm event returns 200 for `date=2026-11-22`.
    - It returns 400 for `date=2026-11-23`.
  - `'report validates range'`: `from=2026-11-09&to=2026-11-01` → 400, and `from=bad` → 400.
  - `'admin responses are no-store and noindex; POST is 405; no token is 403 and reads nothing'`. For the 403 case, `DB.prepare` must throw if called.
  - `'signup route is unchanged'`: an existing signup POST still returns 200.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `admin.ts` and the dispatch.
- [ ] **Step 4:** Run `node --experimental-strip-types --test tests/` and `tsc`. Expected: all pass, clean.
- [ ] **Step 5: Commit** with the message `Add read-only admin API for events, rosters and reports`.

### Task 5: Admin pages and printable check-in sheet

**Files:**
- Create: `src/scripts/admin.ts`, `src/pages/admin/index.astro`, `src/pages/admin/roster.astro`
- Modify: `public/_headers`, `astro.config.mjs` (add `"/api/admin/": "http://127.0.0.1:8787"` to the proxy)
- Test: extend `tests/admin.test.mjs` with the renderer test below

**Interfaces:**
- Consumes: the Task 4 JSON shapes. Copy the TS types with `import type` from `workers/training-signup/roster.ts`.
- Produces (all from `src/scripts/admin.ts`):
  - `fetchAdmin<T>(path: string): Promise<T>`. On 403 it throws `AdminAuthError`. The UI then shows "Your login expired. [Sign in again]", with the link reloading the page.
  - `el(tag, props?, ...children)`. A DOM builder that only ever sets `textContent` and attributes, **never `innerHTML`**.
  - `waiverLabel(w: Waiver, season: number, currentEventId: string): { text: string; tone: 'ok'|'claimed'|'missing' }`. It returns `'✔ on file'` or `'✔ on file (Nov 4)'` (the latter when `fromEventId` differs from the current event), `'☑ rider says signed'`, or `'✖ NEEDS PAPER'`.
  - `shortDate(iso) → 'Nov 4'`, `longDate(iso) → 'Sunday, November 8, 2026'`.

Page behavior, following spec §Goals and the approved mockup A:

- **`/admin/` → Events tab.**
  - Two sections: "Upcoming" (cards) and "Past" (compact rows).
  - Each card shows the title, `longDate` + `time`, and "N riders · X waivers on file · Y missing" (Y in red when > 0, with claimed counted separately as "Z rider says signed").
  - Card buttons: **Open roster** goes to `/admin/roster/?event=<id>`. There is **one Print button per date** ("Print check-in sheet" for one-day events, "Print Sat Nov 21" / "Print Sun Nov 22" for multi-day), each going to `/admin/roster/?event=<id>&date=<d>&print=1`.
  - Header: club logo, "Admin", tabs **Events | Reports** (buttons with `aria-selected`; `#reports` in the hash selects Reports), and **Log out**, which links to `/cdn-cgi/access/logout`.
- **`/admin/` → Reports tab.**
  - Preset buttons: This week (Mon–Sun containing today, Denver), This month, This year, Custom (two `<input type="date">` + Apply).
  - Totals tiles: Events, Signups, Unique riders, First-timers, Returning, Waivers on file / says signed / missing.
  - Below them, per event: a heading and a simple table with Rider (Last, First), Phone, Level, Bike, Waiver.
  - A **Print report** button calls `window.print()`, using a print stylesheet that hides the tabs and controls.
- **`/admin/roster/`.**
  - The screen view is the check-in sheet with a **Print** button and **Back to events**.
  - With `print=1`, it calls `window.print()` once the data renders.
  - **Sheet layout** (from the spec):
    - A header with "CLUB RANCH MX", the event title, `longDate(date)` · time, and "N riders" on the right with "X waivers on file · Y need paper waiver".
    - Columns: ✓ In (empty 14px box) · Rider · Phone · Level · Bike · Waiver {season} · Notes.
    - Notes are cut to 40 characters plus "…" on paper only; the screen shows them in full.
    - Missing rows get `background:#fde8e6` with `print-color-adjust: exact`.
    - 8 blank rows at the end.
    - A footer line: "Sorted by last name · printed {now, Denver}".
  - Print CSS: `@page { size: letter landscape; margin: 0.4in }`. Hide everything except the sheet, use 11px body text, and repeat the table header on each page (`thead { display: table-header-group }`).
- **All admin pages:** `<meta name="robots" content="noindex, nofollow">`, the site fonts and `global.css` tokens, and a usable layout at 390px wide.
- **`_headers`:**
```
/admin/*
  Cache-Control: no-store
  X-Robots-Tag: noindex
```

- [ ] **Step 1: Write the failing test** `'admin renderer never interprets rider text as HTML'` in `tests/admin.test.mjs`:
  - Import `waiverLabel` from `src/scripts/admin.ts`.
  - **Keep `admin.ts` free of top-level DOM access so it imports under Node.**
  - Assert `waiverLabel({kind:'on_file',fromEventId:'a',fromDate:'2026-11-04'}, 2026, 'b').text === '✔ on file (Nov 4)'`. This means `waiverLabel` takes the current event id as its 3rd parameter.
  - Assert `waiverLabel({kind:'missing'},2026,'b').tone === 'missing'`.
  - Assert the `el` source in `src/scripts/admin.ts` contains no `innerHTML`, via `readFileSync` + `doesNotMatch(/innerHTML/)`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `src/scripts/admin.ts` and both pages.
- [ ] **Step 4:** Run `node --experimental-strip-types --test tests/` and `npm run build`. Expected: all pass, and the build emits `dist/admin/index.html` and `dist/admin/roster/index.html` with no rider data in them (`grep -c "@" dist/admin/*/index.html dist/admin/index.html` shows only static strings).
- [ ] **Step 5: Manual check against local D1.**
  1. Run `npx wrangler d1 migrations apply club-ranch-riders --config workers/training-signup/wrangler.jsonc --local`.
  2. Seed about 6 riders via the local form. Include a sibling pair, one upload, one claim and one with `<b>notes</b>`.
  3. Run `npm run signup:dev` with `.dev.vars` `LOCAL_PREVIEW=true`, plus `npm run dev`.
  4. In Playwright, open `http://127.0.0.1:4321/admin/`. The dev proxy forwards to `127.0.0.1:8787`, so `verifyAccess` bypasses.
  5. Screenshot the Events tab, the Reports tab (This month), and a roster at 1440px and at 390px.
  6. Emulate print media for the roster and screenshot it.
  7. **Expected:** the notes show literally as `<b>notes</b>`, the missing row is red, and the sheet fits on one landscape page for 6 riders + 8 blank rows.
- [ ] **Step 6: Commit** with the message `Add owner admin pages and printable check-in sheet`.

### Task 6: Docs and rollout

**Files:**
- Modify: `workers/training-signup/README.md`

- [ ] **Step 1:** Add an "Owner admin" section to the README. It covers:
  - URLs.
  - Who can log in.
  - The waiver rule in one paragraph.
  - **Access setup steps:**
    1. Zero Trust → choose the team domain (a payment method may be requested; the plan is Free).
    2. Settings → Authentication → One-time PIN enabled.
    3. Access → Applications → Self-hosted. Name it "Club Ranch Admin", with domains `clubranchmx.com/admin`, `clubranchmx.com/api/admin`, `www.clubranchmx.com/admin`, `www.clubranchmx.com/api/admin` and a 30-day session.
    4. Policy "Owners": Allow, Emails = the two addresses.
    5. Copy the AUD into `ACCESS_AUD` and the team domain into `ACCESS_TEAM_DOMAIN`.
  - Logout URL.
  - The fact that an empty `ACCESS_AUD` locks the admin API.
- [ ] **Step 2: Rollout, in order. Each step needs the user's go-ahead because it is production.**
  1. Run `npx wrangler d1 migrations apply club-ranch-riders --config workers/training-signup/wrangler.jsonc --remote`.
  2. **The user** completes Access steps 1–2 and sends the team domain. The builder creates the application and policy by API if the token permits, otherwise the user follows steps 3–4. Then fill in the vars.
  3. Run `npm run signup:deploy`.
  4. Run `npm run pages:deploy`.
  5. Verify from a logged-out terminal:
     - `curl -s -o /dev/null -w "%{http_code}" https://clubranchmx.com/api/admin/events` gives 302 or 403, **never 200**.
     - `/admin/` redirects to the Access login.
  6. The user logs in with `jflsolutionsco@gmail.com` and prints the Nov 4 sheet.
- [ ] **Step 3: Commit** with the message `Document owner admin and Access setup`.
