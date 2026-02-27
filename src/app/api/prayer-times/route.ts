import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { cachedJson } from "@/lib/server-fetch";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  method: z.coerce.number().int().min(1).max(25).default(3),
  date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/).optional(),
  locationName: z.string().max(160).optional()
});

type AladhanResponse = {
  data: {
    timings: Record<string, string>;
    date: {
      readable: string;
      gregorian: { date: string };
      hijri: { date: string; month: { en: string }; year: string };
    };
    meta: {
      timezone: string;
      latitude: number;
      longitude: number;
    };
  };
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`prayer:${ip}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = schema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lng: request.nextUrl.searchParams.get("lng"),
    method: request.nextUrl.searchParams.get("method") ?? "3",
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    locationName: request.nextUrl.searchParams.get("locationName") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prayer query" }, { status: 400 });
  }

  const { lat, lng, method, date, locationName } = parsed.data;
  const endpoint = date
    ? `https://api.aladhan.com/v1/timings/${date}?latitude=${lat}&longitude=${lng}&method=${method}`
    : `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}`;

  try {
    const payload = await cachedJson<AladhanResponse>({
      url: endpoint,
      revalidate: 900,
      tags: ["prayer-times"]
    });

    return NextResponse.json({
      date: payload.data.date.gregorian.date,
      readableDate: payload.data.date.readable,
      timezone: payload.data.meta.timezone,
      locationName: locationName ?? "Your location",
      methodId: method,
      timings: {
        Fajr: payload.data.timings.Fajr,
        Sunrise: payload.data.timings.Sunrise,
        Dhuhr: payload.data.timings.Dhuhr,
        Asr: payload.data.timings.Asr,
        Maghrib: payload.data.timings.Maghrib,
        Isha: payload.data.timings.Isha
      },
      hijri: `${payload.data.date.hijri.date} ${payload.data.date.hijri.month.en} ${payload.data.date.hijri.year}`,
      latitude: payload.data.meta.latitude,
      longitude: payload.data.meta.longitude
    });
  } catch {
    return NextResponse.json({ error: "Prayer times unavailable" }, { status: 502 });
  }
}
