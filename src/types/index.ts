export type PrayerTimings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
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
