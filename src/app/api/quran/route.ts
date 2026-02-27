import { NextResponse } from "next/server";
import { cachedJson } from "@/lib/server-fetch";

type SurahResponse = {
  data: Array<{
    number: number;
    englishName: string;
    name: string;
    revelationType: string;
    numberOfAyahs: number;
  }>;
};

export async function GET(): Promise<NextResponse> {
  try {
    const payload = await cachedJson<SurahResponse>({
      url: "https://api.alquran.cloud/v1/surah",
      revalidate: 86_400,
      tags: ["quran-list"]
    });
    return NextResponse.json({ surahs: payload.data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch Quran list" }, { status: 502 });
  }
}
