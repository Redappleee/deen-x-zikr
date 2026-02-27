"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Calculator, Sparkles, Trophy } from "lucide-react";
import { DUA_LIST, ISLAMIC_EVENTS } from "@/lib/constants";
import { getDateKeyFromOffset, getHijriDate, getLocalDateKey } from "@/lib/utils";
import { GlassCard } from "@/components/shared/glass-card";
import { useAppStore, type IbadahDay, type IbadahTask } from "@/store/use-app-store";
import { useEffectiveRamadanMode } from "@/store/use-effective-ramadan-mode";

const CHALLENGE_ITEMS: Array<{ id: IbadahTask; label: string }> = [
  { id: "fajrOnTime", label: "Fajr in time" },
  { id: "readQuran", label: "Read Quran" },
  { id: "makeDua", label: "Make dua" },
  { id: "charity", label: "Charity" }
];

function getCompletedCount(day: IbadahDay): number {
  return Number(day.fajrOnTime) + Number(day.readQuran) + Number(day.makeDua) + Number(day.charity);
}

function isDayCompleted(day: IbadahDay | undefined): boolean {
  if (!day) return false;
  return getCompletedCount(day) === 4;
}

export function ZikrTools(): React.JSX.Element {
  const zikrCountToday = useAppStore((state) => state.zikrCountToday);
  const zikrStreak = useAppStore((state) => state.zikrStreak);
  const incrementZikr = useAppStore((state) => state.incrementZikr);
  const resetDailyZikr = useAppStore((state) => state.resetDailyZikr);

  const ibadahByDate = useAppStore((state) => state.ibadahByDate);
  const toggleIbadahTask = useAppStore((state) => state.toggleIbadahTask);

  const manualRamadanMode = useAppStore((state) => state.ramadanMode);
  const setRamadanMode = useAppStore((state) => state.setRamadanMode);
  const ramadanModeAuto = useAppStore((state) => state.ramadanModeAuto);
  const setRamadanModeAuto = useAppStore((state) => state.setRamadanModeAuto);
  const { ramadanMode } = useEffectiveRamadanMode();

  const [assets, setAssets] = useState(0);
  const [liabilities, setLiabilities] = useState(0);
  const [goldenPulse, setGoldenPulse] = useState(false);
  const [todayKey, setTodayKey] = useState(getLocalDateKey(new Date()));

  const hijri = useMemo(() => getHijriDate(), []);
  const gregorian = useMemo(() => new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }), []);

  useEffect(() => {
    const id = window.setInterval(() => setTodayKey(getLocalDateKey(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ramadanMode || zikrCountToday <= 0 || zikrCountToday % 100 !== 0) {
      setGoldenPulse(false);
      return;
    }

    setGoldenPulse(true);
    const id = window.setTimeout(() => setGoldenPulse(false), 1800);
    return () => window.clearTimeout(id);
  }, [ramadanMode, zikrCountToday]);

  const zakat = useMemo(() => {
    const net = Math.max(0, assets - liabilities);
    return net * 0.025;
  }, [assets, liabilities]);

  const todayChallenge = ibadahByDate[todayKey] ?? {
    fajrOnTime: false,
    readQuran: false,
    makeDua: false,
    charity: false
  };

  const completedToday = getCompletedCount(todayChallenge);
  const challengeProgress = (completedToday / 4) * 100;

  const challengeStreak = useMemo(() => {
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 30; i += 1) {
      const key = getDateKeyFromOffset(now, -i);
      if (!isDayCompleted(ibadahByDate[key])) {
        break;
      }
      streak += 1;
    }

    return streak;
  }, [ibadahByDate]);

  const hundredCycleCount = zikrCountToday % 100;
  const filledBeads = hundredCycleCount === 0 && zikrCountToday > 0 ? 100 : hundredCycleCount;

  return (
    <div className={`space-y-5 ${ramadanMode ? "[&_.ramadan]:from-emerald-900 [&_.ramadan]:to-dark-900" : ""}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <GlassCard className="ramadan bg-gradient-to-br from-emerald-50 to-surface dark:from-dark-700 dark:to-dark-900">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Digital Tasbih</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{zikrCountToday}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Streak: {zikrStreak} day(s)</p>

          <motion.div
            animate={goldenPulse ? { scale: [1, 1.02, 1], boxShadow: ["0 0 0 rgba(212,175,106,0)", "0 0 30px rgba(212,175,106,0.5)", "0 0 0 rgba(212,175,106,0)"] } : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
            className="mt-5 grid grid-cols-10 gap-1 rounded-2xl border border-emerald-100/70 p-3 dark:border-emerald-900/40"
            transition={{ duration: 1.2 }}
          >
            {Array.from({ length: 100 }).map((_, index) => (
              <motion.div
                animate={goldenPulse && index < 100 ? { opacity: [0.7, 1, 0.8], scale: [1, 1.12, 1] } : { opacity: 1, scale: 1 }}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index < filledBeads
                    ? goldenPulse
                      ? "bg-gold-400"
                      : "bg-emerald-500"
                    : "bg-emerald-100 dark:bg-emerald-900/30"
                }`}
                key={index}
                transition={{ delay: goldenPulse ? index * 0.006 : 0, duration: 0.45 }}
              />
            ))}
          </motion.div>

          {ramadanMode ? (
            <p className="mt-3 text-xs text-gold-700 dark:text-gold-200">Ramadan Special: beads turn gold when your tasbih reaches 100.</p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white" onClick={incrementZikr} type="button">
              +1 Zikr
            </button>
            <button className="rounded-full border border-emerald-100 px-4 py-2 text-sm dark:border-emerald-900/50" onClick={resetDailyZikr} type="button">
              Reset Today
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-600">
            <CalendarDays className="h-4 w-4" />
            Islamic Calendar
          </p>
          <p className="mt-3 text-lg font-medium text-slate-900 dark:text-slate-100">Hijri: {hijri}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Gregorian: {gregorian}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm ${ramadanModeAuto ? "bg-emerald-500 text-white" : "border border-emerald-200 text-emerald-700 dark:border-emerald-700/40 dark:text-emerald-200"}`}
              onClick={() => setRamadanModeAuto(!ramadanModeAuto)}
              type="button"
            >
              {ramadanModeAuto ? "Auto Ramadan: On" : "Auto Ramadan: Off"}
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm ${manualRamadanMode ? "bg-gold-400 text-white" : "border border-gold-300 text-gold-700 dark:border-gold-600/30 dark:text-gold-200"} disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={ramadanModeAuto}
              onClick={() => setRamadanMode(!manualRamadanMode)}
              type="button"
            >
              Enable Ramadan Mode: {manualRamadanMode ? "On" : "Off"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Effective Ramadan mode: {ramadanMode ? "Active" : "Inactive"} ({ramadanModeAuto ? "Auto by Hijri month (9)" : "Manual override"}).
          </p>

          <div className="mt-4 rounded-2xl border border-emerald-100 p-3 text-sm dark:border-emerald-900/40">
            <p className="mb-2 font-medium text-slate-800 dark:text-slate-100">Upcoming Islamic Events</p>
            {ISLAMIC_EVENTS.map((event) => (
              <p className="text-slate-600 dark:text-slate-300" key={event}>
                • {event}
              </p>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
          <Trophy className="h-4 w-4" />
          30-Day Ibadah Challenge
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Complete your daily checklist and build consistency across Ramadan.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {CHALLENGE_ITEMS.map((item) => (
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-emerald-100 px-3 py-2 text-sm dark:border-emerald-900/40" key={item.id}>
              <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
              <input
                checked={todayChallenge[item.id]}
                className="h-4 w-4 accent-emerald-500"
                onChange={() => toggleIbadahTask(item.id)}
                type="checkbox"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-gold-300/50 bg-gold-100/30 p-3 dark:border-gold-700/40 dark:bg-gold-700/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-200">Daily progress</span>
            <strong className="text-gold-700 dark:text-gold-200">{completedToday}/4</strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gold-200/60 dark:bg-gold-900/40">
            <motion.div animate={{ width: `${challengeProgress}%` }} className="h-full bg-gold-500" transition={{ duration: 0.35 }} />
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Progress streak: {challengeStreak} day(s)</p>
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Daily Duas
          </p>
          <div className="mt-4 space-y-3">
            {DUA_LIST.map((dua) => (
              <div className="rounded-2xl border border-emerald-100 p-3 dark:border-emerald-900/40" key={dua.title}>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{dua.title}</p>
                <p className="mt-2 font-arabic text-2xl leading-loose text-emerald-800 dark:text-emerald-200">{dua.arabic}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{dua.translation}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Calculator className="h-4 w-4" />
            Zakat Calculator
          </p>
          {ramadanMode ? (
            <p className="mt-3 rounded-2xl border border-gold-300/60 bg-gold-200/25 px-3 py-2 text-sm text-gold-800 dark:border-gold-700/40 dark:bg-gold-700/10 dark:text-gold-200">
              Have you calculated your Zakat this Ramadan?
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Total Assets</label>
              <input
                className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                min={0}
                onChange={(e) => setAssets(Number(e.target.value))}
                type="number"
                value={assets}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Liabilities</label>
              <input
                className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                min={0}
                onChange={(e) => setLiabilities(Number(e.target.value))}
                type="number"
                value={liabilities}
              />
            </div>
            <div className="rounded-2xl border border-gold-300/60 bg-gold-200/20 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Estimated Zakat (2.5%)</p>
              <p className="text-2xl font-semibold text-gold-600">{zakat.toFixed(2)}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
