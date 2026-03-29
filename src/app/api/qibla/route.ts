import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildIslamicApiPrayerUrl, hasIslamicApiKey } from "@/lib/islamic-api";
import { calculateQiblaBearing } from "@/lib/geo";
import { isRateLimited } from "@/lib/rate-limit";
import { cachedJson } from "@/lib/server-fetch";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

type IslamicApiQiblaResponse = {
  code: number;
  status: string;
  data: {
    qibla?: {
      direction?: {
        degrees?: number;
        from?: string;
      };
      distance?: {
        value?: number;
        unit?: string;
      };
    };
  };
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`qibla:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = schema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lng: request.nextUrl.searchParams.get("lng")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid qibla query" }, { status: 400 });
  }

  const { lat, lng } = parsed.data;

  try {
    if (hasIslamicApiKey()) {
      const payload = await cachedJson<IslamicApiQiblaResponse>({
        url: buildIslamicApiPrayerUrl({ lat, lng, method: 3 }),
        revalidate: 900,
        tags: ["qibla"]
      });

      return NextResponse.json({
        degrees: payload.data.qibla?.direction?.degrees ?? calculateQiblaBearing(lat, lng),
        from: payload.data.qibla?.direction?.from ?? "North",
        distanceKm: payload.data.qibla?.distance?.value ?? null,
        distanceUnit: payload.data.qibla?.distance?.unit ?? null,
        source: "islamicapi"
      });
    }

    return NextResponse.json({
      degrees: calculateQiblaBearing(lat, lng),
      from: "North",
      distanceKm: null,
      distanceUnit: null,
      source: "local"
    });
  } catch {
    return NextResponse.json({
      degrees: calculateQiblaBearing(lat, lng),
      from: "North",
      distanceKm: null,
      distanceUnit: null,
      source: "local"
    });
  }
}
