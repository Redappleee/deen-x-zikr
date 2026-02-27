import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { cachedJson } from "@/lib/server-fetch";

const querySchema = z.object({
  q: z.string().min(2).max(100)
});

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`geo:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = querySchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(
      parsed.data.q
    )}`;
    const data = await cachedJson<NominatimResult[]>({ url, revalidate: 3_600, tags: ["geo"] });

    const results = data.map((entry) => ({
      id: entry.place_id,
      label: entry.display_name,
      lat: Number(entry.lat),
      lng: Number(entry.lon),
      type: entry.type
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Failed to fetch location data" }, { status: 502 });
  }
}
