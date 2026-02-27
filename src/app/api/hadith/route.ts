import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { HADITH_DATA } from "@/lib/data/hadith";

const schema = z.object({
  collection: z.enum(["bukhari", "muslim", "tirmidhi"]).optional(),
  category: z.enum(["faith", "character", "prayer", "knowledge"]).optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = schema.safeParse({
    collection: request.nextUrl.searchParams.get("collection") ?? undefined,
    category: request.nextUrl.searchParams.get("category") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid hadith query" }, { status: 400 });
  }

  const rows = HADITH_DATA.filter((hadith) => {
    if (parsed.data.collection && hadith.collection !== parsed.data.collection) {
      return false;
    }

    if (parsed.data.category && hadith.category !== parsed.data.category) {
      return false;
    }

    return true;
  });

  return NextResponse.json({ hadith: rows });
}
