import type { PushSubscriptionDoc } from "@/lib/push/types";
import { cachedJson } from "@/lib/server-fetch";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

type PrayerTimingPayload = {
  data: {
    timings: Record<string, string>;
  };
};

function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const [day, month, year] = formatter.format(date).split("/");
  return `${day}-${month}-${year}`;
}

function getMinutesInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const [hourText, minuteText] = formatter.format(date).split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function parsePrayerMinutes(timing: string | undefined): number | null {
  if (!timing) return null;
  const matched = timing.match(/^(\d{1,2}):(\d{2})/);
  if (!matched) return null;
  return Number(matched[1]) * 60 + Number(matched[2]);
}

export async function getDuePrayerNotification(
  subscription: PushSubscriptionDoc,
  now: Date,
  windowMinutes = 10
): Promise<{ key: string; prayer: string; startsInMinutes: number } | null> {
  const currentDate = formatDateInTimezone(now, subscription.timezone);

  const payload = await cachedJson<PrayerTimingPayload>({
    url: `https://api.aladhan.com/v1/timings/${currentDate}?latitude=${subscription.lat}&longitude=${subscription.lng}&method=${subscription.method}`,
    revalidate: 120,
    tags: ["prayer-dispatch"]
  });

  const nowMinutes = getMinutesInTimezone(now, subscription.timezone);

  for (const prayer of PRAYERS) {
    const prayerMinutes = parsePrayerMinutes(payload.data.timings[prayer]);
    if (prayerMinutes === null) continue;

    const delta = prayerMinutes - nowMinutes;
    if (delta < 0 || delta > windowMinutes) continue;

    return {
      key: `${currentDate}-${prayer}`,
      prayer,
      startsInMinutes: delta
    };
  }

  return null;
}
