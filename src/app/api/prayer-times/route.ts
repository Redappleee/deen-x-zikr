import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildIslamicApiPrayerUrl, hasIslamicApiKey } from "@/lib/islamic-api";
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

type IslamicApiSingleResponse = {
  code: number;
  status: string;
  data: {
    times: Record<string, string>;
    date: {
      readable: string;
      hijri: {
        date: string;
        month: { en: string };
        year: string;
      };
      gregorian: {
        date: string;
      };
    };
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
    timezone?: {
      name?: string;
    };
    prohibited_times?: {
      sunrise?: { start?: string; end?: string };
      noon?: { start?: string; end?: string };
      sunset?: { start?: string; end?: string };
    };
  };
};

function mapTimings(times: Record<string, string>) {
  return {
    Fajr: times.Fajr,
    Sunrise: times.Sunrise,
    Dhuhr: times.Dhuhr,
    Asr: times.Asr,
    Sunset: times.Sunset ?? times.Maghrib,
    Maghrib: times.Maghrib,
    Isha: times.Isha
  };
}

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

  try {
    if (hasIslamicApiKey()) {
      const isoDate = date ? `${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}` : undefined;
      const [shafiPayload, hanafiPayload] = await Promise.all([
        cachedJson<IslamicApiSingleResponse>({
          url: buildIslamicApiPrayerUrl({
            lat,
            lng,
            method,
            school: 1,
            date: isoDate
          }),
          revalidate: 900,
          tags: ["prayer-times"]
        }),
        cachedJson<IslamicApiSingleResponse>({
          url: buildIslamicApiPrayerUrl({
            lat,
            lng,
            method,
            school: 2,
            date: isoDate
          }),
          revalidate: 900,
          tags: ["prayer-times"]
        })
      ]);

      return NextResponse.json({
        date: shafiPayload.data.date.gregorian.date,
        readableDate: shafiPayload.data.date.readable,
        timezone: shafiPayload.data.timezone?.name ?? "Local",
        locationName: locationName ?? "Your location",
        methodId: method,
        timings: mapTimings(shafiPayload.data.times),
        schools: {
          shafi: mapTimings(shafiPayload.data.times),
          hanafi: mapTimings(hanafiPayload.data.times)
        },
        prohibitedTimes: shafiPayload.data.prohibited_times
          ? {
              sunrise:
                shafiPayload.data.prohibited_times.sunrise?.start && shafiPayload.data.prohibited_times.sunrise?.end
                  ? {
                      start: shafiPayload.data.prohibited_times.sunrise.start,
                      end: shafiPayload.data.prohibited_times.sunrise.end
                    }
                  : undefined,
              noon:
                shafiPayload.data.prohibited_times.noon?.start && shafiPayload.data.prohibited_times.noon?.end
                  ? {
                      start: shafiPayload.data.prohibited_times.noon.start,
                      end: shafiPayload.data.prohibited_times.noon.end
                    }
                  : undefined,
              sunset:
                shafiPayload.data.prohibited_times.sunset?.start && shafiPayload.data.prohibited_times.sunset?.end
                  ? {
                      start: shafiPayload.data.prohibited_times.sunset.start,
                      end: shafiPayload.data.prohibited_times.sunset.end
                    }
                  : undefined
            }
          : null,
        hijri: `${shafiPayload.data.date.hijri.date} ${shafiPayload.data.date.hijri.month.en} ${shafiPayload.data.date.hijri.year}`,
        latitude: lat,
        longitude: lng,
        qibla: shafiPayload.data.qibla
          ? {
              degrees: shafiPayload.data.qibla.direction?.degrees ?? null,
              from: shafiPayload.data.qibla.direction?.from ?? null,
              distanceKm: shafiPayload.data.qibla.distance?.value ?? null,
              distanceUnit: shafiPayload.data.qibla.distance?.unit ?? null
            }
          : null
      });
    }

    const endpoint = date
      ? `https://api.aladhan.com/v1/timings/${date}?latitude=${lat}&longitude=${lng}&method=${method}`
      : `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}`;
    const payload = await cachedJson<AladhanResponse>({ url: endpoint, revalidate: 900, tags: ["prayer-times"] });

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
        Sunset: payload.data.timings.Sunset ?? payload.data.timings.Maghrib,
        Maghrib: payload.data.timings.Maghrib,
        Isha: payload.data.timings.Isha
      },
      schools: {
        shafi: {
          Fajr: payload.data.timings.Fajr,
          Sunrise: payload.data.timings.Sunrise,
          Dhuhr: payload.data.timings.Dhuhr,
          Asr: payload.data.timings.Asr,
          Sunset: payload.data.timings.Sunset ?? payload.data.timings.Maghrib,
          Maghrib: payload.data.timings.Maghrib,
          Isha: payload.data.timings.Isha
        },
        hanafi: {
          Fajr: payload.data.timings.Fajr,
          Sunrise: payload.data.timings.Sunrise,
          Dhuhr: payload.data.timings.Dhuhr,
          Asr: payload.data.timings.Asr,
          Sunset: payload.data.timings.Sunset ?? payload.data.timings.Maghrib,
          Maghrib: payload.data.timings.Maghrib,
          Isha: payload.data.timings.Isha
        }
      },
      prohibitedTimes: null,
      hijri: `${payload.data.date.hijri.date} ${payload.data.date.hijri.month.en} ${payload.data.date.hijri.year}`,
      latitude: payload.data.meta.latitude,
      longitude: payload.data.meta.longitude,
      qibla: null
    });
  } catch {
    return NextResponse.json({ error: "Prayer times unavailable" }, { status: 502 });
  }
}
