"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, MoonStar } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useEffectiveRamadanMode } from "@/store/use-effective-ramadan-mode";
import { getLocalDateKey, parseTimeToday, toTimeLabel } from "@/lib/utils";

type PrayerPayload = {
  timings?: {
    Maghrib: string;
  };
};

export function RamadanExperience(): React.JSX.Element {
  const { ramadanMode } = useEffectiveRamadanMode();
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);

  const [now, setNow] = useState(new Date());
  const [maghribTime, setMaghribTime] = useState<Date | null>(null);
  const [maghribLabel, setMaghribLabel] = useState<string>("");
  const [showIntro, setShowIntro] = useState(false);
  const [showIftarPopup, setShowIftarPopup] = useState(false);
  const [showTaraweehPopup, setShowTaraweehPopup] = useState(false);

  const prevRamadan = useRef(ramadanMode);
  const dayKey = useMemo(() => getLocalDateKey(now), [now]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!prevRamadan.current && ramadanMode) {
      setShowIntro(true);
      const id = window.setTimeout(() => setShowIntro(false), 1700);
      prevRamadan.current = ramadanMode;
      return () => window.clearTimeout(id);
    }

    prevRamadan.current = ramadanMode;
    return undefined;
  }, [ramadanMode]);

  useEffect(() => {
    if (!ramadanMode || !preferredLocation) {
      setMaghribTime(null);
      setMaghribLabel("");
      return;
    }

    const query = `/api/prayer-times?lat=${preferredLocation.lat}&lng=${preferredLocation.lng}&method=${prayerMethod}&locationName=${encodeURIComponent(
      preferredLocation.label
    )}`;

    fetch(query)
      .then((res) => res.json())
      .then((json: PrayerPayload) => {
        const maghrib = json.timings?.Maghrib;
        if (!maghrib) {
          setMaghribTime(null);
          setMaghribLabel("");
          return;
        }

        setMaghribTime(parseTimeToday(maghrib));
        setMaghribLabel(toTimeLabel(maghrib));
      })
      .catch(() => {
        setMaghribTime(null);
        setMaghribLabel("");
      });
  }, [ramadanMode, preferredLocation, prayerMethod, dayKey]);

  const isNightMode = useMemo(() => {
    if (!ramadanMode || !maghribTime) return false;
    return now >= maghribTime;
  }, [ramadanMode, maghribTime, now]);

  useEffect(() => {
    document.documentElement.classList.toggle("ramadan-night", isNightMode);
    return () => {
      document.documentElement.classList.remove("ramadan-night");
    };
  }, [isNightMode]);

  useEffect(() => {
    if (!isNightMode) return;

    const today = getLocalDateKey(new Date());
    const key = `deenxzikr-night-popups-${today}`;
    const alreadyShown = window.localStorage.getItem(key);
    if (alreadyShown === "1") return;

    setShowIftarPopup(true);
    setShowTaraweehPopup(true);
    window.localStorage.setItem(key, "1");
  }, [isNightMode]);

  return (
    <>
      <AnimatePresence>
        {showIntro ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle_at_top,rgba(212,175,106,0.22),rgba(15,157,88,0.08),transparent_70%)]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [14, 0], opacity: [0, 1], scale: [0.96, 1] }}
              className="rounded-3xl border border-gold-300/60 bg-white/75 px-6 py-4 text-center shadow-[0_20px_60px_rgba(15,157,88,0.18)] backdrop-blur dark:bg-dark-800/80"
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <p className="inline-flex items-center gap-2 text-sm font-medium text-gold-700 dark:text-gold-200">
                <MoonStar className="h-4 w-4" />
                Ramadan Mubarak
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">A calm spiritual mode is now active.</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isNightMode ? (
        <>
          <div className="pointer-events-none absolute left-8 top-24 z-10 h-40 w-20 rounded-full bg-[radial-gradient(circle_at_center,var(--lantern-glow),transparent_70%)] blur-2xl" />
          <div className="pointer-events-none absolute right-12 top-36 z-10 h-48 w-24 rounded-full bg-[radial-gradient(circle_at_center,var(--lantern-glow),transparent_70%)] blur-2xl" />
        </>
      ) : null}

      <AnimatePresence>
        {showIftarPopup && isNightMode ? (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="fixed bottom-6 right-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-3xl border border-gold-300/60 bg-white/95 p-4 shadow-[0_25px_50px_rgba(18,21,18,0.2)] backdrop-blur dark:bg-dark-800/95"
            exit={{ opacity: 0, x: 40 }}
            initial={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.35 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Iftar Dua</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              Dhahaba al-zama, wabtallat al-urooq, wa thabatal-ajr in sha Allah.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Maghrib / Iftar: {maghribLabel || "--:--"}</p>
            <button
              className="mt-3 rounded-full border border-gold-300 px-3 py-1.5 text-xs text-gold-700 dark:border-gold-600/40 dark:text-gold-200"
              onClick={() => setShowIftarPopup(false)}
              type="button"
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showTaraweehPopup && isNightMode ? (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="fixed bottom-6 left-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-3xl border border-emerald-200/70 bg-white/95 p-4 shadow-[0_25px_50px_rgba(18,21,18,0.2)] backdrop-blur dark:border-emerald-800/50 dark:bg-dark-800/95"
            exit={{ opacity: 0, x: -40 }}
            initial={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              <BellRing className="h-3.5 w-3.5" />
              Taraweeh Reminder
            </p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Prepare for Taraweeh prayer tonight and keep your heart present in worship.</p>
            <button
              className="mt-3 rounded-full border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-700/40 dark:text-emerald-200"
              onClick={() => setShowTaraweehPopup(false)}
              type="button"
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
