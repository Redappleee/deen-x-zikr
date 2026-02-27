"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2, Star } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { GlassCard } from "@/components/shared/glass-card";
import { useAppStore } from "@/store/use-app-store";

type HadithEntry = {
  id: string;
  collection: "bukhari" | "muslim" | "tirmidhi";
  category: "faith" | "character" | "prayer" | "knowledge";
  text: string;
  narrator: string;
  reference: string;
};

const categories = ["all", "faith", "character", "prayer", "knowledge"] as const;

export function HadithLibrary(): React.JSX.Element {
  const { status } = useSession();
  const favorites = useAppStore((state) => state.favoriteHadith);
  const toggleFavoriteHadith = useAppStore((state) => state.toggleFavoriteHadith);

  const [collection, setCollection] = useState<"bukhari" | "muslim" | "tirmidhi">("bukhari");
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [rows, setRows] = useState<HadithEntry[]>([]);
  const [daily, setDaily] = useState<HadithEntry | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/hadith?collection=${collection}`)
      .then((res) => res.json())
      .then((json: { hadith: HadithEntry[] }) => setRows(json.hadith ?? []));

    fetch("/api/daily-hadith")
      .then((res) => res.json())
      .then((json: { hadith: HadithEntry }) => setDaily(json.hadith));
  }, [collection]);

  const filtered = useMemo(() => {
    if (category === "all") return rows;
    return rows.filter((entry) => entry.category === category);
  }, [rows, category]);

  useEffect(() => {
    if (!authMessage) return;
    const timer = window.setTimeout(() => setAuthMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [authMessage]);

  return (
    <div className="space-y-5">
      <GlassCard>
        <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Daily Hadith</p>
        {daily ? (
          <>
            <p className="mt-3 text-lg leading-relaxed text-slate-800 dark:text-slate-100">{daily.text}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{daily.narrator}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{daily.reference}</p>
          </>
        ) : null}
      </GlassCard>

      <GlassCard>
        {authMessage ? <p className="mb-3 text-xs text-gold-700 dark:text-gold-200">{authMessage}</p> : null}
        <div className="flex flex-wrap gap-2">
          {(["bukhari", "muslim", "tirmidhi"] as const).map((name) => (
            <button
              className={`rounded-full px-4 py-2 text-sm ${collection === name ? "bg-emerald-500 text-white" : "border border-emerald-100 dark:border-emerald-900/50"}`}
              key={name}
              onClick={() => setCollection(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              className={`rounded-full px-3 py-1.5 text-xs ${category === item ? "bg-gold-400 text-white" : "border border-gold-200 dark:border-gold-600/30"}`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {filtered.map((entry) => {
            const favorite = favorites.includes(entry.id);

            return (
              <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40" key={entry.id}>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{entry.text}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{entry.reference}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{entry.narrator}</p>

                <div className="mt-3 flex gap-2">
                  <button
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${favorite ? "border-gold-400 text-gold-600" : "border-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"}`}
                    onClick={() => {
                      if (status !== "authenticated") {
                        setAuthMessage("Please sign in to save hadith.");
                        void signIn(undefined, { callbackUrl: window.location.href });
                        return;
                      }
                      toggleFavoriteHadith(entry.id);
                    }}
                    type="button"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {favorite ? "Saved" : "Favorite"}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                    onClick={async () => {
                      const text = `${entry.text}\n- ${entry.reference}`;
                      if (navigator.share) {
                        await navigator.share({ title: "Hadith", text }).catch(() => undefined);
                        return;
                      }

                      await navigator.clipboard.writeText(text).catch(() => undefined);
                    }}
                    type="button"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
