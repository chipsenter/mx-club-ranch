---
name: Club Ranch MX
description: A simple, logo-led motocross club prospectus.
colors:
  ink: "#0b2335"
  paper: "#f5f3ec"
  muted: "#53616a"
  line: "#d8dcd9"
  accent: "#ff9855"
  white: "#fff"
  olive: "#b24a16"
  button-hover: "#294759"
  control-hover: "#e7e9df"
  status-bg: "#f5e4d7"
  status-text: "#743d20"
  calendar-surface: "#fffefa"
  calendar-hover: "#edf0e4"
  today-stroke: "#ad4a17"
  session-marker: "#ad4a17"
  past-surface: "#e8ece6"
  past-status: "#eed9c9"
  footer-muted: "#becbd0"
  footer-line: "#3c515f"
  focus: "#b24a16"
  button-focus: "#d46326"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(64px, 7.1vw, 96px)"
    fontWeight: 600
    lineHeight: 0.94
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(44px, 5vw, 68px)"
    fontWeight: 600
    lineHeight: 0.98
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 0.98
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.08em"
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  status: "4px"
  button: "5px"
  menu-trigger: "6px"
  menu-panel: "10px"
  media: "12px"
  calendar: "14px"
  hero: "16px"
  circle: "50%"
spacing:
  control-gap: "8px"
  calendar-padding: "28px"
  calendar-padding-mobile: "20px"
  section-desktop: "100px"
  section-mobile: "65px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "16px 22px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    width: "42px"
    height: "42px"
  link-text:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "0 0 7px"
  status-label:
    backgroundColor: "{colors.status-bg}"
    textColor: "{colors.status-text}"
    typography: "{typography.label}"
    rounded: "{rounded.status}"
    padding: "8px 10px"
  menu-trigger:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.menu-trigger}"
    padding: "12px 17px"
  menu-trigger-open:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  calendar:
    backgroundColor: "{colors.calendar-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.calendar}"
    padding: "{spacing.calendar-padding}"
  calendar-date-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
---

# Design System: Club Ranch MX

## Overview

**Creative North Star: "The Club Prospectus"**

A modern club prospectus grounded in the supplied Club Ranch MX identity. Navy typography and cream reading surfaces keep the page direct and legible; condensed headings bring energy while open sections leave the photography room to work.

The accepted direction is simple, modern and logo-led. Depth comes from tonal bands, fine borders and cropped photography. Compact controls remain visibly functional, with restrained movement and clear keyboard focus.

**Key Characteristics:**
- Navy and cream identity with restrained green accents.
- Condensed display typography beside calm reading text.
- Open sections, fine rules and rounded photographic frames.
- Compact outlined controls and explicit interaction states.

This is the implemented system, extracted from `src/styles/global.css`, `src/pages/index.astro`, `src/components/EventSection.astro` and `src/scripts/page.ts`. The approved direction is recorded in `PRODUCT.md` and `.impeccable/home-brief.md`. Desktop and mobile review captures live in `.impeccable/review/`.

Reviewer disposition: **Ship as scaffold**. Activation of calendar booking, contact and location awaits owner content. The calendar browser itself is implemented; this disposition does not claim that reservations are live.

## Colors

The palette pairs deep navy with warm cream and small green accents. Frontmatter records normative values; existing CSS custom properties are the implementation source.

### Primary

- **Ranch Navy (`ink`)** anchors headings, body interface text, primary actions and the footer.
- **Button Hover (`button-hover`)** lightens the navy action on hover.

### Secondary

- **Field Olive (`olive`)** emphasizes a few words in large headings and navigation hover states.
- **Fresh Green (`accent`)** supplies selection color, selected session markers and small accents on the dark footer.
- **Status Greens (`status-bg`, `status-text`, `past-status`)** identify informational pending states.
- **Calendar Greens (`calendar-hover`, `today-stroke`, `session-marker`)** distinguish hovered dates, today and announced sessions.
- **Focus Greens (`focus`, `button-focus`)** mark keyboard focus.

### Neutral

- **Warm Paper (`paper`)** is the main reading canvas; **White (`white`)** supplies primary-action contrast.
- **Slate (`muted`)** supports paragraphs and secondary text. **Fine Rule (`line`)** separates sections and outlines controls.
- **Calendar Paper (`calendar-surface`)** lifts the calendar tonally; **Control Hover (`control-hover`)** marks icon-button hover.
- **Past Surface (`past-surface`)** separates the retrospective section without enclosing it in a card.
- **Footer Muted (`footer-muted`)** and **Footer Rule (`footer-line`)** support the navy footer.

## Typography

