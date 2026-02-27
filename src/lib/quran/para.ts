export type ParaMeta = {
  id: number;
  name: string;
  startSurah: number;
  startAyah: number;
  startSurahName: string;
  totalAyahs: number;
};

const CHAPTER_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
  227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
  62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5,
  4, 5, 6
];

const PARA_NAMES = [
  "Alif Lam Meem",
  "Sayaqool",
  "Tilka al-Rusul",
  "Lan Tana Loo",
  "Wal Mohsanat",
  "La Yuhibbullah",
  "Wa Iza Samiu",
  "Wa Lau Annana",
  "Qala al-Mala",
  "Wa A'lamu",
  "Yatazeroon",
  "Wa Mamin Da'abat",
  "Wa Ma Ubarriu",
  "Rubama",
  "Subhan Alladhi",
  "Qala Alam",
  "Aqtaraba",
  "Qadd Aflaha",
  "Wa Qala Alladhina",
  "A'man Khalaq",
  "Utlu Ma Oohi",
  "Wa Manyaqnut",
  "Wa Mali",
  "Faman Azlam",
  "Ilayhi Yurad",
  "Ha Meem",
  "Qala Fama Khatbukum",
  "Qad Sami Allah",
  "Tabarak Alladhi",
  "Amma"
] as const;

const PARA_STARTS: Array<{ surah: number; ayah: number }> = [
  { surah: 2, ayah: 1 },
  { surah: 2, ayah: 142 },
  { surah: 2, ayah: 253 },
  { surah: 3, ayah: 93 },
  { surah: 4, ayah: 24 },
  { surah: 4, ayah: 148 },
  { surah: 5, ayah: 82 },
  { surah: 6, ayah: 111 },
  { surah: 7, ayah: 88 },
  { surah: 8, ayah: 41 },
  { surah: 9, ayah: 93 },
  { surah: 11, ayah: 6 },
  { surah: 12, ayah: 53 },
  { surah: 15, ayah: 1 },
  { surah: 17, ayah: 1 },
  { surah: 18, ayah: 75 },
  { surah: 21, ayah: 1 },
  { surah: 23, ayah: 1 },
  { surah: 25, ayah: 21 },
  { surah: 27, ayah: 56 },
  { surah: 29, ayah: 46 },
  { surah: 33, ayah: 31 },
  { surah: 36, ayah: 28 },
  { surah: 39, ayah: 32 },
  { surah: 41, ayah: 47 },
  { surah: 46, ayah: 1 },
  { surah: 51, ayah: 31 },
  { surah: 58, ayah: 1 },
  { surah: 67, ayah: 1 },
  { surah: 78, ayah: 1 }
];

const START_SURAH_NAMES: Record<number, string> = {
  2: "Al-Baqarah",
  3: "Ali 'Imran",
  4: "An-Nisa",
  5: "Al-Ma'idah",
  6: "Al-An'am",
  7: "Al-A'raf",
  8: "Al-Anfal",
  9: "At-Tawbah",
  11: "Hud",
  12: "Yusuf",
  15: "Al-Hijr",
  17: "Al-Isra",
  18: "Al-Kahf",
  21: "Al-Anbiya",
  23: "Al-Mu'minun",
  25: "Al-Furqan",
  27: "An-Naml",
  29: "Al-'Ankabut",
  33: "Al-Ahzab",
  36: "Ya-Sin",
  39: "Az-Zumar",
  41: "Fussilat",
  46: "Al-Ahqaf",
  51: "Adh-Dhariyat",
  58: "Al-Mujadila",
  67: "Al-Mulk",
  78: "An-Naba"
};

function verseAbsoluteIndex(surah: number, ayah: number): number {
  let index = 0;
  for (let s = 1; s < surah; s += 1) {
    index += CHAPTER_AYAH_COUNTS[s - 1] ?? 0;
  }
  index += ayah;
  return index;
}

function paraTotalAyahs(paraId: number): number {
  const start = PARA_STARTS[paraId - 1];
  const next = PARA_STARTS[paraId];
  const startIndex = verseAbsoluteIndex(start.surah, start.ayah);

  if (!next) {
    const totalQuranAyahs = CHAPTER_AYAH_COUNTS.reduce((sum, value) => sum + value, 0);
    return totalQuranAyahs - startIndex + 1;
  }

  const nextIndex = verseAbsoluteIndex(next.surah, next.ayah);
  return nextIndex - startIndex;
}

export const PARA_META: ParaMeta[] = PARA_STARTS.map((start, index) => ({
  id: index + 1,
  name: PARA_NAMES[index],
  startSurah: start.surah,
  startAyah: start.ayah,
  startSurahName: START_SURAH_NAMES[start.surah] ?? `Surah ${start.surah}`,
  totalAyahs: paraTotalAyahs(index + 1)
}));
