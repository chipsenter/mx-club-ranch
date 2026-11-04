# Owner admin: rosters, waivers and reports

Date: 2026-11-03 · Status: draft for approval

## Why

The ranch owner needs two things before and on every event day:

1. **A head count the day before**, so they know who is coming.
2. **A check-in sheet at the gate**, so every rider is checked in and nobody rides without a signed waiver for the current season.

Today registrations only land in the owner's inbox one email at a time, and the only way to see them together is the Cloudflare D1 console. Waiver files are emailed, never stored, so nobody can tell at a glance who already has a waiver on file.

Success: the night before an event the owner logs in, taps one button and prints a clean sheet. The sheet shows every registered rider, sorted by last name, with a check-in box and an unmistakable flag on anyone who still needs a waiver.

## Goals

- Private admin area at `clubranchmx.com/admin/`, usable on a phone or laptop, that only the two approved people can open.
- **Events view** (the landing screen; layout "A" chosen by the user): upcoming events as cards, then past events below.
  - Each card shows the title, date and time, rider count, waivers on file, and waivers missing.
  - Each card has **Open roster** and **Print check-in sheet**.
- **Printable check-in sheet**, approved mockup: `.superpowers/brainstorm/44672-1793765625/content/admin-layout.html`, lower half.
  - Header: "CLUB RANCH MX", the event title, the date and time, and on the right the rider count plus "N waivers on file · M need paper waiver".
  - Columns: ✓ In (empty box) · Rider (Last, First) · Phone · Level · Bike · Waiver 2026 · Notes.
  - Sorted by last name. A rider missing a waiver gets a red-tinted row and "✖ NEEDS PAPER".
  - About 8 blank rows at the bottom for walk-ups.
  - Prints cleanly on US Letter, landscape. No site header, footer or buttons on paper.
- **Waiver on file across the season.** One signed waiver covers the whole season (`waiver.season` in `src/data/waiver.ts`, currently 2026). This is the user's rule.
- **New checkbox on the signup form:** "I already signed a 2026 waiver", for riders who handed in paper at the track. The label year comes from `waiver.season`.
- **Reports tab** (the owner's call is "totals plus who rode"; the specific totals are Claude's call):
  - Presets: This week (Mon–Sun) · This month · This year · Custom from/to. Dates are event dates in America/Denver.
  - Totals: events, rider signups, unique riders, first-timers vs returning, waivers on file vs missing.
  - Below the totals, a printable list of who signed up, grouped by event.

## Non-goals

- Payments, pricing or revenue.
- Editing, deleting or confirming registrations from the admin. It is read-only; corrections still go through the D1 console.
- Tap-to-check-in on a phone. The paper sheet is the check-in.
- Storing waiver files. They stay email-only, as today.
- Email campaigns or exports of the marketing audience.

## Anti-goals (failure even if it "works")

- Rider names, phones or notes reachable by anyone other than the two approved emails, or cached by a browser, CDN or search engine.
- A rider marked "on file" when no waiver actually reached the ranch, or the sheet hiding the difference between "we received it" and "rider says so".
- A sheet that needs fiddling (zoom, cut-off columns, two pages for 25 riders) before it prints right.

## Who can log in

Two email addresses, the user's decision:

- `mxjj17@gmail.com` (owner; already the signup notification inbox)
- `jflsolutionsco@gmail.com` (site operator)