**Display Font:** Barlow Condensed, sans-serif fallback. **Body Font:** Manrope, sans-serif fallback. Fonts are locally imported through Fontsource; display weights 600/700 and body weights 400/600 are available.

The condensed display has an energetic club character. Manrope gives descriptions, dates and controls a quieter voice. The implementation uses a role-based hierarchy, not a single mathematical scale.

- **Display:** hero headline; balanced wrapping and tight tracking. At the intermediate breakpoint it becomes 76px, stays 76px on mobile and reduces to 66px below 370px.
- **Headline:** section titles; the contact title has a larger clamp of 54px to 80px, with 62px mobile and 54px narrow-screen overrides.
- **Title:** default tertiary heading. Training titles use 40px/34px; empty event titles use 42px/37px; populated event entries use 32px.
- **Body:** paragraphs cap at 68ch globally; common content columns use 38–45ch. Introductory hero text is 16px desktop and 14px mobile.
- **Label:** uppercase informational status text; it is not a button. Navigation and action labels use sentence case.
- **Numeric text:** calendar and carousel counter use tabular numerals.

## Layout

The centered content width is capped at 1248px with 48px side gutters. At 1050px and below, gutters become 32px; at 760px and below, 20px. Open sections and horizontal rules supply the main rhythm. Training and contact use 100px desktop vertical spacing and 65px mobile spacing; the retrospective band uses 90px/85px desktop and 60px mobile.

Desktop layouts pair unequal columns: hero .9fr/1.1fr, training 1fr/1.12fr, contact 1.2fr/1fr. Headings and introductions form a 1fr/.8fr row. Gaps vary with content, generally 55–80px desktop, compressed around 1050px. At 760px these grids stack, event entries become one column, and the retrospective image returns to normal document order.

The hero image frame is 535px tall by default, 570px above 1600px, 490px at the intermediate breakpoint, 430px on mobile and 360px below 370px. Images crop with object-fit cover. The calendar always retains seven equal weekday columns; its padding reduces from 28px to 20px, then 15px on the narrowest screens.

## Elevation & Depth

The system has no box shadows. Cream, pale green, off-white and navy surfaces establish hierarchy, supported by fine borders. Photography supplies depth through crop and contrast. Hero captions use a bottom gradient from transparent to rgba(5,18,26,.85) for legibility; it is a photographic overlay, not a general surface treatment.

## Shapes

Corners are subtly rounded and vary by role: tight status/button corners, moderately rounded menu and event media, and softer calendar/hero frames. Carousel and month arrows are circular. Borders are generally 1px; text links use a simple bottom rule. The supplied logo is contained rather than cropped.

## Components

### Buttons and links

Primary actions are navy with white text, generous horizontal breathing room, an arrow and a minimum height of 54px (50px on mobile). Background transitions take .2s. Underlined text actions use a 24px icon gap and a bottom rule. The hero secondary action is a smaller underlined link.

Circular icon buttons are 42px, with 17px icons; calendar month buttons are 34px. All links, buttons and summaries use a 3px focus-visible outline with 5px offset. Primary buttons use the distinct button-focus color. Disabled buttons use .45 opacity and a not-allowed cursor.

### Navigation

The logo and name sit opposite a section link and a native details/summary menu. The trigger inverts to navy and cream when open. The outlined cream panel is 310px wide; its rows have bottom dividers. On mobile the separate header action disappears, the logo reduces to 53px by 55px, and the panel width is constrained to the viewport. Escape and outside click close the menu; selecting an anchor also closes it.

### Status labels

Small, uppercase warm orange labels indicate forthcoming content. They are informational, with no interactive hover state. In event empty states, the title precedes the status label, then supporting copy and a text action. The retrospective label uses its darker green surface variant.

### Calendar

An off-white bordered panel contains the month, Today action, circular month controls, weekday row, seven-column date grid, legend and result area. Selected dates invert to navy/white; today has an orange outline; announced sessions have a small dot. Selecting a date updates the live result area. Arrow keys move by day or week. Month navigation and Today are functional even while session data is empty. Booking links appear only when valid booking content is configured; no form-field design is established.

### Photo carousel

A rounded clipped frame pairs cover photography with a large caption and small attribution. Explicit arrows, a live counter, keyboard arrows and touch swipes control the sequence. It does not autoplay. Slides transition opacity over .45s with cubic-bezier(.16,1,.3,1). Reduced-motion preference removes transitions and smooth scrolling.

### Event entries and footer

Events use image-first entries with date, title and description below. Empty sections remain editorial image-and-copy pairs with honest pending status. The footer is navy, with muted copy, a bordered map region and a fine ruled utility row; its pending-location state uses a small orange location icon. Map and booking embeds are conditional on configured content.

## Do's and Don'ts

### Do's

