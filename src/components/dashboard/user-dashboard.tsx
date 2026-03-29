"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { MoonStar } from "lucide-react";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { GlassCard } from "@/components/shared/glass-card";
import { TRACKED_PRAYER_NAMES, useAppStore } from "@/store/use-app-store";

export function UserDashboard(): React.JSX.Element {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";

  const bookmarkedAyahs = useAppStore((state) => state.bookmarkedAyahs);
  const favoriteHadith = useAppStore((state) => state.favoriteHadith);
  const lastReadSurah = useAppStore((state) => state.lastReadSurah);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const darkMode = useAppStore((state) => state.darkMode);
  const zikrStreak = useAppStore((state) => state.zikrStreak);
  const preferredLocation = useAppStore((state) => state.preferredLocation);
  const prayerMethod = useAppStore((state) => state.prayerMethod);
  const prayerCompletionByDate = useAppStore((state) => state.prayerCompletionByDate);
  const onboardingCompleted = useAppStore((state) => state.onboardingCompleted);
  const resetOnboarding = useAppStore((state) => state.resetOnboarding);
  const notificationLeadMinutes = useAppStore((state) => state.notificationLeadMinutes);
  const setNotificationLeadMinutes = useAppStore((state) => state.setNotificationLeadMinutes);
  const notificationPrayerPrefs = useAppStore((state) => state.notificationPrayerPrefs);
  const setNotificationPrayerEnabled = useAppStore((state) => state.setNotificationPrayerEnabled);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders()
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const cards = useMemo(
    () => [
      { label: "Bookmarked Ayahs", value: authenticated ? bookmarkedAyahs.length : "-" },
      { label: "Favorite Hadith", value: authenticated ? favoriteHadith.length : "-" },
      { label: "Last Read Surah", value: authenticated ? lastReadSurah ?? "-" : "-" },
      { label: "Prayer Notifications", value: notificationsEnabled ? `Enabled • ${notificationLeadMinutes} min` : "Disabled" },
      { label: "Theme", value: darkMode ? "Dark" : "Light" },
      { label: "Zikr Streak", value: `${zikrStreak} day(s)` }
    ],
    [authenticated, bookmarkedAyahs.length, favoriteHadith.length, lastReadSurah, notificationsEnabled, notificationLeadMinutes, darkMode, zikrStreak]
  );

  const prayerHistory = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = subDays(new Date(), 6 - index);
      const key = format(date, "yyyy-MM-dd");
      const day = prayerCompletionByDate[key];
      const completed = TRACKED_PRAYER_NAMES.filter((prayer) => day?.[prayer]).length;

      return {
        key,
        shortLabel: format(date, "EEE"),
        fullLabel: format(date, "MMM d"),
        completed
      };
    });
  }, [prayerCompletionByDate]);

  const weeklyCompletionRate = useMemo(() => {
    const completed = prayerHistory.reduce((sum, day) => sum + day.completed, 0);
    return Math.round((completed / (prayerHistory.length * TRACKED_PRAYER_NAMES.length)) * 100);
  }, [prayerHistory]);

  return (
    <div className="space-y-6">
      <GlassCard className="bg-gradient-to-br from-emerald-50/90 to-surface dark:from-dark-800 dark:to-dark-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3">
            {session?.user?.image ? (
              <Image alt={session.user.name || "User"} className="h-12 w-12 rounded-full border border-emerald-100 object-cover dark:border-emerald-900/40" height={48} src={session.user.image} width={48} />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold-300/70 bg-gold-200/30 text-gold-700 dark:border-gold-700/50 dark:bg-gold-700/20 dark:text-gold-200">
                <MoonStar className="h-5 w-5" />
              </span>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Account</p>
              {authenticated ? (
                <>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{session.user?.name || "Believer"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{session.user?.email}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sign in to sync wishlist and saved content.</p>
              )}
            </div>
          </div>

          {status === "loading" ? null : authenticated ? (
            <button
              className="rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"
              onClick={() => signOut({ callbackUrl: "/" })}
              type="button"
            >
              Sign out
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium ${googleEnabled ? "bg-emerald-500 text-white" : "cursor-not-allowed border border-emerald-200 text-slate-500 dark:border-emerald-900/40 dark:text-slate-400"}`}
                disabled={!googleEnabled}
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                type="button"
              >
                Sign in with Google
              </button>
              <Link className="rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-200" href="/auth?callbackUrl=/dashboard">
                Email Login / Create Account
              </Link>
            </div>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <GlassCard key={card.label}>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{card.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Prayer History</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your last 7 days of salah completion.</p>
            </div>
            <div className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">
              {weeklyCompletionRate}% weekly consistency
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {prayerHistory.map((day) => (
              <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3 text-center dark:border-emerald-900/40 dark:bg-dark-700/70" key={day.key}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{day.shortLabel}</p>
                <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{day.completed}/5</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(day.completed / 5) * 100}%` }} />
                </div>
                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{day.fullLabel}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Reminder Settings</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Choose which prayers notify you and how early you want the reminder.</p>
            </div>
            <Link className="text-sm font-medium text-emerald-700 underline dark:text-emerald-200" href="/salah">
              Open Salah Center
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[0, 5, 10, 15, 30].map((minutes) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  notificationLeadMinutes === minutes
                    ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                    : "border-emerald-100 text-slate-600 dark:border-emerald-900/40 dark:text-slate-300"
                }`}
                key={minutes}
                onClick={() => setNotificationLeadMinutes(minutes)}
                type="button"
              >
                {minutes === 0 ? "At adhan" : `${minutes} min before`}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TRACKED_PRAYER_NAMES.map((prayer) => (
              <button
                className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                  notificationPrayerPrefs[prayer]
                    ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                    : "border-emerald-100 bg-white/70 text-slate-600 dark:border-emerald-900/40 dark:bg-dark-700/60 dark:text-slate-300"
                }`}
                key={prayer}
                onClick={() => setNotificationPrayerEnabled(prayer, !notificationPrayerPrefs[prayer])}
                type="button"
              >
                <span>{prayer}</span>
                <span>{notificationPrayerPrefs[prayer] ? "On" : "Off"}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Saved Ayahs</p>
          {authenticated ? (
            bookmarkedAyahs.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {bookmarkedAyahs.map((ayahId) => (
                  <span className="rounded-full border border-emerald-200 px-2.5 py-1 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-200" key={ayahId}>
                    {ayahId}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No ayah bookmarks yet.</p>
            )
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Login required to access your saved ayahs.</p>
          )}
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Personal Settings</p>
          <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-100">Location:</span> {preferredLocation?.label ?? "Not set yet"}
            </p>
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-100">Prayer Method:</span> {prayerMethod}
            </p>
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-100">Onboarding:</span> {onboardingCompleted ? "Completed" : "Not finished"}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-200" href="/">
              Back to Home
            </Link>
            <button
              className="rounded-full border border-gold-300 px-4 py-2 text-sm text-gold-700 dark:border-gold-700/40 dark:text-gold-200"
              onClick={resetOnboarding}
              type="button"
            >
              Replay setup
            </button>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Wishlist / Saved Hadith</p>
        {authenticated ? (
          favoriteHadith.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {favoriteHadith.map((hadithId) => (
                <span className="rounded-full border border-gold-300 px-2.5 py-1 text-xs text-gold-700 dark:border-gold-700/40 dark:text-gold-200" key={hadithId}>
                  {hadithId}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No favorite hadith yet.</p>
          )
        ) : (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Login required to access wishlist and saved hadith.</p>
        )}
      </GlassCard>
    </div>
  );
}
