const ISLAMIC_API_BASE_URL = "https://islamicapi.com/api/v1/prayer-time/";

export function getIslamicApiKey(): string | null {
  return process.env.ISLAMIC_API_KEY ?? null;
}

export function hasIslamicApiKey(): boolean {
  return Boolean(getIslamicApiKey());
}

type PrayerQueryParams = {
  lat: number;
  lng: number;
  method: number;
  school?: number;
  date?: string;
};

export function buildIslamicApiPrayerUrl(params: PrayerQueryParams): string {
  const searchParams = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lng),
    method: String(params.method),
    school: String(params.school ?? 1),
    api_key: getIslamicApiKey() ?? ""
  });

  if (params.date) {
    searchParams.set("date", params.date);
  }

  return `${ISLAMIC_API_BASE_URL}?${searchParams.toString()}`;
}
