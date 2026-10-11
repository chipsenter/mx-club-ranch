# Club Ranch MX
A simple, responsive motocross training website. Astro, TypeScript and Tailwind, matching jlsolutions-web. Static output for Cloudflare Pages.

## Local development
Use Node 22.19+ (Node 24 also works), then `npm ci`, `npm run dev`. Run `npm run build` for type checking and the production build, and `npm run preview` to review it.

## Content
Edit `src/data/site.ts`. Add hero photos to `public/images` and append to `heroSlides`. Upcoming and past events each accept a title, ISO date, description, image, imageAlt and optional URL. Text appears below each event image. Empty event arrays show honest coming-soon states.

Enter phone, email, address, Facebook, Instagram, directions URL and a Google Maps embed URL in `site`. Missing values never produce dead contact links or a made-up location.

## Training booking
Set `site.bookingUrl` to your real Cal.com or Calendly event URL. The site then enables the booking link. Optionally set a provider-approved `bookingEmbedUrl`; the inline calendar loads only after the visitor opens it. The provider manages live availability, capacity, timezone, confirmation and cancellations. No booking is stored in this static site.

`trainingSessions` is an optional public schedule, not the provider's live availability. Add a date (YYYY-MM-DD in the ranch timezone), time including timezone, title and verified HTTPS booking URL. The month calendar is navigable by buttons, Today and arrow keys. Past-date entries cannot be booked through schedule links. Never publish private calendar feeds, attendee data, credentials or unconfirmed availability.

## Cloudflare Pages
Build command: `npm run build`; output: `dist`; production branch: `main`; Node: 22.19+ (see `.node-version`). Connect chipsenter/mx-club-ranch through the Cloudflare Pages Git integration for automatic deployments. For manual deployment, authenticate with Wrangler and run `npm run pages:deploy`. This targets the MX project only, never jlsolutions-web.

Deployment is not implied by this configuration. Confirm a successful deployment URL before describing the site as live. Finish content and booking setup before launch.

## Assets
The original supplied logo stays at `IMG_6089.png`; the site uses an unchanged copy. It is a small image with a textured background and a visible image-search mark. Replace it with a clean, higher-resolution brand export when available.
Stock motocross photos are illustrative, not photos of Club Ranch MX. See `public/images/SOURCES.md`. Replace with owned ranch photography before launch.

## Launch checklist
- Real ranch photos and clean logo
- Verified contact/address/social/map details
- Booking provider configured and an end-to-end test booking completed
- Actual upcoming and past events
- Cloudflare Pages project, custom domain and production deployment

## Ranch swag
Edit `swagItems` in `src/data/site.ts` to update the merchandise showcase. The supplied hat and hoodie images are preserved in full. Prices, stock, checkout and ordering links are not configured; the site makes no availability claims.

## Event photos
Add gallery images to `public/images` and entries to `eventPhotos` in `src/data/site.ts`, including descriptive alt text, caption and original dimensions. Photos fill equal 4:3 carousel frames using cover cropping without distortion; opening a photo shows its full original image. The supplied Instagram URL is configured in `site.instagram` and appears in contact and footer.

The event photo gallery is a native horizontal scroll-snap carousel with touch/trackpad scrolling, previous/next controls, a counter, and keyboard arrows/Home/End. A single photo keeps both arrows disabled; adding entries to `eventPhotos` activates navigation automatically.

## News
Edit `latestNews` in `src/data/site.ts` to replace the top announcement, image and posting date. The posting date is distinct from the training date: the November MX School announcement has no confirmed event dates yet.


### Swag cart and photo viewer

`ShopSection.astro` renders merchandise from `swagItems` in `src/data/site.ts`. Each item needs a stable `id`. `src/scripts/experience.ts` handles cart quantities (1–10 per product), removal, local persistence under `club-ranch-mx-cart-v1`, storage validation, cross-tab updates and a session-only fallback when storage is blocked. No customer or payment information is collected. The saved cart is explicitly a wishlist; it does not reserve stock.

Checkout deliberately remains unavailable until the owner supplies real prices/currency, product variants and sizes, stock, fulfillment details, and a connected commerce account. A future checkout integration must obtain authoritative prices and inventory from that provider, map the stable product IDs to its variants, and create a real checkout there. Do not use browser-stored prices as payment authority or put private API keys in client code. Shipping/tax and order confirmation also need verification before sales open.

The photo viewer enhances existing full-size image links for event photos, news and swag. Event images can be navigated with arrows or keyboard; Escape restores focus. All imagery remains accessible without JavaScript. Full-page refinements live in `src/styles/experience.css`.

