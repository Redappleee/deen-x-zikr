import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cachedJson } from "@/lib/server-fetch";

const paramsSchema = z.object({
  id: z.coerce.number().int().min(1).max(30),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(20).default(10)
});

type QuranComWord = {
  id: number;
  position: number;
  text_uthmani?: string;
  text?: string;
  transliteration?: { text?: string };
  translation?: { text?: string };
  audio_url?: string;
  char_type_name?: string;
};

type QuranComVerse = {
  id: number;
  verse_key: string;
  text_uthmani?: string;
  words?: QuranComWord[];
};

type QuranComResponse = {
  verses?: QuranComVerse[];
  pagination?: {
    current_page: number;
    next_page?: number | null;
    total_pages: number;
    total_records: number;
  };
};

function normalizeAudioUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://audio.qurancdn.com/${url.replace(/^\/+/, "")}`;
}

function normalizeVerseKey(verseKey: string | undefined, verseId: number): string {
  const value = (verseKey ?? "").trim();
  if (value) return value;
  return `verse-${verseId}`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await context.params;
  const parsed = paramsSchema.safeParse({
    id: params.id,
    page: request.nextUrl.searchParams.get("page") ?? "1",
    perPage: request.nextUrl.searchParams.get("perPage") ?? "10"
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid para query" }, { status: 400 });
  }

  const { id, page, perPage } = parsed.data;

  try {
    const query = new URLSearchParams({
      words: "true",
      page: String(page),
      per_page: String(perPage),
      word_fields: "text_uthmani,translation,transliteration,audio_url,char_type_name",
      fields: "text_uthmani,verse_key",
      translations: "131"
    });

    const payload = await cachedJson<QuranComResponse>({
      url: `https://api.quran.com/api/v4/verses/by_juz/${id}?${query.toString()}`,
      revalidate: 86_400,
      tags: [`para-${id}`]
    });

    const verses = (payload.verses ?? []).map((verse) => ({
      id: verse.id,
      verseKey: normalizeVerseKey(verse.verse_key, verse.id),
      text: verse.text_uthmani ?? "",
      words: (verse.words ?? []).map((word) => ({
        id: word.id,
        position: word.position,
        text: word.text_uthmani ?? word.text ?? "",
        translation: word.translation?.text ?? "",
        transliteration: word.transliteration?.text ?? "",
        audioUrl: normalizeAudioUrl(word.audio_url),
        charType: word.char_type_name ?? ""
      }))
    }));

    return NextResponse.json({
      paraId: id,
      verses,
      pagination: {
        page,
        hasMore: Boolean(payload.pagination?.next_page),
        totalPages: payload.pagination?.total_pages ?? page,
        totalRecords: payload.pagination?.total_records ?? verses.length
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to load para verses" }, { status: 502 });
  }
}
