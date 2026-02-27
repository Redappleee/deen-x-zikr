"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MoonStar } from "lucide-react";
import { toTimeLabel } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { useEffectiveRamadanMode } from "@/store/use-effective-ramadan-mode";

type RamadanTimings = {
  fajr: string;
  maghrib: string;
  readableDate: string;
  locationName: string;
};

export function RamadanTimingBanner(): React.JSX.Element | null {
  const { ramadanMode, auto } = useEffectiveRamadanMode();
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);

  const [timings, setTimings] = useState<RamadanTimings | null>(null);

  useEffect(() => {
    if (!ramadanMode || !preferredLocation) {
      setTimings(null);
      return;
    }

    const url = `/api/prayer-times?lat=${preferredLocation.lat}&lng=${preferredLocation.lng}&method=${prayerMethod}&locationName=${encodeURIComponent(
      preferredLocation.label
    )}`;

    fetch(url)
      .then((res) => res.json())
      .then((json: { timings?: { Fajr: string; Maghrib: string }; readableDate?: string; locationName?: string }) => {
        if (!json.timings?.Fajr || !json.timings?.Maghrib) {
          setTimings(null);
          return;
        }

        setTimings({
          fajr: json.timings.Fajr,
          maghrib: json.timings.Maghrib,
          readableDate: json.readableDate ?? "",
          locationName: json.locationName ?? preferredLocation.label
        });
      })
      .catch(() => setTimings(null));
  }, [ramadanMode, preferredLocation, prayerMethod]);

  if (!ramadanMode) {
    return null;
  }

  return (
    <div className="relative z-30 border-b border-gold-300/40 bg-gradient-to-r from-gold-200/30 to-emerald-100/40 px-4 py-3 backdrop-blur dark:border-gold-700/40 dark:from-gold-700/20 dark:to-emerald-900/20 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/50 bg-white/70 px-3 py-1 text-gold-700 dark:bg-dark-800/80 dark:text-gold-200">
          <MoonStar className="h-4 w-4" />
          {auto ? "Ramadan Mode (Auto)" : "Ramadan Mode"}
        </span>

        {timings ? (
          <>
            <span className="text-slate-700 dark:text-slate-200">
              Sehri Ends: <strong>{toTimeLabel(timings.fajr)}</strong>
            </span>
            <span className="text-slate-700 dark:text-slate-200">
              Iftar: <strong>{toTimeLabel(timings.maghrib)}</strong>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{timings.locationName}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{timings.readableDate}</span>
          </>
        ) : (
          <span className="text-slate-700 dark:text-slate-200">
            Set your location in <Link className="font-medium underline" href="/salah">Salah Center</Link> to show Sehri and Iftar times.
          </span>
        )}
      </div>
    </div>
  );
}