Validation for this pass: production build and Astro check; desktop/mobile layouts at 1440, 390 and 320px in both themes; cart add/update/remove/reload, malformed cart data and blocked storage; calendar/date interaction; photo and hero controls; mobile menu; theme persistence. Payments have not been connected or tested.

### Search and social metadata

`src/components/SeoHead.astro` supplies one descriptive title/description, Open Graph and Twitter metadata, and JSON-LD for Organization, WebSite and WebPage. Confirmed Colorado audience wording is visible in the training section. No unconfirmed address, event date, offer, price or rating is emitted as structured data.

Launch settings (see `.env.example`):

- Set `SITE_URL` to the **verified public HTTPS origin** after connecting the domain. Canonical, social-image URLs and schema identifiers all use this same origin. No localhost or preview-host canonical is generated by default.
- Set `SITE_INDEXABLE=true` only in the production build environment. Without it, HTML uses `noindex, follow`, the sitemap contains no URLs and robots.txt does not advertise it. Crawling remains allowed so search engines can read `noindex`. Cloudflare non-main branch previews also remain noindex; other preview platforms must keep `SITE_INDEXABLE=false` explicitly.
- Rebuild after changing either setting. These values are baked into static files; uploading a previous preview build would retain noindex.
- `/sitemap.xml` contains the homepage only: anchor sections are not separate pages. `/robots.txt` advertises the sitemap only for indexable builds. No artificial last-modified timestamp or priority is included.
- Run `npm run check:seo` after a preview build. For a production build, provide the same `SITE_URL` and run `npm run check:seo -- --indexable`.

Before enabling search on the actual domain: verify HTTPS and hostname redirects, that missing URLs return HTTP 404 with `404.html` (configure the CloudFront/custom-host error response accordingly), that robots/canonical/social assets resolve correctly, and that the page has no noindex tag. Then verify domain ownership in Google Search Console, submit `/sitemap.xml`, inspect the homepage, and validate the structured data on the live URL. Add the exact ranch address/contact details and appropriate local-business data once confirmed; the supplied city list is the audience area, not a physical address. Connect a Google Business Profile only with verified business/location details. Measure real mobile performance after deployment.

References: [Google developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

### Club Ranch MX deployment — October 10, 2026

- Hosting: Cloudflare Pages, direct upload project `mx-club-ranch`, production branch `main`.
- Production domain: `https://clubranchmx.com`. Both apex and `www` are active on the Pages project with HTTPS.
- Pages URL: `https://mx-club-ranch.pages.dev`; initial deployment: `https://aff6a6eb.mx-club-ranch.pages.dev`.
- `npm run build:production` sets the purchased domain and enables indexing, builds the site, and runs production SEO checks. `npm run pages:deploy` runs that checked build then uploads to Pages. Ordinary `npm run build` stays suitable for previews.
- CNAME `@` and CNAME `www` target `mx-club-ranch.pages.dev`, proxied with automatic TTL.
- A Cloudflare zone Redirect Rule sends HTTP/HTTPS `www.clubranchmx.com` requests to the HTTPS apex with status 301, preserving paths and queries. Pages `_redirects` does not support domain-level redirects.
- Deployment verified over HTTPS: Pages homepage 200, expected canonical and crawler files, missing URL 404. Custom-domain HTTPS and the www redirect were verified after activation.
- Direct upload does not automatically publish GitHub pushes. Run the deploy command for future releases; configure CI separately if desired.

### Welcome film

The owner-supplied ranch reel now leads the homepage through `WelcomeFilm.astro`, before News. Its MP4 is approximately 7.1 MB and uses the original H.264/AAC streams, with a preloaded JPEG poster. The full portrait frame is preserved. Mobile displays the recording before the welcome copy; desktop pairs them side by side. The prior illustrative hero carousel is replaced by this real footage; the event-photo carousel remains intact.

A compact, uncropped poster preview opens a larger native-dialog video player on click. The preview is capped at 280px wide on desktop and 240px on mobile. Playback with sound begins only after that click; native controls support pause, volume, seeking and fullscreen. Escape, the close button or the backdrop dismiss the player, pause playback and restore focus. Playback also pauses in a hidden tab. Without JavaScript, the preview links directly to the MP4. The video source is assigned only on opening; loading failures expose a direct-video fallback.

Header quick links (News, The ride, Shop) were removed; section links remain in the dropdown. The welcome video is deployed. The hero now groups it with two matching photo panels, with introductory copy and actions below; News remains separate.
