"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Copy, RefreshCw, Search, Share2, Star } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { GlassCard } from "@/components/shared/glass-card";
import { useAppStore } from "@/store/use-app-store";
import type { HadithEntry } from "@/lib/data/hadith";

const collections = ["all", "bukhari", "muslim", "tirmidhi"] as const;
const categories = ["all", "faith", "character", "prayer", "knowledge"] as const;

function formatCollection(name: HadithEntry["collection"]): string {
  if (name === "tirmidhi") return "Tirmidhi";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatCategory(name: HadithEntry["category"]): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildShareText(entry: HadithEntry): string {
  return `${entry.text}\n\n${entry.narrator}\n${entry.reference}`;
}

export function HadithLibrary(): React.JSX.Element {
  const { status } = useSession();
  const favorites = useAppStore((state) => state.favoriteHadith);
  const toggleFavoriteHadith = useAppStore((state) => state.toggleFavoriteHadith);

  const [rows, setRows] = useState<HadithEntry[]>([]);
  const [daily, setDaily] = useState<HadithEntry | null>(null);
  const [collection, setCollection] = useState<(typeof collections)[number]>("all");
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hadith")
      .then((res) => res.json())
      .then((json: { hadith: HadithEntry[] }) => setRows(json.hadith ?? []))
      .catch(() => setRows([]));

    fetch("/api/daily-hadith")
      .then((res) => res.json())
      .then((json: { hadith: HadithEntry }) => setDaily(json.hadith))
      .catch(() => setDaily(null));
  }, []);

  useEffect(() => {
    if (!authMessage) return;
    const timer = window.setTimeout(() => setAuthMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [authMessage]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((entry) => {
      if (collection !== "all" && entry.collection !== collection) return false;
      if (category !== "all" && entry.category !== category) return false;
      if (favoritesOnly && !favorites.includes(entry.id)) return false;

      if (!query) return true;

      const haystack = `${entry.text} ${entry.narrator} ${entry.reference} ${entry.collection} ${entry.category}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [category, collection, favorites, favoritesOnly, rows, search]);

  const activeEntry = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find((entry) => entry.id === activeEntryId) ?? filtered[0];
  }, [activeEntryId, filtered]);

  useEffect(() => {
    if (!activeEntry && filtered.length) {
      setActiveEntryId(filtered[0].id);
      return;
    }

    if (activeEntryId && !filtered.some((entry) => entry.id === activeEntryId)) {
      setActiveEntryId(filtered[0]?.id ?? null);
    }
  }, [activeEntry, activeEntryId, filtered]);

  const collectionStats = useMemo(() => {
    return {
      total: rows.length,
      bukhari: rows.filter((entry) => entry.collection === "bukhari").length,
      muslim: rows.filter((entry) => entry.collection === "muslim").length,
      tirmidhi: rows.filter((entry) => entry.collection === "tirmidhi").length
    };
  }, [rows]);

  const saveHadith = (entry: HadithEntry) => {
    if (status !== "authenticated") {
      setAuthMessage("Please sign in to save hadith.");
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    toggleFavoriteHadith(entry.id);
    setNotice(favorites.includes(entry.id) ? "Hadith removed from saved items." : "Hadith saved.");
  };

  const copyHadith = async (entry: HadithEntry) => {
    try {
      await navigator.clipboard.writeText(buildShareText(entry));
      setNotice("Hadith copied.");
    } catch {
      setNotice("Copy failed.");
    }
  };

  const shareHadith = async (entry: HadithEntry) => {
    const text = buildShareText(entry);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Hadith",
          text
        });
        setNotice("Hadith shared.");
        return;
      }

      await navigator.clipboard.writeText(text);
      setNotice("Hadith copied instead of shared.");
    } catch {
      setNotice("Share failed.");
    }
  };

  const spotlightHadith = () => {
    if (!filtered.length) return;
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    setActiveEntryId(random.id);
    setNotice("Hadith spotlight refreshed.");
  };

  return (
    <div className="space-y-5">
      <GlassCard className="overflow-hidden bg-gradient-to-br from-emerald-50/90 to-surface dark:from-dark-800 dark:to-dark-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Daily Hadith</p>
            {daily ? (
              <>
                <p className="mt-3 text-xl leading-relaxed text-slate-800 dark:text-slate-100">{daily.text}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-emerald-200 px-2.5 py-1 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">
                    {formatCollection(daily.collection)}
                  </span>
                  <span className="rounded-full border border-gold-300 px-2.5 py-1 text-gold-700 dark:border-gold-700/40 dark:text-gold-200">
                    {formatCategory(daily.category)}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{daily.narrator}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{daily.reference}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading the hadith of the day...</p>
            )}
          </div>

          {daily ? (
            <div className="flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs ${
                  favorites.includes(daily.id)
                    ? "border-gold-400 text-gold-600 dark:text-gold-200"
                    : "border-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                }`}
                onClick={() => saveHadith(daily)}
                type="button"
              >
                <Star className="h-3.5 w-3.5" />
                {favorites.includes(daily.id) ? "Saved" : "Save"}
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                onClick={() => copyHadith(daily)}
                type="button"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                onClick={() => shareHadith(daily)}
                type="button"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          ) : null}
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Collections</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{collectionStats.total}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Across Bukhari, Muslim, and Tirmidhi.</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Visible Results</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{filtered.length}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Based on your current search and filters.</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Saved Hadith</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{favorites.length}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your personal hadith shortlist.</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Today&apos;s Source</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800 dark:text-emerald-100">{daily ? formatCollection(daily.collection) : "--"}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{daily ? formatCategory(daily.category) : "Loading..."}</p>
        </GlassCard>
      </div>

      <GlassCard>
        {authMessage ? <p className="mb-3 text-xs text-gold-700 dark:text-gold-200">{authMessage}</p> : null}
        {notice ? <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-200">{notice}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="w-full rounded-2xl border border-emerald-100 bg-white px-10 py-2.5 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hadith, narrator, collection, or topic"
              value={search}
            />
          </div>

          <button
            className={`rounded-full px-4 py-2 text-sm ${favoritesOnly ? "bg-gold-400 text-white" : "border border-gold-200 dark:border-gold-600/30"}`}
            onClick={() => setFavoritesOnly((value) => !value)}
            type="button"
          >
            {favoritesOnly ? "Showing Saved" : "Saved Only"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
            onClick={spotlightHadith}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Surprise Me
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {collections.map((name) => (
            <button
              className={`rounded-full px-4 py-2 text-sm ${
                collection === name ? "bg-emerald-500 text-white" : "border border-emerald-100 dark:border-emerald-900/50"
              }`}
              key={name}
              onClick={() => setCollection(name)}
              type="button"
            >
              {name === "all" ? "All Collections" : formatCollection(name)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              className={`rounded-full px-3 py-1.5 text-xs ${
                category === item ? "bg-gold-400 text-white" : "border border-gold-200 dark:border-gold-600/30"
              }`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item === "all" ? "All Topics" : formatCategory(item)}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-100/80 bg-white/75 p-3 dark:border-emerald-900/40 dark:bg-dark-700/70">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Collection Overview</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-2xl border border-emerald-100 px-3 py-2 dark:border-emerald-900/40">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-100">{collectionStats.bukhari}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bukhari</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 px-3 py-2 dark:border-emerald-900/40">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-100">{collectionStats.muslim}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Muslim</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 px-3 py-2 dark:border-emerald-900/40">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-100">{collectionStats.tirmidhi}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tirmidhi</p>
                </div>
              </div>
            </div>

            <div className="max-h-[700px] space-y-3 overflow-auto pr-1">
              {filtered.length ? (
                filtered.map((entry) => {
                  const favorite = favorites.includes(entry.id);
                  const active = activeEntry?.id === entry.id;

                  return (
                    <button
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-emerald-400 bg-emerald-50/90 dark:border-emerald-700 dark:bg-emerald-900/20"
                          : "border-emerald-100 bg-white/70 dark:border-emerald-900/40 dark:bg-dark-700/60"
                      }`}
                      key={entry.id}
                      onClick={() => setActiveEntryId(entry.id)}
                      type="button"
                    >
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em]">
                        <span className="rounded-full border border-emerald-200 px-2 py-1 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">
                          {formatCollection(entry.collection)}
                        </span>
                        <span className="rounded-full border border-gold-300 px-2 py-1 text-gold-700 dark:border-gold-700/40 dark:text-gold-200">
                          {formatCategory(entry.category)}
                        </span>
                        {favorite ? <span className="rounded-full border border-gold-300 px-2 py-1 text-gold-700 dark:border-gold-700/40 dark:text-gold-200">Saved</span> : null}
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{entry.text}</p>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{entry.reference}</p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald-200 p-6 text-sm text-slate-600 dark:border-emerald-900/40 dark:text-slate-300">
                  No hadith match your current search and filters.
                </div>
              )}
            </div>
          </div>

          <GlassCard className="h-fit">
            {activeEntry ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em]">
                  <span className="rounded-full border border-emerald-200 px-2 py-1 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">
                    {formatCollection(activeEntry.collection)}
                  </span>
                  <span className="rounded-full border border-gold-300 px-2 py-1 text-gold-700 dark:border-gold-700/40 dark:text-gold-200">
                    {formatCategory(activeEntry.category)}
                  </span>
                </div>

                <p className="mt-4 text-xl leading-relaxed text-slate-800 dark:text-slate-100">{activeEntry.text}</p>

                <div className="mt-5 rounded-2xl border border-emerald-100/80 bg-white/70 p-4 dark:border-emerald-900/40 dark:bg-dark-700/65">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Narrator</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{activeEntry.narrator}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Reference</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{activeEntry.reference}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs ${
                      favorites.includes(activeEntry.id)
                        ? "border-gold-400 text-gold-600 dark:text-gold-200"
                        : "border-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                    }`}
                    onClick={() => saveHadith(activeEntry)}
                    type="button"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {favorites.includes(activeEntry.id) ? "Saved" : "Save"}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                    onClick={() => copyHadith(activeEntry)}
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-100 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
                    onClick={() => shareHadith(activeEntry)}
                    type="button"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-gold-300/40 bg-gold-100/25 p-4 dark:border-gold-700/30 dark:bg-gold-700/10">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-700 dark:text-gold-200">
                    <BookOpenText className="h-4 w-4" />
                    Reflection
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Read slowly, reflect on the meaning, and save the hadith if you want it to stay part of your daily study.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">Choose a hadith from the library to read it in full.</p>
            )}
          </GlassCard>
        </div>
      </GlassCard>
    </div>
  );
}
