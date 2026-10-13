export type EventEntry = {
  title: string;
  date?: string; // ISO date when the year is known; displayed without timezone shifting
  dateLabel?: string; // Display-only dates when the supplied material omits a year
  imageWidth?: number;
  imageHeight?: number;
  poster?: boolean; // Preserve the entire poster rather than cropping it
  description: string;
  image: string; // /images/your-file.webp
  imageAlt: string;
  url?: string;
};
export type TrainingSession = {
  date: string; // YYYY-MM-DD in the ranch's timezone
  time?: string; // Include the local timezone, e.g. "9:00 AM MDT"
  title: string;
  bookingUrl?: string; // Real HTTPS booking link; capacity is managed by your provider
};
export const site = {
  name: 'Club Ranch MX',
  description: 'Colorado motocross training at Club Ranch MX. Explore MX school news, training dates, events, photos and ranch swag for your next day on the bike.',
  phone: '+1 607 624 9173',
  email: 'post@clubranchmx.com',
  address: '11021 Yellowstone Rd, Longmont, CO 80504',
  facebook: '',
  instagram: 'https://www.instagram.com/clubranchmx/',
  // Set your verified Cal.com or Calendly event URL. Booking stays off until supplied.
  bookingUrl: '',
  // Optional provider-approved embed URL. Never put a private calendar URL here.
  bookingEmbedUrl: '',
  // Paste a Google Maps embed URL for the actual ranch location.
  mapEmbedUrl: 'https://www.google.com/maps?q=11021%20Yellowstone%20Rd%2C%20Longmont%2C%20CO%2080504&output=embed',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11021%20Yellowstone%20Rd%2C%20Longmont%2C%20CO%2080504',
};
export const heroSlides = [
  { image: '/images/moto-turn.jpg', alt: 'Motocross rider carving a turn on a dirt track', caption: 'Find your line.', credit: 'Illustrative photography · Jordan Andrews / Unsplash' },
  { image: '/images/moto-air.jpg', alt: 'Motocross rider airborne above a dirt track', caption: 'Make every lap count.', credit: 'Illustrative photography · Jordan Andrews / Unsplash' },
];
// Add real entries here; empty sections deliberately never invent dates or history.
export const upcomingEvents: EventEntry[] = [];
export const pastEvents: EventEntry[] = [
  {
    title: 'Train with Austin Forkner',
    dateLabel: 'October 3–4',
    description: 'A two-day motocross training event with Austin Forkner at Club Ranch MX.',
    image: '/images/austin-forkner-training-october.png',
    imageAlt: 'Train with Austin Forkner at Club Ranch MX, October 3–4. Event poster featuring a rider on a green motocross bike against a mountain backdrop. The poster notes the date was changed due to races.',
    imageWidth: 1632,
    imageHeight: 960,
    poster: true,
  },
];
export const trainingSessions: TrainingSession[] = [
  { date: '2026-10-03', title: 'Train with Austin Forkner' },
  { date: '2026-10-04', title: 'Train with Austin Forkner' },
];


export const swagItems = [
  {
    id: 'ranch-camo-hat',
    name: 'Ranch Camo Hat',
    description: 'Woodland camo, a mesh back, and the Club Ranch MX logo in standout orange.',
    image: '/images/ranch-camo-hat.png',
    imageAlt: 'Camouflage mesh-back hat with a bright orange Club Ranch MX logo patch.',
    width: 1404,
    height: 1064,
  },
  {
    id: 'ranch-camo-hoodie',
    name: 'Ranch Camo Hoodie',
    description: 'Light camo with a bold orange Club Ranch MX logo. Bring the ranch with you.',
    image: '/images/ranch-camo-hoodie.png',
    imageAlt: 'Light camouflage pullover hoodie with a large orange Club Ranch MX logo on the chest.',
    width: 1428,
    height: 1146,
  },
];


export const eventPhotos = [
  {
    image: '/images/ranch-event-airborne.png',
    alt: 'Motocross rider airborne on an orange bike above a dirt track, with a lake and mountains in the background.',
    caption: 'Above the dirt.',
    width: 914,
    height: 1110,
  },
  {
    image: '/images/ranch-event-mountain-jump.png',
    alt: 'Motocross rider jumping high above a dirt track under a clear blue sky, with mountains in the distance.',
    caption: 'Big air. Wide-open skies.',
    width: 1170,
    height: 745,
  },
  {
    image: '/images/jordanmx1.jpg',
    alt: 'Rider on a number 449 motocross bike beside a person standing trackside.',
    caption: 'Between laps.',
    width: 1440,
    height: 1440,
  },
  {
    image: '/images/jordanmx4.jpg',
    alt: 'Two motocross riders jumping side by side with snow-covered mountains behind them.',
    caption: 'Side by side.',
    width: 1440,
    height: 1440,
  },
  {
    image: '/images/jordanmx3.jpg',
    alt: 'Wide view of two airborne motocross riders above a dirt track with mountains in the distance.',
    caption: 'Riding with a view.',
    width: 1440,
    height: 1440,
  },
  {
    image: '/images/jordanmx2.jpg',
    alt: 'Motocross rider on a number 449 bike airborne against a blue-gray sky.',
    caption: 'Off the ground.',
    width: 1440,
    height: 1440,
  },
  {
    image: '/images/ranch-event-blue-bike-mountains.jpeg',
    alt: 'Motocross rider jumping a blue bike above a dirt track with snow-covered mountains beneath a clear blue sky.',
    caption: 'Blue skies. Mountain backdrop.',
    width: 1744,
    height: 1136,
  },
  {
    image: '/images/ranch-event-corner-roost.jpeg',
    alt: 'Motocross rider in pink boots leaning a blue bike through a dirt turn, spraying soil behind the rear wheel.',
    caption: 'Carving through the dirt.',
    width: 1170,
    height: 1144,
  },
  {
    image: '/images/ranch-event-monochrome-collage.jpeg',
    alt: 'Black-and-white collage of motocross jumps and an aerial track view, with mwccreative credit.',
    caption: 'Ranch moments · mwccreative',
    width: 906,
    height: 1675,
    fit: 'contain',
  },
  {
    image: '/images/ranch-event-orange-bike-story.jpeg',
    alt: 'Motocross rider airborne on an orange bike against a blue sky, with mwccreative credit.',
    caption: 'Into the blue · mwccreative',
    width: 902,
    height: 1649,
    fit: 'contain',
  },
  {
    image: '/images/ranch-event-aerial-collage.jpeg',
    alt: 'Two aerial photographs of the ranch dirt track, with mwccreative credit and the words Place was ripping today.',
    caption: 'A day at the ranch · mwccreative',
    width: 945,
    height: 1608,
    fit: 'contain',
  },
];


export const latestNews = {
  publishedDate: '2026-10-09',
  title: 'Guess who’s coming to the ranch.',
  description: 'November MX School at Club Ranch MX. Exact training dates are coming soon — keep an eye on our Instagram for updates.',
  image: '/images/november-mx-school-news.jpeg',
  imageAlt: 'November MX School announcement: a motocross rider on a yellow Suzuki bike, with the words “Guess who is coming to Club Ranch MX” and “Dates coming soon.”',
  imageWidth: 1376,
  imageHeight: 1440,
};
