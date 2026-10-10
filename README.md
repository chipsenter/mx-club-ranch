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
