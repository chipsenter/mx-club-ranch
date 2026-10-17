# Ranch swag surface

Updated October 16, 2026. Scope: swag showcase, collection drawer and product details only. Existing `PRODUCT.md`, `DESIGN.md` and global identity remain authoritative and unchanged.

## Purpose and approved direction

Keep the page compact with three featured products, then let visitors browse all swag, inspect available front/back photographs, save favorites and inquire about an item. Preserve the existing device-local wishlist/cart. Prices, sizes, availability and ordering terms must come from the ranch.

## Implemented presentation

- The page features Black Camo Hat, Green Ranch Hoodie and Grey Cropped Hoodie beneath “Off the bike. Still ranch.” “View all swag” displays the collection count and opens a native modal drawer.
- The catalog contains seven products: three hats and four hoodies. All, Hats and Hoodies buttons filter it in place.
- Featured products and the catalog use three desktop columns. At 760px and below, featured products become a native horizontal swipe/scroll-snap row with a partial next card visible; the catalog becomes two columns and product details stack.
- Photographs remain uncropped on light neutral backgrounds. Square previews have rounded corners and restrained shadows. Typography and theme colors inherit the established site identity. Hover adds a small image scale; reduced motion removes its transition.
- The right-side drawer is at most 980px wide, fills the viewport height and scrolls internally. Details show photography, description, pricing/availability note, inquiry and wishlist actions.
- Front/Back controls appear only for Green Cropped Hoodie and Ranch Camo Hoodie, where both images exist. Switching updates the photograph, alternative text and selected state.

## Interaction and accessibility

Product previews are keyboard-operable buttons. Opening a detail focuses its heading. “Back to collection” restores focus to the originating catalog product, or the first filter when opened from the page. The native modal supports Escape and contains keyboard focus; closing restores focus to its page trigger. Filters and photo-view controls expose pressed states, and the filtered count has a live status announcement. Existing site focus styles apply.

Wishlist saving uses the existing cart implementation and storage key, retaining saved identifiers and quantities. Quantity adjustment, removal, accessible status updates and drawer focus return remain supported. If storage is unavailable, saving works for the current visit and reports that limitation. Legacy cart wording remains in the existing cart drawer and toast.

## Inquiries and pending commerce

“Ask about this item” opens the visitor's email application with the product name and a request for pricing, available sizes and ordering details. It does not send mail automatically. A direct email fallback is available without JavaScript.

There are no live prices, size selection, stock verification, payment or order placement. Checkout stays disabled. Saved products do not reserve inventory or incur charges. Real commerce remains pending an owner-approved provider and verified product information.

## Implementation references

- `src/components/ShopSection.astro`: featured products, collection/detail dialog, filters, photo switching, inquiry links and responsive styles.
- `src/data/site.ts`: product names, categories, descriptions, images and available views.
- `src/scripts/experience.ts`: cart persistence, quantity controls, status announcements and focus handling.

This brief records inspected implementation behavior; browser validation is reported separately by the implementation task.
