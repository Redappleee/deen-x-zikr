"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MoonStar } from "lucide-react";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { GlassCard } from "@/components/shared/glass-card";
import { useAppStore } from "@/store/use-app-store";

export function UserDashboard(): React.JSX.Element {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";

  const bookmarkedAyahs = useAppStore((state) => state.bookmarkedAyahs);
  const favoriteHadith = useAppStore((state) => state.favoriteHadith);
  const lastReadSurah = useAppStore((state) => state.lastReadSurah);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const darkMode = useAppStore((state) => state.darkMode);
  const zikrStreak = useAppStore((state) => state.zikrStreak);
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
      { label: "Prayer Notifications", value: notificationsEnabled ? "Enabled" : "Disabled" },
      { label: "Theme", value: darkMode ? "Dark" : "Light" },
      { label: "Zikr Streak", value: `${zikrStreak} day(s)` }
    ],
    [authenticated, bookmarkedAyahs.length, favoriteHadith.length, lastReadSurah, notificationsEnabled, darkMode, zikrStreak]
  );

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
    </div>
  );
}
