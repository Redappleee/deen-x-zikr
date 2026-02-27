import { NextResponse } from "next/server";
import { DUA_LIST } from "@/lib/constants";
import { HADITH_DATA } from "@/lib/data/hadith";
import { cachedJson } from "@/lib/server-fetch";

type AyahEditionPayload = {
  data: Array<{
    edition: { identifier: string };
    numberInSurah: number;
    text: string;
    surah: {
      number: number;
      englishName: string;
      name: string;
    };
  }>;
};

function daySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export async function GET(): Promise<NextResponse> {
  const seed = daySeed();
  const ayahNumber = (seed % 6236) + 1;

  try {
    const ayahPayload = await cachedJson<AyahEditionPayload>({
      url: `https://api.alquran.cloud/v1/ayah/${ayahNumber}/editions/quran-uthmani,en.asad`,
      revalidate: 86_400,
      tags: ["daily-inspiration"]
    });

    const arabic = ayahPayload.data.find((entry) => entry.edition.identifier === "quran-uthmani") ?? ayahPayload.data[0];
    const translation = ayahPayload.data.find((entry) => entry.edition.identifier === "en.asad") ?? ayahPayload.data[1] ?? ayahPayload.data[0];

    const hadith = HADITH_DATA[seed % HADITH_DATA.length];
    const dua = DUA_LIST[seed % DUA_LIST.length];

    return NextResponse.json({
      ayah: {
        surahNumber: arabic.surah.number,
        surahEnglishName: arabic.surah.englishName,
        surahArabicName: arabic.surah.name,
        ayahNumberInSurah: arabic.numberInSurah,
        arabic: arabic.text,
        translation: translation.text
      },
      hadith,
      dua
    });
  } catch {
    const hadith = HADITH_DATA[seed % HADITH_DATA.length];
    const dua = DUA_LIST[seed % DUA_LIST.length];

    return NextResponse.json({
      ayah: null,
      hadith,
      dua
    });
  }
}
