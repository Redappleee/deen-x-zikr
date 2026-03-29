"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, Loader2, LocateFixed, MapPinned, Minus, Plus, Search, Sunrise, Sunset } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { PRAYER_METHODS } from "@/lib/constants";
import { formatSeconds, getLocalDateKey, getProgressPercent, parsePrayerDateTime, secondsBetween, toTimeLabel } from "@/lib/utils";
import { getPushSubscription, subscribeBrowserPush, toWebPushJSON } from "@/lib/push/client";
import { TRACKED_PRAYER_NAMES, useAppStore, type TrackedPrayerName } from "@/store/use-app-store";
import type { PrayerResponse, PrayerTimings } from "@/types";

type GeoResult = {
  id: number;
  label: string;
  lat: number;
  lng: number;
  type: string;
};

type CalendarDay = {
  date: string;
  day: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type NearbyMosque = {
  id: number;
  name: string;
  label: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  timings: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
};

type NearbyMosqueResponse = {
  radius: number;
  count: number;
  note: string;
  mosques: NearbyMosque[];
};

const MOSQUE_RADII = [
  { value: 1000, label: "1 km" },
  { value: 3000, label: "3 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
  { value: 20000, label: "20 km" },
  { value: 30000, label: "30 km" }
] as const;

const TODAY_PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

function formatPrayerDate(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

export function SalahCenter(): React.JSX.Element {
  const prayerMethod = useAppStore((state) => state.prayerMethod);
  const setPrayerMethod = useAppStore((state) => state.setPrayerMethod);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const notificationLeadMinutes = useAppStore((state) => state.notificationLeadMinutes);
  const notificationPrayerPrefs = useAppStore((state) => state.notificationPrayerPrefs);
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const setPreferredLocation = useAppStore((state) => state.setPreferredLocation);
  const prayersCompletedToday = useAppStore((state) => state.prayersCompletedToday);
  const adjustPrayersCompleted = useAppStore((state) => state.adjustPrayersCompleted);
  const setPrayerCompleted = useAppStore((state) => state.setPrayerCompleted);
  const prayerCompletionByDate = useAppStore((state) => state.prayerCompletionByDate);
  const ensureDailyProgressDate = useAppStore((state) => state.ensureDailyProgressDate);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [location, setLocation] = useState<GeoResult | null>(
    preferredLocation
      ? {
          id: Date.now(),
          label: preferredLocation.label,
          lat: preferredLocation.lat,
          lng: preferredLocation.lng,
          type: preferredLocation.type ?? "stored"
        }
      : null
  );
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [prayerData, setPrayerData] = useState<PrayerResponse | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [pushTestBusy, setPushTestBusy] = useState(false);
  const [pushNotice, setPushNotice] = useState<string | null>(null);
  const [pushNoticeError, setPushNoticeError] = useState(false);
  const [mosqueRadius, setMosqueRadius] = useState<number>(20000);
  const [nearbyMosques, setNearbyMosques] = useState<NearbyMosque[]>([]);
  const [mosquesNote, setMosquesNote] = useState<string | null>(null);
  const [mosquesLoading, setMosquesLoading] = useState(false);
  const [mosquesError, setMosquesError] = useState<string | null>(null);
  const mosqueRequestRef = useRef(0);

  const fetchPrayerData = useCallback(
    async (lat: number, lng: number, locationName: string, targetDate: Date) => {
      setLoading(true);
      setError(null);

      try {
        const date = formatPrayerDate(targetDate);
        const res = await fetch(
          `/api/prayer-times?lat=${lat}&lng=${lng}&method=${prayerMethod}&date=${date}&locationName=${encodeURIComponent(
            locationName
          )}`
        );
        if (!res.ok) {
          throw new Error("Failed to load prayer timings");
        }

        const data = (await res.json()) as PrayerResponse;
        setPrayerData(data);
      } catch {
        setError("Unable to fetch prayer times. Check connection or try a different location.");
      } finally {
        setLoading(false);
      }
    },
    [prayerMethod]
  );

  const fetchCalendar = useCallback(
    async (lat: number, lng: number, date: Date) => {
      try {
        const res = await fetch(
          `/api/prayer-calendar?lat=${lat}&lng=${lng}&method=${prayerMethod}&month=${date.getMonth() + 1}&year=${date.getFullYear()}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as { days: CalendarDay[] };
        setCalendarDays(json.days);
      } catch {
        setCalendarDays([]);
      }
    },
    [prayerMethod]
  );

  const fetchNearbyMosques = useCallback(
    async (lat: number, lng: number, targetDate: Date) => {
      const requestId = mosqueRequestRef.current + 1;
      mosqueRequestRef.current = requestId;
      setMosquesLoading(true);
      setMosquesError(null);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 12000);

      try {
        const date = formatPrayerDate(targetDate);
        const res = await fetch(`/api/nearby-mosques?lat=${lat}&lng=${lng}&method=${prayerMethod}&date=${date}&radius=${mosqueRadius}`, { signal: controller.signal });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load nearby mosques");
        }

        const data = (await res.json()) as NearbyMosqueResponse;
        if (mosqueRequestRef.current !== requestId) return;
        setNearbyMosques(data.mosques);
        setMosquesNote(data.note);
      } catch (caught) {
        if (mosqueRequestRef.current !== requestId) return;
        setNearbyMosques([]);
        setMosquesNote(null);
        const message = caught instanceof Error ? caught.message : "Nearby mosques took too long to load. Try again or change the radius.";
        setMosquesError(message.toLowerCase().includes("aborted") ? "Nearby mosques took too long to load. Try again or change the radius." : message);
      } finally {
        window.clearTimeout(timer);
        if (mosqueRequestRef.current !== requestId) return;
        setMosquesLoading(false);
      }
    },
    [mosqueRadius, prayerMethod]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    const dailyReset = window.setInterval(() => {
      ensureDailyProgressDate();
    }, 60_000);

    ensureDailyProgressDate();

    return () => {
      window.clearInterval(id);
      window.clearInterval(dailyReset);
    };
  }, [ensureDailyProgressDate]);

  useEffect(() => {
    if (!location) return;
    void fetchPrayerData(location.lat, location.lng, location.label, selectedDate);
    void fetchCalendar(location.lat, location.lng, selectedDate);
    void fetchNearbyMosques(location.lat, location.lng, selectedDate);
  }, [location, selectedDate, fetchPrayerData, fetchCalendar, fetchNearbyMosques]);

  useEffect(() => {
    if (location || !preferredLocation) return;
    setLocation({
      id: Date.now(),
      label: preferredLocation.label,
      lat: preferredLocation.lat,
      lng: preferredLocation.lng,
      type: preferredLocation.type ?? "stored"
    });
    setQuery(preferredLocation.label);
  }, [location, preferredLocation]);

  useEffect(() => {
    if (!location) return;
    setPreferredLocation({
      label: location.label,
      lat: location.lat,
      lng: location.lng,
      type: location.type
    });
  }, [location, setPreferredLocation]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/geo?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setSearchResults([]);
        return;
      }
      const json = (await res.json()) as { results: GeoResult[] };
      setSearchResults(json.results);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  const syncPushSettings = useCallback(
    async (subscription: PushSubscription) => {
      if (!location) {
        throw new Error("Select a location before enabling prayer reminders.");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: toWebPushJSON(subscription),
          lat: location.lat,
          lng: location.lng,
          method: prayerMethod,
          locationName: location.label,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          leadMinutes: notificationLeadMinutes,
          prayerPrefs: notificationPrayerPrefs
        })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save push subscription.");
      }
    },
    [location, notificationLeadMinutes, notificationPrayerPrefs, prayerMethod]
  );

  useEffect(() => {
    void getPushSubscription()
      .then((subscription) => {
        if (!subscription) {
          setPushEndpoint(null);
          setNotificationsEnabled(false);
          return;
        }
        setPushEndpoint(subscription.endpoint);
        setNotificationsEnabled(true);
      })
      .catch(() => undefined);
  }, [setNotificationsEnabled]);

  useEffect(() => {
    if (!notificationsEnabled || !location) return;

    void getPushSubscription()
      .then((subscription) => {
        if (!subscription) return;
        return syncPushSettings(subscription);
      })
      .catch(() => undefined);
  }, [notificationsEnabled, location, prayerMethod, syncPushSettings]);

  useEffect(() => {
    if (!pushNotice) return;
    const timer = window.setTimeout(() => setPushNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [pushNotice]);

  const enablePushReminders = useCallback(async () => {
    if (!location) {
      setError("Select a location before enabling prayer reminders.");
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("Notifications are not supported on this browser.");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setError("Service workers are not supported on this browser.");
      return;
    }

    setPushBusy(true);
    setError(null);
    setPushNotice(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationsEnabled(false);
        setError("Notification permission denied.");
        return;
      }

      const keyRes = await fetch("/api/push/public-key");
      if (!keyRes.ok) {
        const payload = (await keyRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Push key unavailable.");
      }

      const keyPayload = (await keyRes.json()) as { publicKey: string };
      const subscription = await subscribeBrowserPush(keyPayload.publicKey);
      await syncPushSettings(subscription);
      setPushEndpoint(subscription.endpoint);
      setNotificationsEnabled(true);
      setPushNoticeError(false);
      setPushNotice("Prayer push is enabled.");
    } catch (caught) {
      setNotificationsEnabled(false);
      setError(caught instanceof Error ? caught.message : "Could not enable push reminders.");
    } finally {
      setPushBusy(false);
    }
  }, [location, setNotificationsEnabled, syncPushSettings]);

  const disablePushReminders = useCallback(async () => {
    setPushBusy(true);
    setError(null);
    setPushNotice(null);

    try {
      const subscription = await getPushSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }

      setPushEndpoint(null);
      setNotificationsEnabled(false);
      setPushNoticeError(false);
      setPushNotice("Prayer push is disabled.");
    } catch {
      setError("Unable to disable push reminders.");
    } finally {
      setPushBusy(false);
    }
  }, [setNotificationsEnabled]);

  const sendTestPush = useCallback(async () => {
    setPushTestBusy(true);
    setPushNotice(null);
    setError(null);

    try {
      const subscription = await getPushSubscription();
      if (!subscription) {
        throw new Error("No active push subscription found. Enable Prayer Push first.");
      }

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          subscription: toWebPushJSON(subscription)
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to send test push.");
      }

      setPushNoticeError(false);
      setPushNotice("Test push sent. If you don't see it, check browser and OS notification settings.");
    } catch (caught) {
      setPushNoticeError(true);
      setPushNotice(caught instanceof Error ? caught.message : "Push test failed.");
    } finally {
      setPushTestBusy(false);
    }
  }, []);

  const nextPrayerInfo = useMemo(() => {
    if (!prayerData) return null;

    const baseDate = format(selectedDate, "yyyy-MM-dd");
    const prayers = TODAY_PRAYER_NAMES.map((name) => ({
      name,
      time: parsePrayerDateTime(baseDate, toTimeLabel(prayerData.timings[name]))
    }));

    const next = prayers.find((entry) => entry.time > now) ?? {
      name: "Fajr",
      time: addDays(prayers[0].time, 1)
    };

    const previousIndex = prayers.findIndex((entry) => entry.name === next.name) - 1;
    const start =
      previousIndex >= 0 ? prayers[previousIndex].time : new Date(new Date(baseDate).setHours(0, 0, 0, 0));

    const remaining = secondsBetween(now, next.time);
    const progress = getProgressPercent(start, next.time, now);

    return {
      nextName: next.name,
      nextTime: toTimeLabel(prayerData.timings[next.name as keyof typeof prayerData.timings] ?? "00:00"),
      remaining,
      progress
    };
  }, [prayerData, selectedDate, now]);

  const todayPrayerCards = useMemo(() => {
    if (!prayerData) return [];

    const shafi: PrayerTimings = prayerData.schools?.shafi ?? prayerData.timings;
    const hanafi: PrayerTimings = prayerData.schools?.hanafi ?? prayerData.timings;
    const sunrise = prayerData.timings.Sunrise;
    const sunset = prayerData.timings.Sunset ?? prayerData.timings.Maghrib;

    const qazaAfter: Record<(typeof TODAY_PRAYER_NAMES)[number], { shafi: string; hanafi: string }> = {
      Fajr: { shafi: sunrise, hanafi: sunrise },
      Dhuhr: { shafi: shafi.Asr, hanafi: hanafi.Asr },
      Asr: { shafi: sunset, hanafi: sunset },
      Maghrib: { shafi: shafi.Isha, hanafi: hanafi.Isha },
      Isha: { shafi: shafi.Fajr, hanafi: hanafi.Fajr }
    };

    return TODAY_PRAYER_NAMES.map((name) => ({
      name,
      time: toTimeLabel(shafi[name]),
      start: toTimeLabel(shafi[name]),
      qaza: `${name === "Isha" ? "Tomorrow " : ""}${toTimeLabel(qazaAfter[name].shafi)}`
    }));
  }, [prayerData]);

  const solarMoments = useMemo(() => {
    if (!prayerData) return null;

    return {
      sunrise: toTimeLabel(prayerData.timings.Sunrise),
      sunset: toTimeLabel(prayerData.timings.Sunset ?? prayerData.timings.Maghrib)
    };
  }, [prayerData]);

  const jumuahReminder = useMemo(() => {
    const weekday = selectedDate.getDay();
    const days = (5 - weekday + 7) % 7;

    return {
      isFriday: weekday === 5,
      label: weekday === 5 ? "Jumuah is today" : `Jumuah in ${days} day${days === 1 ? "" : "s"}`,
      dhuhrTime: prayerData ? toTimeLabel(prayerData.timings.Dhuhr) : null
    };
  }, [selectedDate, prayerData]);

  const prayerCompletionPercent = Math.min((prayersCompletedToday / 5) * 100, 100);
  const prayerRingCircumference = 2 * Math.PI * 36;
  const prayerTargetReached = prayersCompletedToday >= 5;
  const isViewingToday = formatPrayerDate(selectedDate) === getLocalDateKey(now);
  const todayPrayerCompletion = prayerCompletionByDate[getLocalDateKey(now)];

  const prayerCounterGuide = useMemo(() => {
    if (!prayerData || !isViewingToday) {
      return {
        activePrayer: null as TrackedPrayerName | null,
        suggestedPrayer: null as TrackedPrayerName | null,
        canQuickMark: false,
        helper: "Open today’s timings to get a live suggestion for the current salah."
      };
    }

    const entries = TODAY_PRAYER_NAMES.map((name) => ({
      name,
      time: parsePrayerDateTime(prayerData.date, prayerData.timings[name])
    }));

    const activeIndex = entries.findIndex((entry, index) => {
      const next = entries[index + 1];
      return entry.time <= now && (!next || now < next.time);
    });

    const availableCount = entries.filter((entry) => entry.time <= now).length;
    const activePrayer = activeIndex >= 0 ? entries[activeIndex].name : null;
    const suggestedPrayer =
      TRACKED_PRAYER_NAMES.find((prayer) => {
        const entry = entries.find((item) => item.name === prayer);
        return entry && entry.time <= now && !todayPrayerCompletion?.[prayer];
      }) ?? null;

    if (suggestedPrayer) {
      return {
        activePrayer,
        suggestedPrayer,
        canQuickMark: true,
        helper:
          activePrayer === suggestedPrayer
            ? `${suggestedPrayer} time is live now. Mark it complete when you finish.`
            : `${suggestedPrayer} is the next unlogged prayer for today.`
      };
    }

    if (availableCount === 0) {
      return {
        activePrayer: null,
        suggestedPrayer: null,
        canQuickMark: false,
        helper: `Fajr begins at ${toTimeLabel(prayerData.timings.Fajr)}. The quick mark button will appear after that.`
      };
    }

    if (prayerTargetReached) {
      return {
        activePrayer,
        suggestedPrayer: null,
        canQuickMark: false,
        helper: "All five prayers are logged for today. May Allah accept them."
      };
    }

    return {
      activePrayer,
      suggestedPrayer: null,
      canQuickMark: false,
      helper: activePrayer ? `${activePrayer} is the current prayer window.` : "Prayer suggestions update automatically through the day."
    };
  }, [isViewingToday, now, prayerData, prayerTargetReached, todayPrayerCompletion]);

  const todaySectionCards = useMemo(() => {
    if (!prayerData) return [];

    const asrTime = toTimeLabel((prayerData.schools?.shafi ?? prayerData.timings).Asr);

    return [
      ...todayPrayerCards.map((item) => ({
        ...item,
        completed: isViewingToday ? (todayPrayerCompletion?.[item.name] ?? false) : false
      })),
      {
        name: "Jumuah",
        time: jumuahReminder.dhuhrTime ?? "--:--",
        start: jumuahReminder.dhuhrTime ?? "--:--",
        qaza: asrTime,
        note: jumuahReminder.label
      }
    ];
  }, [isViewingToday, jumuahReminder, prayerData, todayPrayerCompletion, todayPrayerCards]);

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">Search City / Town / Village</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-emerald-100 bg-white px-10 py-2.5 text-sm outline-none ring-emerald-500 transition focus:ring dark:border-emerald-900/60 dark:bg-dark-700"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try even smaller places (village / district)"
                value={query}
              />
            </div>
            {searchResults.length > 0 ? (
              <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-emerald-100 bg-white p-2 text-sm dark:border-emerald-900/50 dark:bg-dark-700">
                {searchResults.map((result) => (
                  <button
                    className="mb-1 w-full rounded-xl px-3 py-2 text-left transition hover:bg-emerald-50 dark:hover:bg-dark-800"
                    key={result.id}
                    onClick={() => {
                      setLocation(result);
                      setQuery(result.label);
                      setSearchResults([]);
                    }}
                    type="button"
                  >
                    {result.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:shadow-aura dark:border-emerald-900/50 dark:bg-dark-700 dark:text-emerald-200"
            onClick={() => {
              if (!("geolocation" in navigator)) return;
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const lat = position.coords.latitude;
                  const lng = position.coords.longitude;
                  let detectedLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                  let detectedType = "gps";

                  try {
                    const res = await fetch(`/api/geo?lat=${lat}&lng=${lng}`);
                    if (res.ok) {
                      const json = (await res.json()) as { result?: GeoResult };
                      if (json.result?.label) {
                        detectedLabel = json.result.label;
                        detectedType = json.result.type ?? "gps";
                      }
                    }
                  } catch {
                    // Fall back to coordinates if reverse geocoding is unavailable.
                  }

                  const coords: GeoResult = {
                    id: Date.now(),
                    label: detectedLabel,
                    lat,
                    lng,
                    type: detectedType
                  };
                  setLocation(coords);
                  setQuery(detectedLabel);
                },
                () => setError("Location access denied. Use city search instead.")
              );
            }}
            type="button"
          >
            <LocateFixed className="h-4 w-4" />
            Auto Detect
          </button>

          <select
            className="rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
            onChange={(e) => setPrayerMethod(Number(e.target.value))}
            value={prayerMethod}
          >
            {PRAYER_METHODS.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </select>

          <button
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm dark:border-emerald-900/50 dark:bg-dark-700"
            disabled={pushBusy}
            onClick={() => {
              if (notificationsEnabled) {
                void disablePushReminders();
                return;
              }
              void enablePushReminders();
            }}
            type="button"
          >
            {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {notificationsEnabled ? "Disable Prayer Push" : "Enable Prayer Push"}
          </button>
          {notificationsEnabled && pushEndpoint ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-white px-4 py-2.5 text-sm text-gold-700 dark:border-gold-600/50 dark:bg-dark-700 dark:text-gold-200"
              disabled={pushTestBusy}
              onClick={() => void sendTestPush()}
              type="button"
            >
              {pushTestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send Test Push
            </button>
          ) : null}
        </div>
        {pushNotice ? (
          <p className={`mt-2 text-xs ${pushNoticeError ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>{pushNotice}</p>
        ) : null}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Web push reminders run in the background and sync your current location + prayer method.
        </p>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="relative overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Today</p>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{prayerData?.locationName ?? "Select a location"}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{prayerData ? `${prayerData.readableDate} • ${prayerData.hijri}` : "Awaiting location"}</p>
              {prayerData ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Start and qaza windows are shown for each prayer.</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-emerald-100 px-3 py-1.5 text-xs dark:border-emerald-900/50"
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-full border border-emerald-100 px-3 py-1.5 text-xs dark:border-emerald-900/50"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching prayer times...
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

          <AnimatePresence mode="wait">
            {prayerData ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                key={prayerData.date + prayerData.locationName + prayerMethod}
                transition={{ duration: 0.32 }}
              >
                {todaySectionCards.map((item) => (
                  <div
                    className={`rounded-2xl border px-4 py-3 ${
                      item.name === "Jumuah"
                        ? "border-gold-200/80 bg-[linear-gradient(135deg,rgba(255,248,232,0.96),rgba(255,255,255,0.96))] dark:border-gold-700/30 dark:bg-[linear-gradient(135deg,rgba(46,36,18,0.28),rgba(15,23,42,0.86))]"
                        : "border-emerald-100/80 bg-white/80 dark:border-emerald-900/50 dark:bg-dark-700"
                    }`}
                    key={item.name}
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.name}</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{item.time}</p>
                    {"note" in item ? <p className="mt-1 text-[11px] text-gold-700 dark:text-gold-200">{item.note}</p> : null}
                    {"completed" in item ? (
                      <button
                        className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] transition ${
                          item.completed
                            ? "border-emerald-300/70 bg-emerald-100/80 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/45 dark:text-emerald-100"
                            : "border-slate-200/80 bg-white/70 text-slate-600 hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700/70 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:border-emerald-800/50 dark:hover:text-emerald-200"
                        }`}
                        onClick={() => setPrayerCompleted(item.name, !item.completed)}
                        type="button"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {item.completed ? "Completed" : "Mark Complete"}
                      </button>
                    ) : null}
                    <div className="mt-3 space-y-1.5 rounded-2xl border border-emerald-100/70 bg-emerald-50/55 p-3 text-[11px] dark:border-emerald-900/40 dark:bg-emerald-950/15">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Start</span>
                        <span className="text-right font-medium text-slate-700 dark:text-slate-200">{item.start}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Qaza</span>
                        <span className="text-right font-medium text-slate-700 dark:text-slate-200">{item.qaza}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {solarMoments ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="relative mt-4 overflow-hidden rounded-3xl border border-gold-200/70 bg-[linear-gradient(135deg,rgba(255,248,232,0.96),rgba(243,251,244,0.96))] p-4 dark:border-gold-700/30 dark:bg-[linear-gradient(135deg,rgba(46,36,18,0.34),rgba(10,36,25,0.42))]"
              initial={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <motion.div
                animate={{ x: ["-10%", "10%", "-10%"], opacity: [0.25, 0.45, 0.25] }}
                className="pointer-events-none absolute inset-y-0 right-[-8rem] w-56 rounded-full bg-gold-200/40 blur-3xl dark:bg-gold-500/10"
                transition={{ duration: 7, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-200">Solar Moments</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
                    <div className="inline-flex items-center gap-2 text-amber-700 dark:text-gold-200">
                      <Sunrise className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-wide">Sunrise</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{solarMoments.sunrise}</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
                    <div className="inline-flex items-center gap-2 text-rose-700 dark:text-gold-200">
                      <Sunset className="h-4 w-4" />
                      <p className="text-xs uppercase tracking-wide">Sunset</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{solarMoments.sunset}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Azan Preview</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Listen to the call to prayer before updating today&apos;s salah progress.</p>
            <audio className="mt-3 w-full" controls preload="none" src="https://www.islamcan.com/audio/adhan/azan1.mp3">
              <track kind="captions" />
            </audio>
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-4 overflow-hidden rounded-3xl border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.88))] p-4 dark:border-emerald-900/40 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(6,95,70,0.16))]"
            initial={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <motion.div
              animate={{ opacity: [0.18, 0.3, 0.18], scale: [0.98, 1.03, 0.98] }}
              className="pointer-events-none absolute -bottom-16 right-[-2rem] h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-500/10"
              transition={{ duration: 6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
            <div className="relative rounded-3xl border border-white/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
              <AnimatePresence>
                {prayerTargetReached ? (
                  <motion.span
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="mb-3 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-200/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-800/40 dark:text-emerald-100"
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All Prayers Logged
                  </motion.span>
                ) : null}
              </AnimatePresence>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <motion.div
                  animate={prayerTargetReached ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  className="relative h-24 w-24 shrink-0"
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88">
                    <circle className="stroke-emerald-100/90 dark:stroke-emerald-950" cx="44" cy="44" fill="none" r="36" strokeWidth="8" />
                    <motion.circle
                      animate={{ strokeDashoffset: prayerRingCircumference - (prayerRingCircumference * prayerCompletionPercent) / 100 }}
                      className="stroke-emerald-500"
                      cx="44"
                      cy="44"
                      fill="none"
                      r="36"
                      strokeDasharray={prayerRingCircumference}
                      strokeLinecap="round"
                      strokeWidth="8"
                      transition={{ duration: 0.55, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <motion.p
                      animate={prayerTargetReached ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      className="text-xl font-semibold text-emerald-900 dark:text-emerald-100"
                      transition={{ duration: 0.65, ease: "easeOut" }}
                    >
                      {prayersCompletedToday}
                    </motion.p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">of 5</p>
                  </div>
                </motion.div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Namaz Counter</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{prayersCompletedToday}/5 prayers</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{prayerCounterGuide.helper}</p>
                  {prayerCounterGuide.activePrayer ? (
                    <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-100/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-200">
                      Live Prayer
                      <span className="text-slate-600 dark:text-slate-300">{prayerCounterGuide.activePrayer}</span>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/55 bg-white/35 text-emerald-700 shadow-[0_8px_24px_rgba(15,157,88,0.16)] backdrop-blur-md transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-45 dark:border-emerald-800/45 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/45"
                      disabled={prayersCompletedToday <= 0}
                      onClick={() => adjustPrayersCompleted(-1)}
                      type="button"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/55 bg-white/35 text-emerald-700 shadow-[0_8px_24px_rgba(15,157,88,0.16)] backdrop-blur-md transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-45 dark:border-emerald-800/45 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/45"
                      disabled={prayersCompletedToday >= 5}
                      onClick={() => adjustPrayersCompleted(1)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-full border border-emerald-200/80 bg-emerald-100/70 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-emerald-800/40 dark:bg-emerald-900/35 dark:text-emerald-100 dark:hover:bg-emerald-900/55"
                      disabled={!prayerCounterGuide.canQuickMark || prayersCompletedToday >= 5}
                      onClick={() => {
                        if (prayerCounterGuide.suggestedPrayer) {
                          setPrayerCompleted(prayerCounterGuide.suggestedPrayer, true);
                        }
                      }}
                      type="button"
                    >
                      {prayerCounterGuide.canQuickMark && prayerCounterGuide.suggestedPrayer
                        ? `Mark ${prayerCounterGuide.suggestedPrayer} complete`
                        : "Waiting for next prayer"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h4 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">Next Prayer Countdown</h4>
            {nextPrayerInfo ? (
              <div className="mt-4 grid place-items-center">
                <div className="relative h-52 w-52">
                  <svg className="h-52 w-52 -rotate-90" viewBox="0 0 120 120">
                    <circle className="stroke-emerald-100 dark:stroke-emerald-950" cx="60" cy="60" fill="none" r="52" strokeWidth="8" />
                    <motion.circle
                      animate={{ strokeDashoffset: 326 - (326 * nextPrayerInfo.progress) / 100 }}
                      className="stroke-emerald-500"
                      cx="60"
                      cy="60"
                      fill="none"
                      r="52"
                      strokeDasharray="326"
                      strokeWidth="8"
                      transition={{ ease: "easeOut", duration: 0.6 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{nextPrayerInfo.nextName}</p>
                    <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">{formatSeconds(nextPrayerInfo.remaining)}</p>
                    <p className="text-sm text-slate-500">at {nextPrayerInfo.nextTime}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Set location to view countdown.</p>
            )}
          </GlassCard>

          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Nearby Mosques</p>
                <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Mosques Around Your Selected Location</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">See nearby masjids in a clean local list.</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                Radius
                <select
                  className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                  onChange={(e) => setMosqueRadius(Number(e.target.value))}
                  value={mosqueRadius}
                >
                  {MOSQUE_RADII.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!location ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Select a location first to see nearby mosques.</p>
            ) : null}

            {mosquesLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding nearby mosques and calculating prayer times...
              </div>
            ) : null}

            {mosquesError ? <p className="mt-4 text-sm text-red-600 dark:text-red-300">{mosquesError}</p> : null}

            {!mosquesLoading && !mosquesError && location ? (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {mosquesNote ? <p className="text-xs text-slate-500 dark:text-slate-400">{mosquesNote}</p> : <span />}
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    {nearbyMosques.length} mosque{nearbyMosques.length === 1 ? "" : "s"} found
                  </p>
                </div>

                {nearbyMosques.length > 0 ? (
                  <div className="mt-4 grid gap-4">
                    {nearbyMosques.map((mosque) => (
                      <div className="rounded-3xl border border-emerald-100/80 bg-white/75 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-dark-700/80" key={mosque.id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              <MapPinned className="h-4 w-4" />
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{mosque.name}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {mosque.label ? `${mosque.label} • ` : ""}
                              {mosque.distanceKm.toFixed(2)} km away
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No mosques were found in the selected radius. Try increasing the search radius.</p>
                )}
              </>
            ) : null}
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">Monthly Prayer Calendar</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Fajr</th>
                <th className="px-2 py-2">Dhuhr</th>
                <th className="px-2 py-2">Asr</th>
                <th className="px-2 py-2">Maghrib</th>
                <th className="px-2 py-2">Isha</th>
              </tr>
            </thead>
            <tbody>
              {calendarDays.slice(0, 12).map((day) => (
                <tr className="border-t border-emerald-50 dark:border-emerald-900/40" key={day.date}>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-200">{day.date}</td>
                  <td className="px-2 py-2">{toTimeLabel(day.fajr)}</td>
                  <td className="px-2 py-2">{toTimeLabel(day.dhuhr)}</td>
                  <td className="px-2 py-2">{toTimeLabel(day.asr)}</td>
                  <td className="px-2 py-2">{toTimeLabel(day.maghrib)}</td>
                  <td className="px-2 py-2">{toTimeLabel(day.isha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

    </div>
  );
}
