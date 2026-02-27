"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Loader2, Search, Volume2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { GlassCard } from "@/components/shared/glass-card";
import { useAppStore } from "@/store/use-app-store";
import type { SurahSummary } from "@/types";

type SurahPayload = {
  surah: {
    number: number;
    englishName: string;
    name: string;
    ayahs: Array<{
      number: number;
      text: string;
      tajweedText: string;
      translation: string;
      tafsir: string;
      audio: string;
    }>;
  };
};

const TRANSLATIONS = [
  { value: "en.asad", label: "English (Asad)" },
  { value: "en.pickthall", label: "English (Pickthall)" },
  { value: "bn.bengali", label: "Bangla" },
  { value: "ur.jalandhry", label: "Urdu" }
];

const TAFSIR = [
  { value: "en.mubarakpuri", label: "Tafsir (Mubarakpuri)" },
  { value: "en.asad", label: "Interpretive Notes (Asad)" }
];

const RECITERS = [
  { value: "ar.alafasy", label: "Mishary Alafasy" },
  { value: "ar.abdurrahmaansudais", label: "Abdur-Rahman As-Sudais" },
  { value: "ar.husary", label: "Mahmoud Khalil Al-Husary" }
];

function renderTajweedMarkup(text: string): string {
  const classMap: Record<string, string> = {
    ghunnah: "text-[#8b5cf6]",
    qalqalah: "text-[#ef4444]",
    ikhafa: "text-[#d97706]",
    idgham_ghunnah: "text-[#0ea5e9]",
    idgham_wo_ghunnah: "text-[#0891b2]",
    iqlab: "text-[#16a34a]",
    madd_2: "text-[#ca8a04]",
    madd_6: "text-[#dc2626]"
  };

  const stripped = text.replace(/<(?!\/?tajweed\b)[^>]*>/g, "");
  return stripped
    .replace(/<tajweed class=([a-z0-9_]+)>/g, (_, cls: string) => `<span class="${classMap[cls] ?? "text-emerald-700"}">`)
    .replace(/<\/tajweed>/g, "</span>");
}

