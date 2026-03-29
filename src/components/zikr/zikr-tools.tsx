"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Calculator,
  CheckCircle2,
  Copy,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  Trophy
} from "lucide-react";
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

const DHIKR_PRESETS = [
  {
    id: "subhanallah",
    title: "SubhanAllah",
    arabic: "سُبْحَانَ ٱللَّٰهِ",
    note: "Glorify Allah with a calm, steady rhythm.",
    target: 33
  },
  {
    id: "alhamdulillah",
    title: "Alhamdulillah",
    arabic: "ٱلْحَمْدُ لِلَّٰهِ",
    note: "A gratitude cycle to soften the heart.",
    target: 33
  },
  {
    id: "allahuakbar",
    title: "Allahu Akbar",
    arabic: "ٱللَّٰهُ أَكْبَرُ",
    note: "A focused remembrance after salah and through the day.",
    target: 34
  },
  {
    id: "istighfar",
    title: "Istighfar",
    arabic: "أَسْتَغْفِرُ ٱللَّٰهَ",
    note: "Seek forgiveness with presence and humility.",
    target: 100
  }
] as const;

const TARGET_OPTIONS = [33, 100, 300, 500, 1000] as const;

const ZAKAT_FIELDS = [
  { key: "cashSavings", label: "Cash & Savings" },
  { key: "goldValue", label: "Gold Value" },
  { key: "investments", label: "Investments" },
  { key: "businessGoods", label: "Business Goods" },
  { key: "receivables", label: "Receivables" },
  { key: "liabilities", label: "Liabilities" }
] as const;

type ZakatFieldKey = (typeof ZAKAT_FIELDS)[number]["key"];

function normalizeIbadahDay(day?: Partial<IbadahDay> | null): IbadahDay {
  return {
    fajrOnTime: Boolean(day?.fajrOnTime),
    readQuran: Boolean(day?.readQuran),
    makeDua: Boolean(day?.makeDua),
    charity: Boolean(day?.charity)
  };
}

function getCompletedCount(day: IbadahDay): number {
  return Number(day.fajrOnTime) + Number(day.readQuran) + Number(day.makeDua) + Number(day.charity);
}

function isDayCompleted(day: IbadahDay | undefined): boolean {
  if (!day) return false;
  return getCompletedCount(day) === CHALLENGE_ITEMS.length;
}

