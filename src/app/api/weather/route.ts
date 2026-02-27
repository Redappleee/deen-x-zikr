import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cachedJson } from "@/lib/server-fetch";
import { isRateLimited } from "@/lib/rate-limit";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

type WeatherResponse = {
  current?: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Stormy";
  return "Unknown";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`weather:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = schema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lng: request.nextUrl.searchParams.get("lng")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weather query" }, { status: 400 });
  }

  const { lat, lng } = parsed.data;

  try {
    const payload = await cachedJson<WeatherResponse>({
      url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m`,
      revalidate: 900,
      tags: ["weather"]
    });

    if (!payload.current) {
      return NextResponse.json({ error: "Weather unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      temperatureC: payload.current.temperature_2m,
      weatherCode: payload.current.weather_code,
      weatherLabel: weatherLabel(payload.current.weather_code),
      windKmh: payload.current.wind_speed_10m
    });
  } catch {
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
  }
}
