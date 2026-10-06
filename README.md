# MX Club Ranch
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
Stock motocross photos are illustrative, not photos of MX Club Ranch. See `public/images/SOURCES.md`. Replace with owned ranch photography before launch.

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
