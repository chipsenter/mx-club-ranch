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
  description: 'Motocross training, upcoming events and life at Club Ranch MX.',
  phone: '',
  email: '',
  address: '',
  facebook: '',
  instagram: 'https://www.instagram.com/clubranchmx/',
  // Set your verified Cal.com or Calendly event URL. Booking stays off until supplied.
  bookingUrl: '',
  // Optional provider-approved embed URL. Never put a private calendar URL here.
  bookingEmbedUrl: '',
  // Paste a Google Maps embed URL for the actual ranch location.
  mapEmbedUrl: '',
  directionsUrl: '',
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
