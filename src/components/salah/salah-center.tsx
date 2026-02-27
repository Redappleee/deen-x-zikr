"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Loader2, LocateFixed, Search } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { PRAYER_METHODS, PRAYER_NAMES } from "@/lib/constants";
import { formatSeconds, getProgressPercent, parsePrayerDateTime, secondsBetween, toTimeLabel } from "@/lib/utils";
import { getPushSubscription, subscribeBrowserPush, toWebPushJSON } from "@/lib/push/client";
import { useAppStore } from "@/store/use-app-store";
import type { PrayerResponse } from "@/types";

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

function formatPrayerDate(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

export function SalahCenter(): React.JSX.Element {
  const prayerMethod = useAppStore((state) => state.prayerMethod);
  const setPrayerMethod = useAppStore((state) => state.setPrayerMethod);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const setPreferredLocation = useAppStore((state) => state.setPreferredLocation);

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

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!location) return;
    void fetchPrayerData(location.lat, location.lng, location.label, selectedDate);
    void fetchCalendar(location.lat, location.lng, selectedDate);
  }, [location, selectedDate, fetchPrayerData, fetchCalendar]);

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
          language: navigator.language
        })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save push subscription.");
      }
    },
    [location, prayerMethod]
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
    const prayers = PRAYER_NAMES.map((name) => ({
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
                (position) => {
                  const coords: GeoResult = {
                    id: Date.now(),
                    label: "Current Location",
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    type: "gps"
                  };
                  setLocation(coords);
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
                {PRAYER_NAMES.map((name) => (
                  <div className="rounded-2xl border border-emerald-100/80 bg-white/80 px-4 py-3 dark:border-emerald-900/50 dark:bg-dark-700" key={name}>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{toTimeLabel(prayerData.timings[name])}</p>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Azan Preview</p>
            <audio className="mt-2 w-full" controls preload="none" src="https://www.islamcan.com/audio/adhan/azan1.mp3">
              <track kind="captions" />
            </audio>
          </div>
        </GlassCard>

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
