"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import {
  BookMarked,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Compass,
  Flame,
  Heart,
  MapPin,
  Minus,
  MoonStar,
  Plus,
  Share2,
  Sparkles,
  Target,
  Wallet
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { PRAYER_NAMES } from "@/lib/constants";
import { daysUntilHijriDate, getHijriParts } from "@/lib/ramadan";
import { formatSeconds, getHijriDate, getLocalDateKey, getProgressPercent, parseTimeToday, secondsBetween, toTimeLabel } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";

type PrayerPayload = {
  timings: Record<(typeof PRAYER_NAMES)[number], string>;
  readableDate: string;
  locationName: string;
};

type WeatherPayload = {
  temperatureC: number;
  weatherLabel: string;
};

type DailyInspirationPayload = {
  ayah: {
    surahNumber: number;
    surahEnglishName: string;
    surahArabicName: string;
    ayahNumberInSurah: number;
    arabic: string;
    translation: string;
  } | null;
  hadith: {
    id: string;
    text: string;
    narrator: string;
    reference: string;
  };
  dua: {
    title: string;
    arabic: string;
    translation: string;
  };
};

type SurahSummary = {
  number: number;
  englishName: string;
  name: string;
};

function dayLabel(now: Date): string {
  return now.toLocaleDateString("en-US", { weekday: "long" });
}

function getFridayReminder(now: Date): string {
  const weekday = now.getDay();
  if (weekday === 5) {
    return "Jummah is today";
  }

  const days = (5 - weekday + 7) % 7;
  return `Jummah in ${days} day${days === 1 ? "" : "s"}`;
}

function getEvents(now: Date): Array<{ label: string; subtitle: string }> {
  const { month } = getHijriParts(now);
  const ramadanDays = month === 9 ? 0 : daysUntilHijriDate(9, 1, now);
  const eidFitrDays = daysUntilHijriDate(10, 1, now);
  const eidAdhaDays = daysUntilHijriDate(12, 10, now);

  return [
    {
      label: "Ramadan",
      subtitle: ramadanDays === 0 ? "Ongoing" : `in ${ramadanDays} days`
    },
    {
      label: "Jummah",
      subtitle: getFridayReminder(now)
    },
    {
      label: "Eid al-Fitr",
      subtitle: eidFitrDays === 0 ? "Today" : `in ${eidFitrDays} days`
    },
    {
      label: "Eid al-Adha",
      subtitle: `in ${eidAdhaDays} days`
    }
  ];
}