- Do preserve the supplied logo and navy/cream identity.
- Do use condensed type for expressive headings and Manrope for reading and controls.
- Do keep long text on high-contrast reading surfaces and use the established focus treatment.
- Do preserve photo credits and label illustrative imagery honestly.
- Do retain visible empty states until owner content activates training, events, contact and location.
- Do respect reduced-motion preferences and keep carousel movement user-controlled.

### Don'ts

- Don’t invent event dates, bookable sessions, contact details or location claims.
- Don’t add shadows to the established flat surfaces without an explicit design change.
- Don’t present status labels as interactive controls.
- Don’t replace the supplied brand with generic racing graphics or an unrelated palette.

## Light and dark views
The header theme button switches between the original light view and a navy dark view. Light remains the initial default. A saved choice is applied before first paint and persists in local storage; blocked storage does not prevent switching. The button has an accessible pressed state, moon/sun icon, and action label. On narrow screens it remains an icon button.

The full-width header is a dedicated sand surface (#e7e6dd) in light view and slate navy (#172b3a) in dark view. Dark page background is #0b1721, primary text #edf2ec, secondary text #afbdc6, calendar surface #132633, past-event band #10232c, and footer #07121b. Dark primary actions are warm orange (#ff9855) with navy text. Photos and the supplied logo retain their original colors. Theme styles also cover menus, date selection, hover, focus, borders and empty states.

## Swag showcase
The swag section follows past events and precedes contact. Two equal image-first product columns stack below 760px. The original product screenshots sit uncropped in 4:3 light neutral frames in both themes; names and descriptions appear beneath. A fine ruled note communicates pending ordering information. Navigation includes Ranch swag and the footer includes Swag.

## Event photo gallery
Event Photos sits between past events and swag. Photo figures use identical 4:3 cover-cropped frames with captions below; a single image is capped at 560px. Multiple entries form a horizontal scroll-snap carousel with a partial next slide visible, native touch/trackpad scrolling, arrow controls and a photo counter. Keyboard arrows/Home/End and reduced motion are supported. Full-size links are keyboard accessible. The footer now includes a stroked Instagram icon and @clubranchmx link.

The full-width header stays sticky at the viewport top in both themes. Anchor scrolling reserves 150px on desktop and 120px on mobile. The dropdown scrolls internally on short screens.

## News feature
News is the first section after the sticky header. The section heading pairs with an explicitly labeled posting date. The feature uses a full, uncropped poster beside a large condensed title, supporting copy, an orange month/date-status row and Instagram action. Its bordered surface uses theme tokens; below 760px, the poster and copy stack. Original photography and poster lettering are never recolored.


## Full-page amplification — October 2026

The professional UI pass is implemented in `src/styles/experience.css`, loaded after the base stylesheet. It preserves the Club Ranch MX logo, Barlow Condensed / Manrope typography, cream/navy themes, orange accents, and all supplied content. This section supersedes older descriptions of the affected layouts above.

- A compact sticky header includes desktop quick links, theme switching, a live cart count, and the existing section menu. A thin orange reading-progress line follows page scrolling.
- News stays first. An ink announcement panel pairs the entire uncropped poster with a strong headline, November date detail, and Instagram action. Its short clip-and-settle entrance is the primary authored motion.
- The hero uses a full-width photographic stage with a contrast overlay, orange action, captions and manual slide controls. Photos settle subtly when selected; no autoplay.
- The training calendar sits in a tonal section, with legible month typography and all original calendar behavior. Past-event images and copy form a wider editorial spread.
- Event and product images open in a native modal photo viewer. Photo navigation supports buttons and left/right keys; Escape closes and focus returns to the originating link. Ordinary image links remain available without JavaScript.
- The swag showcase supports a saved cart. A native modal drawer provides quantity controls, removal, an empty state, and explicit pending-checkout messaging. Prices, sizes, inventory and purchases are not implied. The cart count and changes are announced accessibly.
- Footer lettering creates a strong closing moment; pending contact and map information stays truthful.
- Motion respects reduced-motion settings. Mobile controls, short-screen dialogs, both themes, and 320px layouts are supported. Product-image zoom is a small hover affordance rather than an autoplay effect.

## Welcome film — October 10, 2026

The first viewport now features the owner's portrait ranch reel. Keep it uncropped in a 9:16 frame, with native controls and a branded opening-frame poster. On desktop it sits beside “Welcome to the ranch”; on mobile it precedes that copy. News follows the film. The header keeps the logo, theme, cart and menu only; duplicate quick links are removed. The compact 280px desktop / 240px mobile poster preview opens an enlarged native-dialog player on click, preserving the portrait proportions. Playback with sound requires that explicit click. The close button, Escape and backdrop dismiss the player and restore focus.
