import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  method: z.coerce.number().int().min(1).max(25).default(3),
  date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/).optional(),
  radius: z.coerce.number().int().min(500).max(20000).default(10000)
});

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

type GeoapifyPlace = {
  properties?: {
    place_id?: string;
    name?: string;
    formatted?: string;
    lat?: number;
    lon?: number;
  };
};

type GeoapifyPlacesResponse = {
  features?: GeoapifyPlace[];
};

type NominatimMosqueResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  name?: string;
};

type PrayerProviderResponse = {
  data: {
    timings: Record<string, string>;
  };
};

type MosquePrayerTimings = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const UPSTREAM_TIMEOUT_MS = 8000;
const GEOAPIFY_CATEGORY = "religion.place_of_worship.islam";

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatSecondaryLabel(tags?: Record<string, string>): string | null {
  if (!tags) return null;

  const pieces = [tags["addr:suburb"], tags["addr:city"], tags["addr:state"], tags["addr:country"]].filter(Boolean);
  if (pieces.length > 0) {
    return pieces.join(", ");
  }

  return tags["operator"] ?? tags["brand"] ?? null;
}

function normalizeMosqueName(tags?: Record<string, string>, fallbackId?: number): string {
  return tags?.name ?? tags?.["name:en"] ?? tags?.official_name ?? `Mosque ${fallbackId ?? ""}`.trim();
}

function getGeoapifyApiKey(): string | null {
  return process.env.GEOAPIFY_API_KEY ?? null;
}

async function fetchJsonWithTimeout<T>(url: string, revalidate: number): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: {
        revalidate,
        tags: ["nearby-mosques"]
      },
      headers: {
        "User-Agent": "DeenXZikr/1.0"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("aborted") || message.includes("timeout")) {
      throw new Error("Nearby mosque provider timed out.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchGeoapifyNearby(lat: number, lng: number, radius: number): Promise<OverpassElement[]> {
  const apiKey = getGeoapifyApiKey();
  if (!apiKey) {
    return [];
  }

  const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(
    GEOAPIFY_CATEGORY
  )}&filter=circle:${lng},${lat},${radius}&bias=proximity:${lng},${lat}&limit=10&apiKey=${encodeURIComponent(apiKey)}`;
  const data = await fetchJsonWithTimeout<GeoapifyPlacesResponse>(url, 1800);
  const mappedPlaces = (data.features ?? []).map((place, index): OverpassElement | null => {
      const placeLat = place.properties?.lat;
      const placeLng = place.properties?.lon;
      if (typeof placeLat !== "number" || typeof placeLng !== "number") {
        return null;
      }

      return {
        id: Number(place.properties?.place_id?.replace(/\D/g, "").slice(0, 12) || `${Date.now()}${index}`),
        lat: placeLat,
        lon: placeLng,
        tags: {
          name: place.properties?.name ?? "Mosque",
          "addr:city": place.properties?.formatted ?? ""
        }
      } satisfies OverpassElement;
    });

  return mappedPlaces.filter((entry): entry is OverpassElement => entry !== null);
}

async function fetchNearbyMosques(lat: number, lng: number, radius: number): Promise<OverpassElement[]> {
  const query = `[out:json][timeout:25];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  node["building"="mosque"](around:${radius},${lat},${lng});
  way["building"="mosque"](around:${radius},${lat},${lng});
  relation["building"="mosque"](around:${radius},${lat},${lng});
  node["name"~"mosque|masjid|jame|jamia|مسجد",i](around:${radius},${lat},${lng});
  way["name"~"mosque|masjid|jame|jamia|مسجد",i](around:${radius},${lat},${lng});
  relation["name"~"mosque|masjid|jame|jamia|مسجد",i](around:${radius},${lat},${lng});
);
out center tags qt;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const data = await fetchJsonWithTimeout<OverpassResponse>(`${endpoint}?data=${encodeURIComponent(query)}`, 1800).catch(() => null);
    if (!data) {
      continue;
    }
    return data.elements;
  }

  throw new Error("Unable to load nearby mosques");
}