export function HomeContent(): React.JSX.Element {
  const { data: session } = useSession();

  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);

  const bookmarks = useAppStore((state) => state.bookmarkedAyahs);
  const toggleBookmarkAyah = useAppStore((state) => state.toggleBookmarkAyah);
  const favoriteHadith = useAppStore((state) => state.favoriteHadith);
  const toggleFavoriteHadith = useAppStore((state) => state.toggleFavoriteHadith);

  const lastReadSurah = useAppStore((state) => state.lastReadSurah);
  const lastReadAyah = useAppStore((state) => state.lastReadAyah);

  const zikrCountToday = useAppStore((state) => state.zikrCountToday);
  const zikrStreak = useAppStore((state) => state.zikrStreak);
  const adjustZikrCount = useAppStore((state) => state.adjustZikrCount);

  const prayersCompletedToday = useAppStore((state) => state.prayersCompletedToday);
  const adjustPrayersCompleted = useAppStore((state) => state.adjustPrayersCompleted);

  const quranGoalPagesDaily = useAppStore((state) => state.quranGoalPagesDaily);
  const quranPagesReadToday = useAppStore((state) => state.quranPagesReadToday);
  const adjustQuranPagesRead = useAppStore((state) => state.adjustQuranPagesRead);
  const ensureDailyProgressDate = useAppStore((state) => state.ensureDailyProgressDate);

  const ibadahByDate = useAppStore((state) => state.ibadahByDate);
  const toggleIbadahTask = useAppStore((state) => state.toggleIbadahTask);

  const [now, setNow] = useState(new Date());
  const [prayerData, setPrayerData] = useState<PrayerPayload | null>(null);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [inspiration, setInspiration] = useState<DailyInspirationPayload | null>(null);
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [achievedFx, setAchievedFx] = useState<{ prayer: boolean; quran: boolean; dhikr: boolean }>({
    prayer: false,
    quran: false,
    dhikr: false
  });
  const reachedRef = useRef<{ prayer: boolean; quran: boolean; dhikr: boolean }>({
    prayer: false,
    quran: false,
    dhikr: false
  });

  const todayKey = getLocalDateKey(now);

  useEffect(() => {
    const secondTimer = window.setInterval(() => setNow(new Date()), 1000);
    const minuteTimer = window.setInterval(() => {
      ensureDailyProgressDate();
    }, 60_000);

    ensureDailyProgressDate();

    return () => {
      window.clearInterval(secondTimer);
      window.clearInterval(minuteTimer);
    };
  }, [ensureDailyProgressDate]);

  useEffect(() => {
    fetch("/api/daily-inspiration")
      .then((res) => res.json())
      .then((json: DailyInspirationPayload) => setInspiration(json))
      .catch(() => setInspiration(null));

    fetch("/api/quran")
      .then((res) => res.json())
      .then((json: { surahs: SurahSummary[] }) => setSurahs(json.surahs ?? []))
      .catch(() => setSurahs([]));
  }, []);

  useEffect(() => {
    if (!preferredLocation) {
      setPrayerData(null);
      setWeather(null);
      return;
    }

    const prayerUrl = `/api/prayer-times?lat=${preferredLocation.lat}&lng=${preferredLocation.lng}&method=${prayerMethod}&locationName=${encodeURIComponent(
      preferredLocation.label
    )}`;

    fetch(prayerUrl)
      .then((res) => res.json())
      .then((json: PrayerPayload) => {
        if (!json.timings?.Fajr) {
          setPrayerData(null);
          return;
        }
        setPrayerData(json);
      })
      .catch(() => setPrayerData(null));

    const weatherUrl = `/api/weather?lat=${preferredLocation.lat}&lng=${preferredLocation.lng}`;
    fetch(weatherUrl)
      .then((res) => res.json())
      .then((json: WeatherPayload) => {
        if (!json.weatherLabel) {
          setWeather(null);
          return;
        }
        setWeather(json);
      })
      .catch(() => setWeather(null));
  }, [preferredLocation, prayerMethod, todayKey]);

  useEffect(() => {
    if (!authMessage) return;
    const timer = window.setTimeout(() => setAuthMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [authMessage]);

  const nextPrayer = useMemo(() => {
    if (!prayerData) return null;

    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
    const entries = prayers.map((name) => ({
      name,
      time: parseTimeToday(prayerData.timings[name], now)
    }));

    const upcoming = entries.find((entry) => entry.time > now) ?? {
      name: "Fajr" as const,
      time: new Date(entries[0].time.getTime() + 86_400_000)
    };

    const prevIndex = entries.findIndex((entry) => entry.name === upcoming.name) - 1;
    const start = prevIndex >= 0 ? entries[prevIndex].time : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    return {
      name: upcoming.name,
      remaining: secondsBetween(now, upcoming.time),
      timeLabel: toTimeLabel(prayerData.timings[upcoming.name]),
      progress: getProgressPercent(start, upcoming.time, now)
    };
  }, [prayerData, now]);

  const todayIbadah = ibadahByDate[todayKey] ?? {
    fajrOnTime: false,
    readQuran: false,
    makeDua: false,
    charity: false
  };

  const goals = [
    { label: "Pray 5 prayers", completed: prayersCompletedToday >= 5 },
    { label: "Read 1 page Quran", completed: quranPagesReadToday >= 1 },
    { label: "Make Dhikr 100 times", completed: zikrCountToday >= 100 },
    { label: "Give charity", completed: todayIbadah.charity }
  ];

  const goalsDone = goals.filter((goal) => goal.completed).length;
  const prayerTargetReached = prayersCompletedToday >= 5;
  const quranTargetReached = quranPagesReadToday >= quranGoalPagesDaily;
  const dhikrTargetReached = zikrCountToday >= 100;

  const quranSurah = surahs.find((surah) => surah.number === (lastReadSurah ?? 1));

  const events = useMemo(() => getEvents(now), [now]);

  const greetingName = session?.user?.name?.split(" ")[0] || "Believer";
  const isAyahSaved = Boolean(
    inspiration?.ayah && bookmarks.includes(`${inspiration.ayah.surahNumber}:${inspiration.ayah.ayahNumberInSurah}`)
  );
  const isHadithSaved = inspiration?.hadith ? favoriteHadith.includes(inspiration.hadith.id) : false;
  const glassCounterButtonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/55 bg-white/35 text-emerald-700 shadow-[0_8px_24px_rgba(15,157,88,0.16)] backdrop-blur-md transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-45 dark:border-emerald-800/45 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/45";

  useEffect(() => {
    const evaluate = (key: "prayer" | "quran" | "dhikr", reached: boolean) => {
      if (reached && !reachedRef.current[key]) {
        setAchievedFx((state) => ({ ...state, [key]: true }));
        window.setTimeout(() => {
          setAchievedFx((state) => ({ ...state, [key]: false }));
        }, 1600);
      }
      reachedRef.current[key] = reached;
    };

    evaluate("prayer", prayerTargetReached);
    evaluate("quran", quranTargetReached);
    evaluate("dhikr", dhikrTargetReached);
  }, [prayerTargetReached, quranTargetReached, dhikrTargetReached]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="overflow-hidden bg-gradient-to-br from-emerald-50/85 to-surface dark:from-dark-800 dark:to-dark-900">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Spiritual Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900 dark:text-emerald-50 md:text-4xl">Assalamu Alaikum, {greetingName} 🌿</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {nextPrayer ? `It’s time for ${nextPrayer.name} in ${formatSeconds(nextPrayer.remaining)}` : "Set your location to begin your daily worship rhythm."}
          </p>
          {authMessage ? <p className="mt-2 text-xs text-gold-700 dark:text-gold-200">{authMessage}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="rounded-full border border-emerald-100 px-3 py-1 dark:border-emerald-900/40">{dayLabel(now)}</span>
            <span className="rounded-full border border-emerald-100 px-3 py-1 dark:border-emerald-900/40">{now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            <span className="rounded-full border border-emerald-100 px-3 py-1 dark:border-emerald-900/40">{getHijriDate(now)}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-1 dark:border-emerald-900/40">
              <MapPin className="h-3.5 w-3.5" />
              {preferredLocation?.label ?? "Location not set"}
            </span>
            {weather ? <span className="rounded-full border border-emerald-100 px-3 py-1 dark:border-emerald-900/40">{weather.temperatureC.toFixed(0)}°C · {weather.weatherLabel}</span> : null}
            <span className="rounded-full border border-gold-300/60 px-3 py-1 text-gold-700 dark:border-gold-700/40 dark:text-gold-200">{getFridayReminder(now)}</span>
          </div>
        </GlassCard>

        <GlassCard className="grid place-items-center">
          {nextPrayer ? (
            <div className="relative h-56 w-56">
              <svg className="h-56 w-56 -rotate-90" viewBox="0 0 120 120">
                <circle className="stroke-emerald-100 dark:stroke-emerald-950" cx="60" cy="60" fill="none" r="52" strokeWidth="8" />
                <motion.circle
                  animate={{ strokeDashoffset: 326 - (326 * nextPrayer.progress) / 100 }}
                  className="stroke-emerald-500"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="52"
                  strokeDasharray="326"
                  strokeWidth="8"
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Next Prayer</p>
                <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-100">{nextPrayer.name}</p>
                <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-200">{formatSeconds(nextPrayer.remaining)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">at {nextPrayer.timeLabel}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">Countdown appears after selecting location in Salah Center.</p>
          )}
        </GlassCard>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="relative overflow-hidden p-4">
          <AnimatePresence>
            {achievedFx.prayer ? (
              <motion.span
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-200/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-800/40 dark:text-emerald-100"
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.35 }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Target Achieved
              </motion.span>
            ) : null}
          </AnimatePresence>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Prayers Completed</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{prayersCompletedToday}/5</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              className={glassCounterButtonClass}
              disabled={prayersCompletedToday <= 0}
              onClick={() => adjustPrayersCompleted(-1)}
              type="button"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              className={glassCounterButtonClass}
              disabled={prayersCompletedToday >= 5}
              onClick={() => adjustPrayersCompleted(1)}
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </GlassCard>
        <GlassCard className="relative overflow-hidden p-4">
          <AnimatePresence>
            {achievedFx.quran ? (
              <motion.span
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-200/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-800/40 dark:text-emerald-100"
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.35 }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Target Achieved
              </motion.span>
            ) : null}
          </AnimatePresence>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quran Progress</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{quranPagesReadToday}/{quranGoalPagesDaily}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              className={glassCounterButtonClass}
              disabled={quranPagesReadToday <= 0}
              onClick={() => adjustQuranPagesRead(-1)}
              type="button"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button className={glassCounterButtonClass} onClick={() => adjustQuranPagesRead(1)} type="button">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </GlassCard>
        <GlassCard className="relative overflow-hidden p-4">
          <AnimatePresence>
            {achievedFx.dhikr ? (
              <motion.span
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-gold-300/60 bg-gold-200/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-gold-700 dark:border-gold-700/60 dark:bg-gold-700/30 dark:text-gold-100"
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.35 }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Target Achieved
              </motion.span>
            ) : null}
          </AnimatePresence>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Dhikr Count</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{zikrCountToday}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              className={glassCounterButtonClass}
              disabled={zikrCountToday <= 0}
              onClick={() => adjustZikrCount(-1)}
              type="button"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button className={glassCounterButtonClass} onClick={() => adjustZikrCount(1)} type="button">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Streak</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">
            <Flame className="h-5 w-5 text-gold-500" />
            {zikrStreak} days
          </p>
        </GlassCard>
      </section>

      <section>
        <GlassCard className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Continue Reading</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Continue Surah {quranSurah?.englishName ?? `#${lastReadSurah ?? 1}`} – Ayah {lastReadAyah ?? 1}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Resume your last Quran session in one click.</p>
          </div>
          <Link className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white" href="/quran">
            Resume Reading
          </Link>
        </GlassCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <BookOpenText className="h-4 w-4" />
            Ayah of the Day
          </p>
          {inspiration?.ayah ? (
            <>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Surah {inspiration.ayah.surahEnglishName} ({inspiration.ayah.ayahNumberInSurah})</p>
              <p className="mt-2 font-arabic text-2xl leading-loose text-emerald-800 dark:text-emerald-200">{inspiration.ayah.arabic}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{inspiration.ayah.translation}</p>
              <div className="mt-3 flex gap-2">
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs ${isAyahSaved ? "border-gold-400 text-gold-700 dark:text-gold-200" : "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"}`}
                  onClick={() => {
                    if (!session?.user) {
                      setAuthMessage("Please sign in to save ayahs and hadith.");
                      void signIn(undefined, { callbackUrl: window.location.href });
                      return;
                    }
                    toggleBookmarkAyah(`${inspiration.ayah!.surahNumber}:${inspiration.ayah!.ayahNumberInSurah}`);
                  }}
                  type="button"
                >
                  <BookMarked className="mr-1 inline h-3.5 w-3.5" />
                  {isAyahSaved ? "Saved" : "Save"}
                </button>
                <button
                  className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"
                  onClick={() => {
                    const text = `${inspiration.ayah!.arabic}\n${inspiration.ayah!.translation}`;
                    if (navigator.share) {
                      navigator.share({ title: "Ayah of the Day", text }).catch(() => undefined);
                      return;
                    }
                    navigator.clipboard.writeText(text).catch(() => undefined);
                  }}
                  type="button"
                >
                  <Share2 className="mr-1 inline h-3.5 w-3.5" />
                  Share
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Daily ayah is loading.</p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Hadith of the Day
          </p>
          {inspiration?.hadith ? (
            <>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{inspiration.hadith.text}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{inspiration.hadith.reference}</p>
              <div className="mt-3 flex gap-2">
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs ${isHadithSaved ? "border-gold-400 text-gold-700 dark:text-gold-200" : "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"}`}
                  onClick={() => {
                    if (!session?.user) {
                      setAuthMessage("Please sign in to save ayahs and hadith.");
                      void signIn(undefined, { callbackUrl: window.location.href });
                      return;
                    }
                    toggleFavoriteHadith(inspiration.hadith.id);
                  }}
                  type="button"
                >
                  <Heart className="mr-1 inline h-3.5 w-3.5" />
                  {isHadithSaved ? "Saved" : "Save"}
                </button>
                <button
                  className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"
                  onClick={() => {
                    const text = `${inspiration.hadith.text}\n- ${inspiration.hadith.reference}`;
                    if (navigator.share) {
                      navigator.share({ title: "Hadith of the Day", text }).catch(() => undefined);
                      return;
                    }
                    navigator.clipboard.writeText(text).catch(() => undefined);
                  }}
                  type="button"
                >
                  <Share2 className="mr-1 inline h-3.5 w-3.5" />
                  Share
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Daily hadith is loading.</p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <MoonStar className="h-4 w-4" />
            Dua of the Day
          </p>
          {inspiration?.dua ? (
            <>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{inspiration.dua.title}</p>
              <p className="mt-2 font-arabic text-2xl leading-loose text-emerald-800 dark:text-emerald-200">{inspiration.dua.arabic}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{inspiration.dua.translation}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Daily dua is loading.</p>
          )}
        </GlassCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Clock3 className="h-4 w-4" />
            Prayer Times Overview
          </p>
          {prayerData ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const).map((name) => (
                <div className="rounded-2xl border border-emerald-100/70 bg-white/70 px-3 py-2 dark:border-emerald-900/40 dark:bg-dark-800/60" key={name}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
                  <p className="mt-1 text-base font-semibold text-emerald-800 dark:text-emerald-200">{toTimeLabel(prayerData.timings[name])}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Set your location in <Link className="underline" href="/salah">Salah Center</Link> to see accurate timings.</p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <Target className="h-4 w-4" />
            Today&apos;s Goals
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {goals.map((goal) => (
              <div className="flex items-center justify-between rounded-xl border border-emerald-100/70 px-3 py-2 dark:border-emerald-900/40" key={goal.label}>
                <span className="text-slate-700 dark:text-slate-200">{goal.label}</span>
                <span className={goal.completed ? "text-emerald-600" : "text-slate-400"}>{goal.completed ? "✓" : "•"}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <motion.div animate={{ width: `${(goalsDone / goals.length) * 100}%` }} className="h-full bg-emerald-500" transition={{ duration: 0.4 }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Progress {goalsDone}/{goals.length}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"
              onClick={() => toggleIbadahTask("charity")}
              type="button"
            >
              {todayIbadah.charity ? "Charity Logged" : "Log Charity"}
            </button>
            <Link className="rounded-full border border-gold-300 px-3 py-1.5 text-center text-xs text-gold-700 dark:border-gold-700/40 dark:text-gold-200" href="/zikr">
              Zakat Reminder
            </Link>
          </div>
        </GlassCard>
      </section>

      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Islamic Events Timeline</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {events.map((event) => (
            <GlassCard className="min-w-[220px] p-4" key={event.label}>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event.label}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.subtitle}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quick Tools</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-emerald-700 transition hover:shadow-aura dark:border-emerald-900/40 dark:bg-dark-800/60 dark:text-emerald-200" href="/zikr">
            <Wallet className="h-4 w-4" />
            Zakat
          </Link>
          <Link className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-emerald-700 transition hover:shadow-aura dark:border-emerald-900/40 dark:bg-dark-800/60 dark:text-emerald-200" href="/qibla">
            <Compass className="h-4 w-4" />
            Qibla
          </Link>
          <Link className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-emerald-700 transition hover:shadow-aura dark:border-emerald-900/40 dark:bg-dark-800/60 dark:text-emerald-200" href="/zikr">
            <Sparkles className="h-4 w-4" />
            Tasbih
          </Link>
          <Link className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm text-emerald-700 transition hover:shadow-aura dark:border-emerald-900/40 dark:bg-dark-800/60 dark:text-emerald-200" href="/calendar">
            <CalendarClock className="h-4 w-4" />
            Calendar
          </Link>
        </div>
      </section>

      <footer className="relative overflow-hidden rounded-3xl border border-emerald-100/70 px-5 py-8 text-center dark:border-emerald-900/40">
        <div className="pointer-events-none absolute inset-0 opacity-15">
          <svg className="h-full w-full" viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 220h1200v20H0z" fill="currentColor" />
            <path d="M80 220v-70h60v70m120 0v-95h80v95m130 0v-60h50v60m140 0v-110h90v110m170 0v-75h70v75" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </div>
        <div className="pointer-events-none absolute right-10 top-5 text-gold-400/40">
          <MoonStar className="h-14 w-14" />
        </div>
        <p className="relative text-sm text-slate-600 dark:text-slate-300">A calm spiritual companion for every day.</p>
      </footer>
    </div>
  );
}
