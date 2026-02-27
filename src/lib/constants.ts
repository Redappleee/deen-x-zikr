export const APP_NAME = "Deen X Zikr";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/salah", label: "Salah Center" },
  { href: "/qibla", label: "Qibla" },
  { href: "/quran", label: "Quran" },
  { href: "/hadith", label: "Hadith" },
  { href: "/zikr", label: "Zikr Tools" },
  { href: "/calendar", label: "Islamic Calendar" },
  { href: "/dashboard", label: "Dashboard" }
];

export const PRAYER_METHODS = [
  { id: 3, label: "Muslim World League (MWL)" },
  { id: 2, label: "ISNA" },
  { id: 4, label: "Umm Al-Qura" }
] as const;

export const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export const HADITH_COLLECTIONS = ["bukhari", "muslim", "tirmidhi"] as const;

export const DUA_LIST = [
  {
    title: "Morning Protection",
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا",
    translation: "O Allah, by You we enter the morning and by You we enter the evening."
  },
  {
    title: "Forgiveness",
    arabic: "أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
    translation: "I seek forgiveness from Allah, none has the right to be worshipped except Him, the Ever-Living."
  },
  {
    title: "Gratitude",
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    translation: "All praise is for Allah, Lord of all worlds."
  }
];

export const ISLAMIC_EVENTS = [
  "Ramadan",
  "Eid al-Fitr",
  "Eid al-Adha",
  "Day of Arafah",
  "Islamic New Year",
  "Mawlid"
];
