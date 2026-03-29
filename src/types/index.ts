export type PrayerTimings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset?: string;
  Maghrib: string;
  Isha: string;
};

export type PrayerResponse = {
  date: string;
  readableDate: string;
  timezone: string;
  locationName: string;
  methodId: number;
  timings: PrayerTimings;
  hijri: string;
  latitude: number;
  longitude: number;
  schools?: {
    shafi: PrayerTimings;
    hanafi: PrayerTimings;
  };
  prohibitedTimes?: {
    sunrise?: { start: string; end: string };
    noon?: { start: string; end: string };
    sunset?: { start: string; end: string };
  } | null;
  qibla?: {
    degrees: number | null;
    from: string | null;
    distanceKm: number | null;
    distanceUnit: string | null;
  } | null;
};

export type QuranAyah = {
  number: number;
  text: string;
  translation: string;
};

export type SurahSummary = {
  number: number;
  englishName: string;
  name: string;
  revelationType: string;
  numberOfAyahs: number;
};
