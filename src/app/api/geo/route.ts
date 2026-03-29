import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { cachedJson } from "@/lib/server-fetch";

const searchSchema = z.object({
  q: z.string().min(2).max(100)
});

const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

type NominatimReverseResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  addresstype?: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
};

function buildReverseLabel(data: NominatimReverseResult): string {
  const address = data.address;
  if (!address) return data.display_name;

  const parts = [
    address.suburb ?? address.neighbourhood ?? address.village,
    address.city ?? address.town ?? address.county,
    address.state_district ?? address.state,
    address.country
  ].filter(Boolean) as string[];

  const deduped = parts.filter((part, index) => parts.indexOf(part) === index);
  return deduped.slice(0, 3).join(", ") || data.display_name;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`geo:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");

  if (latParam !== null && lngParam !== null) {
    const parsedReverse = reverseSchema.safeParse({ lat: latParam, lng: lngParam });
    if (!parsedReverse.success) {
      return NextResponse.json({ error: "Invalid reverse geo query" }, { status: 400 });
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${parsedReverse.data.lat}&lon=${parsedReverse.data.lng}`;
      const data = await cachedJson<NominatimReverseResult>({ url, revalidate: 3_600, tags: ["geo"] });

      return NextResponse.json({
        result: {
          id: data.place_id,
          label: buildReverseLabel(data),
          lat: Number(data.lat),
          lng: Number(data.lon),
          type: data.addresstype ?? "gps"
        }
      });
    } catch {
      return NextResponse.json({ error: "Failed to reverse geocode location" }, { status: 502 });
    }
  }

  const parsedSearch = searchSchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  if (!parsedSearch.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(
      parsedSearch.data.q
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
