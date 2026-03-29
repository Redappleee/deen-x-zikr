"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, LocateFixed, MoonStar, Sun } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { PRAYER_METHODS } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";

type ReverseGeoPayload = {
  label?: string;
  result?: {
    label?: string;
  };
};

function looksLikeRawLocationLabel(label: string | undefined): boolean {
  if (!label) return true;
  const trimmed = label.trim();
  return (
    /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(trimmed) ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(trimmed) ||
    trimmed.toLowerCase().includes("ip address")
  );
}

function compactLocationLabel(label: string | undefined): string {
  if (!label) return "Use your current location for accurate salah times and qibla.";
  const parts = label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const deduped = parts.filter((part, index) => parts.indexOf(part) === index);
  if (deduped.length <= 3) return deduped.join(", ");
  return deduped.slice(0, 3).join(", ");
}

export function SetupFlow(): React.JSX.Element | null {
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const setPreferredLocation = useAppStore((state) => state.setPreferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);
  const setPrayerMethod = useAppStore((state) => state.setPrayerMethod);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);

  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const progress = useMemo(() => {
    let done = 0;
    if (preferredLocation) done += 1;
    if (prayerMethod) done += 1;
    done += 1;
    return Math.min(done, 3);
  }, [preferredLocation, prayerMethod]);

  useEffect(() => {
    if (!preferredLocation || !looksLikeRawLocationLabel(preferredLocation.label)) return;

    let cancelled = false;

    const refreshLabel = async () => {
      try {
        const res = await fetch(`/api/geo?lat=${preferredLocation.lat}&lng=${preferredLocation.lng}`);
        if (!res.ok) return;

        const json = (await res.json()) as ReverseGeoPayload;
        const label = json.result?.label ?? json.label;
        if (!label || cancelled) return;

        setPreferredLocation({
          ...preferredLocation,
          label
        });
      } catch {
        // Keep the saved fallback label if reverse geocoding fails.
      }
    };

    void refreshLabel();

    return () => {
      cancelled = true;
    };
  }, [preferredLocation, setPreferredLocation]);

  if (onboardingCompleted) return null;

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Geolocation is not supported on this browser.");
      return;
    }

    setLocating(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        try {
          const res = await fetch(`/api/geo?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const json = (await res.json()) as ReverseGeoPayload;
            const resolvedLabel = json.result?.label ?? json.label;
            if (resolvedLabel) {
              label = resolvedLabel;
            }
          }
        } catch {
          // Keep coordinate fallback label.
        }

        setPreferredLocation({ lat, lng, label, type: "gps" });
        setLocationMessage(`Location set to ${label}.`);
        setLocating(false);
      },
      () => {
        setLocationMessage("Unable to detect location. You can still set it from Salah Center.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  return (
    <GlassCard className="overflow-hidden border-gold-200/60 bg-[linear-gradient(135deg,rgba(255,248,232,0.94),rgba(243,251,244,0.94))] dark:border-gold-700/30 dark:bg-[linear-gradient(135deg,rgba(46,36,18,0.24),rgba(10,36,25,0.32))]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold-700 dark:text-gold-200">First-Time Setup</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Set your spiritual dashboard once</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Choose your location, prayer method, and theme so the app feels personal from the start.
          </p>
        </div>

        <div className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-emerald-800 backdrop-blur dark:border-white/10 dark:bg-black/10 dark:text-emerald-100">
          {progress}/3 ready
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">1. Location</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {preferredLocation ? compactLocationLabel(preferredLocation.label) : "Use your current location for accurate salah times and qibla."}
          </p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
            disabled={locating}
            onClick={detectLocation}
            type="button"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            {preferredLocation ? "Refresh location" : "Use current location"}
          </button>
          {locationMessage ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{locationMessage}</p> : null}
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">2. Prayer Method</p>
          <div className="mt-3 space-y-2">
            {PRAYER_METHODS.map((method) => (
              <button
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                  prayerMethod === method.id
                    ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                    : "border-emerald-100 bg-white/75 text-slate-600 dark:border-emerald-900/40 dark:bg-dark-700/70 dark:text-slate-300"
                }`}
                key={method.id}
                onClick={() => setPrayerMethod(method.id)}
                type="button"
              >
                <span>{method.label}</span>
                {prayerMethod === method.id ? <CheckCircle2 className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-black/10">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">3. Theme & Reminders</p>
          <div className="mt-3 flex gap-2">
            <button
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                !darkMode
                  ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                  : "border-emerald-100 bg-white/75 text-slate-600 dark:border-emerald-900/40 dark:bg-dark-700/70 dark:text-slate-300"
              }`}
              onClick={() => setDarkMode(false)}
              type="button"
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                darkMode
                  ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                  : "border-emerald-100 bg-white/75 text-slate-600 dark:border-emerald-900/40 dark:bg-dark-700/70 dark:text-slate-300"
              }`}
              onClick={() => setDarkMode(true)}
              type="button"
            >
              <MoonStar className="h-4 w-4" />
              Dark
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Prayer reminders can be fine-tuned after setup.</p>
          <Link className="mt-3 inline-flex text-sm font-medium text-emerald-700 underline dark:text-emerald-200" href="/salah">
            Open Salah Center reminder settings
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!preferredLocation}
          onClick={completeOnboarding}
          type="button"
        >
          Finish setup
        </button>
        <Link className="rounded-full border border-emerald-200 px-5 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-200" href="/salah">
          Review prayer settings
        </Link>
      </div>
    </GlassCard>
  );
}