async function fetchNearbyMosquesViaNominatim(lat: number, lng: number, radius: number): Promise<OverpassElement[]> {
  const latDelta = radius / 111_320;
  const lngDelta = radius / (111_320 * Math.max(Math.cos(toRadians(lat)), 0.2));
  const left = lng - lngDelta;
  const right = lng + lngDelta;
  const top = lat + latDelta;
  const bottom = lat - latDelta;
  const queries = ["mosque", "masjid", "islamic center"];

  const responses = await Promise.all(
    queries.map((query) =>
      fetchJsonWithTimeout<NominatimMosqueResult[]>(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&bounded=1&viewbox=${left},${top},${right},${bottom}&q=${encodeURIComponent(
          query
        )}`,
        1800
      ).catch(() => [])
    )
  );

  return responses
    .flat()
    .map((item) => ({
      id: item.place_id,
      lat: Number(item.lat),
      lon: Number(item.lon),
      tags: {
        name: item.name ?? item.display_name.split(",")[0]?.trim() ?? "Mosque",
        "addr:city": item.display_name
      }
    }));
}

async function fetchAreaPrayerTimes(lat: number, lng: number, method: number, date?: string): Promise<MosquePrayerTimings> {
  const datedSuffix = date ? `/${date}` : "";
  const payload = await fetchJsonWithTimeout<PrayerProviderResponse>(
    `https://api.aladhan.com/v1/timings${datedSuffix}?latitude=${lat}&longitude=${lng}&method=${method}`,
    900
  );

  return {
    Fajr: payload.data.timings.Fajr,
    Dhuhr: payload.data.timings.Dhuhr,
    Asr: payload.data.timings.Asr,
    Maghrib: payload.data.timings.Maghrib,
    Isha: payload.data.timings.Isha
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`nearby-mosques:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = querySchema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lng: request.nextUrl.searchParams.get("lng"),
    method: request.nextUrl.searchParams.get("method") ?? "3",
    date: request.nextUrl.searchParams.get("date") ?? undefined,
    radius: request.nextUrl.searchParams.get("radius") ?? "3000"
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mosque query" }, { status: 400 });
  }

  if (!getGeoapifyApiKey()) {
    return NextResponse.json(
      { error: "Geoapify API is not configured. Add GEOAPIFY_API_KEY to enable nearby mosque finder." },
      { status: 503 }
    );
  }

  const { lat, lng, method, date, radius } = parsed.data;

  try {
    const areaTimings = await fetchAreaPrayerTimes(lat, lng, method, date).catch(() => null);

    let rawElements = await fetchGeoapifyNearby(lat, lng, radius).catch(() => []);
    if (rawElements.length < 3 && radius < 10000) {
      const widerGeoapifyPlaces = await fetchGeoapifyNearby(lat, lng, Math.min(radius * 2, 10000)).catch(() => []);
      rawElements = [...rawElements, ...widerGeoapifyPlaces];
    }
    if (rawElements.length < 2) {
      const [primaryOverpass, nominatimFallback] = await Promise.all([
        fetchNearbyMosques(lat, lng, radius).catch(() => []),
        fetchNearbyMosquesViaNominatim(lat, lng, radius).catch(() => [])
      ]);
      rawElements = [...rawElements, ...primaryOverpass, ...nominatimFallback];
    }

    const mosques = rawElements
      .map((element) => {
        const mosqueLat = element.lat ?? element.center?.lat;
        const mosqueLng = element.lon ?? element.center?.lon;
        if (typeof mosqueLat !== "number" || typeof mosqueLng !== "number") {
          return null;
        }

        return {
          id: element.id,
          name: normalizeMosqueName(element.tags, element.id),
          label: formatSecondaryLabel(element.tags),
          lat: mosqueLat,
          lng: mosqueLng,
          distanceKm: distanceInKm(lat, lng, mosqueLat, mosqueLng)
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .filter((item, index, array) => array.findIndex((entry) => entry.name === item.name && Math.abs(entry.distanceKm - item.distanceKm) < 0.05) === index)
      .slice(0, 8);

    const fallbackTimings = areaTimings ?? {
      Fajr: "--:--",
      Dhuhr: "--:--",
      Asr: "--:--",
      Maghrib: "--:--",
      Isha: "--:--"
    };

    const successfulMosques = mosques.map((mosque) => ({
      id: mosque.id,
      name: mosque.name,
      label: mosque.label,
      latitude: mosque.lat,
      longitude: mosque.lng,
      distanceKm: Number(mosque.distanceKm.toFixed(2)),
      timings: fallbackTimings
    }));

    return NextResponse.json({
      radius,
      count: successfulMosques.length,
      note: "Nearby mosques use Geoapify Places when available, with OSM fallback. Listed prayer times use your selected area's schedule as a fast fallback. Actual iqamah/jamaat times may differ by mosque.",
      mosques: successfulMosques
    });
  } catch {
    return NextResponse.json({ error: "Nearby mosques are temporarily unavailable. Please try again shortly." }, { status: 502 });
  }
}
