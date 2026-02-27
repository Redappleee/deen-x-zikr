"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenText, Clock3, Coins, MoonStar, Sparkles, Target } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { DUA_LIST, PRAYER_NAMES } from "@/lib/constants";
import { formatSeconds, getHijriDate, getLocalDateKey, parseTimeToday, secondsBetween, toTimeLabel } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";

type PrayerCardPayload = {
  timings: Record<(typeof PRAYER_NAMES)[number], string>;
  readableDate: string;
  locationName: string;
};

export function RamadanHomepage(): React.JSX.Element {
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);

  const quranGoalPagesDaily = useAppStore((state) => state.quranGoalPagesDaily);
  const quranPagesReadToday = useAppStore((state) => state.quranPagesReadToday);
  const setQuranGoalPagesDaily = useAppStore((state) => state.setQuranGoalPagesDaily);
  const adjustQuranPagesRead = useAppStore((state) => state.adjustQuranPagesRead);
  const ensureQuranProgressDate = useAppStore((state) => state.ensureQuranProgressDate);

  const [todayKey, setTodayKey] = useState(getLocalDateKey());
  const [now, setNow] = useState(new Date());
  const [prayerData, setPrayerData] = useState<PrayerCardPayload | null>(null);

  useEffect(() => {
    ensureQuranProgressDate();
  }, [ensureQuranProgressDate]);

  useEffect(() => {
    const secondTimer = window.setInterval(() => setNow(new Date()), 1000);
    const minuteTimer = window.setInterval(() => {
      const key = getLocalDateKey();
      setTodayKey(key);
      ensureQuranProgressDate();
    }, 60_000);

    return () => {
      window.clearInterval(secondTimer);
      window.clearInterval(minuteTimer);
    };
  }, [ensureQuranProgressDate]);

  useEffect(() => {
    if (!preferredLocation) {
      setPrayerData(null);
      return;
    }

    const query = `/api/prayer-times?lat=${preferredLocation.lat}&lng=${preferredLocation.lng}&method=${prayerMethod}&locationName=${encodeURIComponent(
      preferredLocation.label
    )}`;

    fetch(query)
      .then((res) => res.json())
      .then((json: PrayerCardPayload) => {
        if (!json.timings?.Fajr || !json.timings?.Maghrib) {
          setPrayerData(null);
          return;
        }
        setPrayerData(json);
      })
      .catch(() => setPrayerData(null));
  }, [preferredLocation, prayerMethod, todayKey]);

  const dayIndex = useMemo(() => Math.floor(Date.now() / 86_400_000) % DUA_LIST.length, []);
  const todaysDua = DUA_LIST[dayIndex];

  const iftarCountdown = useMemo(() => {
    if (!prayerData?.timings?.Maghrib) {
      return null;
    }

    const target = parseTimeToday(prayerData.timings.Maghrib, now);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    return {
      display: formatSeconds(secondsBetween(now, target)),
      target: toTimeLabel(prayerData.timings.Maghrib)
    };
  }, [prayerData, now]);

  const quranProgressPercent = Math.min(100, (quranPagesReadToday / quranGoalPagesDaily) * 100);

  return (
    <div className="space-y-5">
      <GlassCard className="overflow-hidden bg-gradient-to-br from-gold-100/35 to-emerald-50/65 dark:from-gold-900/20 dark:to-emerald-900/20">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-200">
          <MoonStar className="h-4 w-4" />
          Ramadan Mubarak
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold text-emerald-900 dark:text-emerald-100 md:text-4xl">
          Welcome to your Ramadan Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} • {getHijriDate()}</p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Today&apos;s Dua
          </p>
          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">{todaysDua.title}</p>
          <p className="mt-2 font-arabic text-2xl leading-loose text-emerald-800 dark:text-emerald-200">{todaysDua.arabic}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{todaysDua.translation}</p>
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Clock3 className="h-4 w-4" />
            Prayer Times
          </p>
          {prayerData ? (
            <>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{prayerData.locationName} • {prayerData.readableDate}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const).map((name) => (
                  <div className="rounded-xl border border-emerald-100/80 px-2 py-1.5 dark:border-emerald-900/40" key={name}>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">{toTimeLabel(prayerData.timings[name])}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Set location in <Link className="underline" href="/salah">Salah Center</Link> to load accurate timings.</p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <BookOpenText className="h-4 w-4" />
            Quran Goal Tracker
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <label className="text-slate-600 dark:text-slate-300">Daily pages goal</label>
            <input
              className="w-20 rounded-full border border-emerald-100 bg-white px-3 py-1 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
              min={1}
              onChange={(e) => setQuranGoalPagesDaily(Number(e.target.value || 1))}
              type="number"
              value={quranGoalPagesDaily}
            />
          </div>
          <div className="mt-3 rounded-xl border border-gold-300/50 bg-gold-100/20 p-3 dark:border-gold-700/40 dark:bg-gold-900/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-200">Progress</span>
              <strong className="text-gold-700 dark:text-gold-200">{quranPagesReadToday}/{quranGoalPagesDaily} pages</strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gold-200/70 dark:bg-gold-900/40">
              <motion.div animate={{ width: `${quranProgressPercent}%` }} className="h-full bg-gold-500" transition={{ duration: 0.35 }} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs dark:border-emerald-900/40" onClick={() => adjustQuranPagesRead(-1)} type="button">-1 page</button>
            <button className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs text-white" onClick={() => adjustQuranPagesRead(1)} type="button">+1 page</button>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Target className="h-4 w-4" />
            Iftar Countdown
          </p>
          {iftarCountdown ? (
            <>
              <p className="mt-3 text-3xl font-semibold text-emerald-900 dark:text-emerald-100">{iftarCountdown.display}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Iftar at {iftarCountdown.target}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Prayer timings are required to compute iftar countdown.</p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Coins className="h-4 w-4" />
            Zakat Reminder
          </p>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">Have you calculated your Zakat this Ramadan?</p>
          <Link className="mt-4 inline-flex rounded-full border border-gold-300 px-4 py-2 text-sm text-gold-700 transition hover:bg-gold-100/60 dark:border-gold-700/40 dark:text-gold-200 dark:hover:bg-gold-900/20" href="/zikr">
            Open Zakat Calculator
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}