export function QuranReader(): React.JSX.Element {
  const { status } = useSession();

  const bookmarkedAyahs = useAppStore((state) => state.bookmarkedAyahs);
  const toggleBookmarkAyah = useAppStore((state) => state.toggleBookmarkAyah);
  const lastReadSurah = useAppStore((state) => state.lastReadSurah);
  const lastReadAyah = useAppStore((state) => state.lastReadAyah);
  const setLastReadSurah = useAppStore((state) => state.setLastReadSurah);
  const setLastReadAyah = useAppStore((state) => state.setLastReadAyah);

  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [surahSearch, setSurahSearch] = useState("");
  const [verseSearch, setVerseSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState<number>(lastReadSurah ?? 1);
  const [translation, setTranslation] = useState("en.asad");
  const [tafsir, setTafsir] = useState("en.mubarakpuri");
  const [reciter, setReciter] = useState("ar.alafasy");
  const [fontSize, setFontSize] = useState(34);
  const [nightReading, setNightReading] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [surahData, setSurahData] = useState<SurahPayload["surah"] | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoadingList(true);
    fetch("/api/quran")
      .then((res) => res.json())
      .then((json: { surahs: SurahSummary[] }) => setSurahs(json.surahs ?? []))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    setLoadingSurah(true);
    fetch(`/api/surah/${selectedSurah}?translation=${translation}&tafsir=${tafsir}&reciter=${reciter}`)
      .then((res) => res.json())
      .then((json: SurahPayload) => setSurahData(json.surah))
      .finally(() => setLoadingSurah(false));
    setLastReadSurah(selectedSurah);
  }, [selectedSurah, translation, tafsir, reciter, setLastReadSurah]);

  const filteredSurahs = useMemo(() => {
    if (!surahSearch.trim()) return surahs;
    const q = surahSearch.toLowerCase();
    return surahs.filter((surah) => surah.englishName.toLowerCase().includes(q) || surah.name.includes(surahSearch) || String(surah.number) === surahSearch.trim());
  }, [surahSearch, surahs]);

  const filteredAyahs = useMemo(() => {
    if (!surahData) return [];
    if (!verseSearch.trim()) return surahData.ayahs;
    const q = verseSearch.toLowerCase();
    return surahData.ayahs.filter((ayah) => ayah.translation.toLowerCase().includes(q) || ayah.text.includes(verseSearch) || String(ayah.number) === verseSearch.trim());
  }, [surahData, verseSearch]);

  useEffect(() => {
    if (!surahData) return;
    if (!lastReadAyah || surahData.number !== lastReadSurah) return;
    const found = surahData.ayahs.find((ayah) => ayah.number === lastReadAyah);
    if (!found) return;
    setActiveAyah(lastReadAyah);
    window.setTimeout(() => {
      resumeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [surahData, lastReadAyah, lastReadSurah]);

  useEffect(() => {
    if (!authMessage) return;
    const timer = window.setTimeout(() => setAuthMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [authMessage]);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <GlassCard className="h-fit">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-2xl border border-emerald-100 bg-white px-10 py-2.5 text-sm outline-none ring-emerald-500 focus:ring dark:border-emerald-900/50 dark:bg-dark-700"
            onChange={(e) => setSurahSearch(e.target.value)}
            placeholder="Search Surah by name or number"
            value={surahSearch}
          />
        </div>

        <div className="mt-4 grid gap-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">Translation</label>
          <select className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-dark-700" onChange={(e) => setTranslation(e.target.value)} value={translation}>
            {TRANSLATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">Tafsir</label>
          <select className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-dark-700" onChange={(e) => setTafsir(e.target.value)} value={tafsir}>
            {TAFSIR.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">Reciter</label>
          <select className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-dark-700" onChange={(e) => setReciter(e.target.value)} value={reciter}>
            {RECITERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-full border border-emerald-100 px-3 py-1.5 text-xs dark:border-emerald-900/40" onClick={() => setNightReading((value) => !value)} type="button">
            {nightReading ? "Night Mode On" : "Night Mode Off"}
          </button>
          <button className="rounded-full border border-emerald-100 px-3 py-1.5 text-xs dark:border-emerald-900/40" onClick={() => setShowTafsir((value) => !value)} type="button">
            {showTafsir ? "Hide Tafsir" : "Show Tafsir"}
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">Arabic Font Size ({fontSize}px)</label>
          <input className="mt-2 w-full" max={52} min={24} onChange={(e) => setFontSize(Number(e.target.value))} type="range" value={fontSize} />
        </div>

        <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-emerald-100 p-2 dark:border-emerald-900/40">
          {loadingList ? (
            <p className="flex items-center gap-2 p-3 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading surahs...
            </p>
          ) : (
            filteredSurahs.map((surah) => (
              <button
                className={`mb-1 w-full rounded-xl px-3 py-2 text-left transition ${selectedSurah === surah.number ? "bg-emerald-500 text-white" : "hover:bg-emerald-50 dark:hover:bg-dark-700"}`}
                key={surah.number}
                onClick={() => {
                  setLastReadAyah(1);
                  setSelectedSurah(surah.number);
                }}
                type="button"
              >
                <p className="text-sm font-medium">
                  {surah.number}. {surah.englishName}
                </p>
                <p className="font-arabic text-base">{surah.name}</p>
              </button>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className={`${nightReading ? "bg-dark-900 text-emerald-50" : ""}`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-2xl font-semibold">{surahData ? `${surahData.number}. ${surahData.englishName}` : "Select Surah"}</h3>
            <p className="font-arabic text-3xl text-emerald-700 dark:text-emerald-300">{surahData?.name}</p>
          </div>
          <input
            className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
            onChange={(e) => setVerseSearch(e.target.value)}
            placeholder="Search ayah/keyword"
            value={verseSearch}
          />
        </div>
        {authMessage ? <p className="mb-3 text-xs text-gold-700 dark:text-gold-200">{authMessage}</p> : null}

        {loadingSurah ? (
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading verses...
          </p>
        ) : null}

        <AnimatePresence mode="wait">
          {surahData ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              key={`${surahData.number}-${translation}-${reciter}`}
              transition={{ duration: 0.35 }}
            >
              {filteredAyahs.map((ayah) => {
                const bookmarkId = `${surahData.number}:${ayah.number}`;
                const isBookmarked = bookmarkedAyahs.includes(bookmarkId);
                const isActive = activeAyah === ayah.number;

                return (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className={`rounded-2xl border p-4 transition ${isActive ? "border-emerald-400 shadow-aura" : "border-emerald-100 dark:border-emerald-900/40"}`}
                    initial={{ opacity: 0 }}
                    key={ayah.number}
                    ref={isActive ? resumeRef : null}
                    transition={{ duration: 0.25, delay: Math.min(ayah.number * 0.008, 0.35) }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Ayah {ayah.number}</p>
                      <div className="flex items-center gap-2">
                        <button
                          aria-label="Play Ayah"
                          className="rounded-full border border-emerald-100 p-1.5 text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-200"
                          onClick={() => {
                            if (!ayah.audio) return;
                            if (!audioRef.current) {
                              audioRef.current = new Audio();
                            }

                            audioRef.current.src = ayah.audio;
                            audioRef.current.play().catch(() => undefined);
                            setActiveAyah(ayah.number);
                            setLastReadAyah(ayah.number);
                            audioRef.current.onended = () => setActiveAyah(null);
                          }}
                          type="button"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Bookmark Ayah"
                          className={`rounded-full border p-1.5 transition ${isBookmarked ? "border-gold-400 bg-gold-200/40 text-gold-600" : "border-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-200"}`}
                          onClick={() => {
                            if (status !== "authenticated") {
                              setAuthMessage("Please sign in to save ayahs.");
                              void signIn(undefined, { callbackUrl: window.location.href });
                              return;
                            }
                            toggleBookmarkAyah(bookmarkId);
                            setLastReadAyah(ayah.number);
                          }}
                          type="button"
                        >
                          <Bookmark className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p
                      className="font-arabic leading-[2.2]"
                      dangerouslySetInnerHTML={{ __html: renderTajweedMarkup(ayah.tajweedText) }}
                      style={{ fontSize }}
                    />
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{ayah.translation}</p>
                    {showTafsir ? <p className="mt-2 rounded-xl bg-emerald-50/80 p-3 text-xs text-slate-700 dark:bg-dark-700 dark:text-slate-200">{ayah.tafsir}</p> : null}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}
