import { NextResponse } from "next/server";
import { HADITH_DATA } from "@/lib/data/hadith";

export async function GET(): Promise<NextResponse> {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % HADITH_DATA.length;
  return NextResponse.json({ hadith: HADITH_DATA[dayIndex] });
}
