import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { cachedJson } from "@/lib/server-fetch";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  method: z.coerce.number().int().min(1).max(25).default(3),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100)
});

type CalendarResponse = {
  data: Array<{
    date: { gregorian: { date: string; day: string } };
    timings: Record<string, string>;
  }>;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`calendar:${ip}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = schema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lng: request.nextUrl.searchParams.get("lng"),
    method: request.nextUrl.searchParams.get("method") ?? "3",
    month: request.nextUrl.searchParams.get("month"),
    year: request.nextUrl.searchParams.get("year")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid calendar query" }, { status: 400 });
  }

  const { lat, lng, month, year, method } = parsed.data;
  const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${method}`;

  try {
    const payload = await cachedJson<CalendarResponse>({ url, revalidate: 7_200, tags: ["prayer-calendar"] });
    const days = payload.data.map((d) => ({
      date: d.date.gregorian.date,
      day: d.date.gregorian.day,
      fajr: d.timings.Fajr,
      dhuhr: d.timings.Dhuhr,
      asr: d.timings.Asr,
      maghrib: d.timings.Maghrib,
      isha: d.timings.Isha
    }));
    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: "Prayer calendar unavailable" }, { status: 502 });
  }
}