export function ZikrTools(): React.JSX.Element {
  const zikrCountToday = useAppStore((state) => state.zikrCountToday);
  const zikrStreak = useAppStore((state) => state.zikrStreak);
  const adjustZikrCount = useAppStore((state) => state.adjustZikrCount);
  const resetDailyZikr = useAppStore((state) => state.resetDailyZikr);

  const ibadahByDate = useAppStore((state) => state.ibadahByDate);
  const toggleIbadahTask = useAppStore((state) => state.toggleIbadahTask);

  const manualRamadanMode = useAppStore((state) => state.ramadanMode);
  const setRamadanMode = useAppStore((state) => state.setRamadanMode);
  const ramadanModeAuto = useAppStore((state) => state.ramadanModeAuto);
  const setRamadanModeAuto = useAppStore((state) => state.setRamadanModeAuto);
  const { ramadanMode } = useEffectiveRamadanMode();

  const [selectedPresetId, setSelectedPresetId] = useState<(typeof DHIKR_PRESETS)[number]["id"]>("istighfar");
  const [sessionTarget, setSessionTarget] = useState<number>(100);
  const [goldenPulse, setGoldenPulse] = useState(false);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey(new Date()));
  const [currentDuaIndex, setCurrentDuaIndex] = useState(0);
  const [duaNotice, setDuaNotice] = useState<string | null>(null);
  const [zakatValues, setZakatValues] = useState<Record<ZakatFieldKey, number>>({
    cashSavings: 0,
    goldValue: 0,
    investments: 0,
    businessGoods: 0,
    receivables: 0,
    liabilities: 0
  });
  const [nisabThreshold, setNisabThreshold] = useState(0);

  const todayDate = useMemo(() => new Date(`${todayKey}T12:00:00`), [todayKey]);
  const hijri = useMemo(() => getHijriDate(todayDate), [todayDate]);
  const gregorian = useMemo(
    () =>
      todayDate.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
    [todayDate]
  );

  const selectedPreset = useMemo(
    () => DHIKR_PRESETS.find((preset) => preset.id === selectedPresetId) ?? DHIKR_PRESETS[0],
    [selectedPresetId]
  );

  useEffect(() => {
    setSessionTarget(selectedPreset.target);
  }, [selectedPreset]);

  useEffect(() => {
    const syncTodayKey = () => setTodayKey(getLocalDateKey(new Date()));
    syncTodayKey();
    const id = window.setInterval(syncTodayKey, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!duaNotice) return;
    const id = window.setTimeout(() => setDuaNotice(null), 2200);
    return () => window.clearTimeout(id);
  }, [duaNotice]);

  useEffect(() => {
    if (!ramadanMode || zikrCountToday <= 0 || zikrCountToday % 100 !== 0) {
      setGoldenPulse(false);
      return;
    }

    setGoldenPulse(true);
    const id = window.setTimeout(() => setGoldenPulse(false), 1800);
    return () => window.clearTimeout(id);
  }, [ramadanMode, zikrCountToday]);

  const currentDua = DUA_LIST[currentDuaIndex];
  const todayChallenge = normalizeIbadahDay(ibadahByDate[todayKey]);

  const completedToday = getCompletedCount(todayChallenge);
  const challengeProgress = (completedToday / CHALLENGE_ITEMS.length) * 100;
  const challengeHistory = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const key = getDateKeyFromOffset(base, -(6 - index));
      const day = normalizeIbadahDay(ibadahByDate[key]);
      const completed = day ? getCompletedCount(day) : 0;

      return {
        key,
        label: new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
        completed
      };
    });
  }, [ibadahByDate]);

  const challengeStreak = useMemo(() => {
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 30; i += 1) {
      const key = getDateKeyFromOffset(now, -i);
      if (!isDayCompleted(ibadahByDate[key])) break;
      streak += 1;
    }

    return streak;
  }, [ibadahByDate]);

  const completedChallengeDays = useMemo(() => {
    let total = 0;
    const now = new Date();

    for (let i = 0; i < 30; i += 1) {
      const key = getDateKeyFromOffset(now, -i);
      if (isDayCompleted(ibadahByDate[key])) total += 1;
    }

    return total;
  }, [ibadahByDate]);

  const hundredCycleCount = zikrCountToday % 100;
  const filledBeads = hundredCycleCount === 0 && zikrCountToday > 0 ? 100 : hundredCycleCount;
  const sessionCount = zikrCountToday === 0 ? 0 : zikrCountToday % sessionTarget || sessionTarget;
  const sessionProgress = sessionTarget > 0 ? Math.min((sessionCount / sessionTarget) * 100, 100) : 0;
  const sessionCircumference = 2 * Math.PI * 38;

  const totalAssets =
    zakatValues.cashSavings + zakatValues.goldValue + zakatValues.investments + zakatValues.businessGoods + zakatValues.receivables;
  const netZakatable = Math.max(0, totalAssets - zakatValues.liabilities);
  const zakatDue = netZakatable * 0.025;
  const zakatIsDue = nisabThreshold <= 0 ? netZakatable > 0 : netZakatable >= nisabThreshold;

  const upcomingEvents = useMemo(() => {
    return ISLAMIC_EVENTS.map((event, index) => ({
      event,
      status:
        event === "Ramadan" && ramadanMode
          ? "Active now"
          : event === "Eid al-Fitr" && ramadanMode
            ? "After Ramadan"
            : index < 2
              ? "Coming up"
              : "Later"
    }));
  }, [ramadanMode]);

  const handleShareDua = async () => {
    const text = `${currentDua.title}\n\n${currentDua.arabic}\n\n${currentDua.translation}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentDua.title,
          text
        });
        setDuaNotice("Dua shared.");
        return;
      }

      await navigator.clipboard.writeText(text);
      setDuaNotice("Dua copied instead of shared.");
    } catch {
      setDuaNotice("Unable to share this dua right now.");
    }
  };

  const handleCopyDua = async () => {
    try {
      await navigator.clipboard.writeText(`${currentDua.arabic}\n${currentDua.translation}`);
      setDuaNotice("Dua copied.");
    } catch {
      setDuaNotice("Copy failed.");
    }
  };

  const updateZakatField = (key: ZakatFieldKey, value: string) => {
    const parsed = Number(value);
    setZakatValues((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0
    }));
  };

  return (
    <div className={`space-y-5 ${ramadanMode ? "[&_.ramadan]:from-emerald-900 [&_.ramadan]:to-dark-900" : ""}`}>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="ramadan relative overflow-hidden bg-gradient-to-br from-emerald-50 to-surface dark:from-dark-700 dark:to-dark-900">
          <motion.div
            animate={goldenPulse ? { opacity: [0.18, 0.35, 0.18], scale: [0.96, 1.04, 0.98] } : { opacity: 0.18, scale: 1 }}
            className="pointer-events-none absolute -right-16 top-8 h-40 w-40 rounded-full bg-gold-200/40 blur-3xl dark:bg-gold-500/10"
            transition={{ duration: 1.2 }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Digital Tasbih</p>
                <h3 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{zikrCountToday}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Streak: {zikrStreak} day(s)</p>
              </div>

              <div className="relative h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
                  <circle className="stroke-emerald-100 dark:stroke-emerald-950" cx="48" cy="48" fill="none" r="38" strokeWidth="8" />
                  <motion.circle
                    animate={{ strokeDashoffset: sessionCircumference - (sessionCircumference * sessionProgress) / 100 }}
                    className={goldenPulse ? "stroke-gold-400" : "stroke-emerald-500"}
                    cx="48"
                    cy="48"
                    fill="none"
                    r="38"
                    strokeDasharray={sessionCircumference}
                    strokeLinecap="round"
                    strokeWidth="8"
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">{sessionCount}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">of {sessionTarget}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {DHIKR_PRESETS.map((preset) => (
                <button
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    preset.id === selectedPresetId
                      ? "border-emerald-400 bg-emerald-100/80 dark:border-emerald-700 dark:bg-emerald-900/35"
                      : "border-emerald-100 bg-white/70 dark:border-emerald-900/40 dark:bg-dark-800/60"
                  }`}
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  type="button"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{preset.title}</p>
                  <p className="mt-1 font-arabic text-xl text-emerald-800 dark:text-emerald-200">{preset.arabic}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{preset.note}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {TARGET_OPTIONS.map((value) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    sessionTarget === value
                      ? "bg-emerald-500 text-white"
                      : "border border-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-200"
                  }`}
                  key={value}
                  onClick={() => setSessionTarget(value)}
                  type="button"
                >
                  Target {value}
                </button>
              ))}
            </div>

            <motion.div
              animate={
                goldenPulse
                  ? {
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        "0 0 0 rgba(212,175,106,0)",
                        "0 0 34px rgba(212,175,106,0.45)",
                        "0 0 0 rgba(212,175,106,0)"
                      ]
                    }
                  : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }
              }
              className="mt-5 grid grid-cols-10 gap-1 rounded-2xl border border-emerald-100/70 p-3 dark:border-emerald-900/40"
              transition={{ duration: 1.2 }}
            >
              {Array.from({ length: 100 }).map((_, index) => (
                <motion.div
                  animate={goldenPulse ? { opacity: [0.7, 1, 0.8], scale: [1, 1.12, 1] } : { opacity: 1, scale: 1 }}
                  className={`h-2.5 w-2.5 rounded-full ${
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

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-full border border-emerald-100 px-4 py-2 text-sm dark:border-emerald-900/50" onClick={() => adjustZikrCount(-1)} type="button">
                <Minus className="mr-1 inline h-4 w-4" />
                -1
              </button>
              <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white" onClick={() => adjustZikrCount(1)} type="button">
                <Plus className="mr-1 inline h-4 w-4" />
                +1
              </button>
              <button className="rounded-full border border-emerald-100 px-4 py-2 text-sm dark:border-emerald-900/50" onClick={() => adjustZikrCount(10)} type="button">
                +10
              </button>
              <button className="rounded-full border border-gold-300 px-4 py-2 text-sm text-gold-700 dark:border-gold-700/40 dark:text-gold-200" onClick={() => adjustZikrCount(33)} type="button">
                +33
              </button>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300" onClick={resetDailyZikr} type="button">
                <RotateCcw className="mr-1 inline h-4 w-4" />
                Reset Today
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-gold-300/50 bg-gold-100/30 p-3 text-sm dark:border-gold-700/40 dark:bg-gold-700/10">
              <p className="font-medium text-slate-800 dark:text-slate-100">{selectedPreset.title}</p>
              <p className="mt-1 font-arabic text-2xl text-emerald-800 dark:text-emerald-200">{selectedPreset.arabic}</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{selectedPreset.note}</p>
              {ramadanMode ? <p className="mt-2 text-xs text-gold-700 dark:text-gold-200">Ramadan special: every 100 dhikr lights the tasbih beads in gold.</p> : null}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-600">
              <CalendarDays className="h-4 w-4" />
              Spiritual Calendar
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

            <div className="mt-4 grid gap-2">
              {upcomingEvents.map((item) => (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-100 px-3 py-2 text-sm dark:border-emerald-900/40" key={item.event}>
                  <span className="text-slate-700 dark:text-slate-200">{item.event}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-100">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              <Target className="h-4 w-4" />
              Daily Focus
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Session Target</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{sessionTarget}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sessionCount} completed in this current dhikr cycle.</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Challenge Days</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{completedChallengeDays}/30</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Completed challenge days in the last 30 days.</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              <Trophy className="h-4 w-4" />
              30-Day Ibadah Challenge
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Complete your daily checklist and keep your worship consistent.</p>
          </div>
          <div className="rounded-full border border-gold-300/60 bg-gold-100/30 px-4 py-2 text-sm text-gold-800 dark:border-gold-700/40 dark:bg-gold-700/10 dark:text-gold-200">
            Streak: {challengeStreak} day(s)
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CHALLENGE_ITEMS.map((item) => (
            <button
              className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition ${
                todayChallenge[item.id]
                  ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                  : "border-emerald-100 bg-white/75 text-slate-600 dark:border-emerald-900/40 dark:bg-dark-700/65 dark:text-slate-300"
              }`}
              key={item.id}
              onClick={() => toggleIbadahTask(item.id)}
              type="button"
            >
              <span>{item.label}</span>
              {todayChallenge[item.id] ? <CheckCircle2 className="h-4 w-4" /> : null}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-gold-300/50 bg-gold-100/30 p-3 dark:border-gold-700/40 dark:bg-gold-700/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-200">Daily progress</span>
            <strong className="text-gold-700 dark:text-gold-200">{completedToday}/{CHALLENGE_ITEMS.length}</strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gold-200/60 dark:bg-gold-900/40">
            <motion.div animate={{ width: `${challengeProgress}%` }} className="h-full bg-gold-500" transition={{ duration: 0.35 }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {challengeHistory.map((day) => (
            <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3 text-center dark:border-emerald-900/40 dark:bg-dark-700/70" key={day.key}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{day.label}</p>
              <p className="mt-2 text-lg font-semibold text-emerald-800 dark:text-emerald-100">{day.completed}/4</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(day.completed / 4) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" />
                Daily Duas & Reflection
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Rotate through daily duas, copy them, or share them with someone who needs them.</p>
            </div>

            <div className="flex gap-2">
              <button
                className="rounded-full border border-emerald-100 px-3 py-2 text-sm dark:border-emerald-900/40"
                onClick={() => setCurrentDuaIndex((value) => (value === 0 ? DUA_LIST.length - 1 : value - 1))}
                type="button"
              >
                Prev
              </button>
              <button
                className="rounded-full border border-emerald-100 px-3 py-2 text-sm dark:border-emerald-900/40"
                onClick={() => setCurrentDuaIndex((value) => (value + 1) % DUA_LIST.length)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-emerald-100 bg-white/70 p-5 dark:border-emerald-900/40 dark:bg-dark-700/65">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{currentDua.title}</p>
            <p className="mt-3 font-arabic text-3xl leading-loose text-emerald-800 dark:text-emerald-200">{currentDua.arabic}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{currentDua.translation}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white" onClick={handleCopyDua} type="button">
                <Copy className="mr-1 inline h-4 w-4" />
                Copy
              </button>
              <button className="rounded-full border border-gold-300 px-4 py-2 text-sm text-gold-700 dark:border-gold-700/40 dark:text-gold-200" onClick={handleShareDua} type="button">
                <Share2 className="mr-1 inline h-4 w-4" />
                Share
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {DUA_LIST.map((dua, index) => (
              <button
                className={`rounded-full px-3 py-1.5 text-xs ${
                  currentDuaIndex === index
                    ? "bg-emerald-500 text-white"
                    : "border border-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-200"
                }`}
                key={dua.title}
                onClick={() => setCurrentDuaIndex(index)}
                type="button"
              >
                {dua.title}
              </button>
            ))}
          </div>

          {duaNotice ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{duaNotice}</p> : null}
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Calculator className="h-4 w-4" />
            Advanced Zakat Calculator
          </p>
          {ramadanMode ? (
            <p className="mt-3 rounded-2xl border border-gold-300/60 bg-gold-200/25 px-3 py-2 text-sm text-gold-800 dark:border-gold-700/40 dark:bg-gold-700/10 dark:text-gold-200">
              Have you calculated your Zakat this Ramadan?
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ZAKAT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">{field.label}</label>
                <input
                  className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                  min={0}
                  onChange={(e) => updateZakatField(field.key, e.target.value)}
                  type="number"
                  value={zakatValues[field.key]}
                />
              </div>
            ))}
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Nisab Threshold</label>
            <input
              className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
              min={0}
              onChange={(e) => setNisabThreshold(Number(e.target.value))}
              type="number"
              value={nisabThreshold}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enter the nisab value used in your local currency to decide whether zakat is due.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total Assets</p>
              <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{totalAssets.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Net Zakatable</p>
              <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{netZakatable.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-gold-300/60 bg-gold-200/20 p-4 dark:border-gold-700/40 dark:bg-gold-700/10">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Estimated Zakat</p>
              <p className="mt-2 text-xl font-semibold text-gold-700 dark:text-gold-200">{zakatIsDue ? zakatDue.toFixed(2) : "0.00"}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {zakatIsDue
              ? "Your net zakatable wealth is above the nisab threshold. This estimate is ready for review."
              : "Your net amount is below the nisab threshold you entered, so zakat may not be due yet."}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