**Mechanism (Claude's call): Cloudflare Access (Zero Trust).** One self-hosted application covers `clubranchmx.com/admin*` and `clubranchmx.com/api/admin/*`, plus the `www.` host. The identity method is the built-in One-time PIN (an email code), and the policy allows exactly those two emails. The session lasts 30 days, so the owner isn't re-entering codes daily. Zero Trust is free at this size; if the account has no Zero Trust org yet, the builder creates one. There are no passwords or user tables in our code.

Defense in depth: the Worker independently verifies the `Cf-Access-Jwt-Assertion` header on every `/api/admin/*` request. It checks the signature against the team's certs, the application AUD, and expiry, and checks that the email is in an allowlist held in a Worker var. Anything else gets 403. That way a misconfigured Access policy alone can't leak data. The team domain and AUD go in Worker vars.

## How it is built (existing stack)

The site is a static Astro build on Cloudflare Pages. The signup API is the Worker `workers/training-signup` with D1 database `club-ranch-riders`. Both stay as they are.

- **Admin UI:** static Astro pages under `src/pages/admin/`, with `noindex`, kept out of the sitemap, and no data baked in at build time. Client-side script fetches JSON from the admin API and renders. It reuses the site's fonts and tokens. The print view is the roster page with a print stylesheet (`@media print`, `@page { size: letter landscape }`), not a separate PDF.
- **Admin API:** same Worker, same D1 binding. Add Worker routes `clubranchmx.com/api/admin/*` and `www.clubranchmx.com/api/admin/*`. Only `GET` is used, and every response has `Cache-Control: no-store`.
  - `GET /api/admin/events`: every event in `signupEvents` plus any `event_id` found in `registrations`, each with title, dates, time, upcoming/past, and counts (riders, on file, missing).
  - `GET /api/admin/roster?event=<id>`: the roster rows for one event.
  - `GET /api/admin/report?from=YYYY-MM-DD&to=YYYY-MM-DD`: totals plus rows grouped by event, for events whose first date falls in the range.
- `_headers`: `/admin/*` gets `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- `robots.txt`: disallow `/admin/`.

### Data change

Migration `0004_waiver_claimed.sql`: `ALTER TABLE registrations ADD COLUMN waiver_claimed INTEGER NOT NULL DEFAULT 0 CHECK (waiver_claimed IN (0,1));`

The signup API accepts an optional boolean `waiverClaimed` and stores it. Older rows default to 0. Apply the migration remotely **before** deploying the Worker.

### Waiver status per rider (the rule the sheet shows)

A rider is identified by **lower-cased email + normalized rider name**. Normalize by trimming, collapsing whitespace and lower-casing. This is because parents register several kids under one email. For a given registration, look at every registration by the same rider for an event in the waiver season. An event's season is the year of its first date; for an `event_id` no longer in `signupEvents`, use the year of `created_at`. Then, in this order:

1. Any of them has `waiver_status = 'emailed'` → **✔ on file**. If that upload came with an earlier event, the sheet says which, e.g. "✔ on file (Nov 4)".
2. Otherwise, any of them has `waiver_claimed = 1` → **☑ rider says signed**. Normal row, not red, but visibly different from ✔.
3. Otherwise → **✖ NEEDS PAPER** (red row). This includes `none`, `failed` and stale `pending`.

Existing riders who already uploaded a 2026 waiver are therefore "on file" the moment this ships, with no backfill.

**Season boundary (Claude's call):** the season is the calendar year of the event's first date, on both sides of the match. A 2026 upload or claim never covers a 2027 event. The sheet's column header and the form checkbox label use the event's year, not the fixed `waiver.season`. For example, a January 2027 event shows "Waiver 2027" and "I already signed a 2027 waiver". Publishing the 2027 PDF stays a manual task (see `src/data/waiver.ts`).

### The "already signed" checkbox (Claude's call)

- It sits in the waiver section of step 3, under the upload control. It's independent of the upload, so both can be ticked or used. Unticked by default.
- When it's ticked and no file is uploaded:
  - The staff email's waiver line reads "Rider says they already signed a {year} waiver. Not verified; check the roster."
  - The rider's receipt reads "You told us you already signed a {year} waiver. If you're not sure, bring a signed copy."
- An upload always takes precedence in emails, which keep their current wording.
- Update the email assertions in the existing tests accordingly.

### Roster details

- **Multi-day events get one sheet per day** (the user's decision). For example, Train with Chisholm, Nov 21–22, has one registration covering both days.
  - Its card shows one print button per date ("Print Sat Nov 21", "Print Sun Nov 22").
  - The roster API takes an optional `date` that only changes the sheet header. The riders are the same both days, with fresh check-in boxes.
  - An event stays under "Upcoming" until its last date has passed in America/Denver.

- If the same rider (by the identity above) has several registrations for the same event, show them once, using the latest submission's phone, level, bike and notes.
- Name display: "Last, First…". Last name is the final whitespace-separated word, and sorting is by that, then first name. Single-word names sort by that word.
- Notes are truncated on paper to fit one line, about 40 characters, with full text on screen.

### Reports details

- **First-timer (Claude's call):** a rider (same identity) whose earliest event date, across every registration in the database, falls inside the selected range. The comparison uses event dates, not submission time, and covers all seasons and any orphaned event ids. Everyone else in range is returning.
- **Unique riders:** distinct identities across the range. **Rider signups:** distinct (identity, event) pairs.
- Waiver totals use the same rule as the sheet, counting each unique rider once.

## Constraints

- No new paid services and no new frameworks. Keep the Astro + Worker + D1 setup.
- PII never in logs, URLs (beyond event id and dates), browser storage, or the public build.
- Must work in Safari on iPhone and print from desktop Chrome and Safari.
- Existing signup behaviour, emails and tests keep passing; extend `tests/training-signup.test.mjs` for the new checkbox and the admin API. That includes JWT rejection, the waiver rule, de-duplication and first-timer counting.
- Local dev: when `LOCAL_PREVIEW=true`, the Worker may skip the Access JWT check so the admin can be exercised against local D1. Production must never skip it.

## Left to the builder

- Exact visual styling within the site's existing design tokens, and the layout of the Reports tab, as long as it follows mockup A's spirit: cards for events, a tab for reports.
- Empty and loading states, and the error message when the API returns 403. Suggest logging in again.
- Whether the admin pages share one Astro page with client-side tabs or are separate pages.
- How to set up Access: dashboard, API or Terraform. Record the steps in `workers/training-signup/README.md`.

## Rollout

The user turns on Zero Trust themselves in the Cloudflare dashboard. That covers choosing the team domain and adding a payment method if Cloudflare asks; the user's decision. The builder writes them short step-by-step instructions, then does everything else.

1. Apply migration 0004 to remote D1.
2. **Hand-off:** the user enables Zero Trust and tells the builder the team domain. The builder then creates the Access application and policy (by API if the token allows, otherwise more steps for the user), and sets the Worker vars for team domain, AUD and allowlist.
3. Deploy the Worker.
4. Deploy Pages.
5. The user tests by logging in with `jflsolutionsco@gmail.com` and printing the Nov 4 sheet.
