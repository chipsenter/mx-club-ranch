/** Shared by the signup form and API. Update the PDF (scripts/waiver) and these values each season. */
export const waiver = {
  season: 2026,
  href: '/waivers/clubranchmx-waiver-2026.pdf',
  url: 'https://clubranchmx.com/waivers/clubranchmx-waiver-2026.pdf',
  maxBytes: 8 * 1024 * 1024,
  types: {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  } as Record<string, string>,
};
