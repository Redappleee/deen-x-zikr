import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cachedJson } from "@/lib/server-fetch";

const schema = z.object({
  id: z.coerce.number().int().min(1).max(114),
  translation: z.string().default("en.asad"),
  tafsir: z.string().default("en.mubarakpuri"),
  reciter: z.string().default("ar.alafasy")
});

type SurahAyah = {
  numberInSurah: number;
  text: string;
  audio?: string;
};

type SurahPayload = {
  data: {
    number: number;
    englishName: string;
    name: string;
    ayahs: SurahAyah[];
  };
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await context.params;
  const parsed = schema.safeParse({
    id: params.id,
    translation: request.nextUrl.searchParams.get("translation") ?? "en.asad",
    tafsir: request.nextUrl.searchParams.get("tafsir") ?? "en.mubarakpuri",
    reciter: request.nextUrl.searchParams.get("reciter") ?? "ar.alafasy"
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid surah query" }, { status: 400 });
  }

  const { id, translation, tafsir, reciter } = parsed.data;

  try {
    const [arabic, translated, tafsirPayload, audioPayload] = await Promise.all([
      cachedJson<SurahPayload>({
        url: `https://api.alquran.cloud/v1/surah/${id}/quran-uthmani`,
        revalidate: 86_400,
        tags: [`surah-${id}`]
      }),
      cachedJson<SurahPayload>({
        url: `https://api.alquran.cloud/v1/surah/${id}/${translation}`,
        revalidate: 86_400,
        tags: [`surah-${id}-tr`]
      }),
      cachedJson<SurahPayload>({
        url: `https://api.alquran.cloud/v1/surah/${id}/${tafsir}`,
        revalidate: 86_400,
        tags: [`surah-${id}-tafsir`]
      }),
      cachedJson<SurahPayload>({
        url: `https://api.alquran.cloud/v1/surah/${id}/${reciter}`,
        revalidate: 86_400,
        tags: [`surah-${id}-audio`]
      })
    ]);

    const quranComTajweed = await fetch(
      `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${id}&per_page=300`,
      { next: { revalidate: 86_400, tags: [`surah-${id}-tajweed`] } }
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { verses?: Array<{ verse_number: number; text_uthmani_tajweed: string }> };
      })
      .catch(() => null);

    const tajweedMap = new Map<number, string>();
    quranComTajweed?.verses?.forEach((verse) => {
      tajweedMap.set(verse.verse_number, verse.text_uthmani_tajweed);
    });

    const ayahs = arabic.data.ayahs.map((ayah, index) => ({
      number: ayah.numberInSurah,
      text: ayah.text,
      tajweedText: tajweedMap.get(ayah.numberInSurah) ?? ayah.text,
      translation: translated.data.ayahs[index]?.text ?? "",
      tafsir: tafsirPayload.data.ayahs[index]?.text ?? translated.data.ayahs[index]?.text ?? "",
      audio: audioPayload.data.ayahs[index]?.audio ?? ""
    }));

    return NextResponse.json({
      surah: {
        number: arabic.data.number,
        englishName: arabic.data.englishName,
        name: arabic.data.name,
        ayahs
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch surah" }, { status: 502 });
  }
}
