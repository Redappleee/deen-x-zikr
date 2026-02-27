"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, ChevronLeft, Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { QuranWord } from "@/components/QuranWord";
import { PARA_META } from "@/lib/quran/para";
import { useAppStore } from "@/store/use-app-store";

type WordData = {
  id: number;
  position: number;
  text: string;
  translation: string;
  transliteration: string;
  audioUrl: string;
  charType: string;
};

type VerseData = {
  id: number;
  verseKey: string;
  text: string;
  words: WordData[];
};

type ParaApiResponse = {
  paraId: number;
  verses: VerseData[];
  pagination: {
    page: number;
    hasMore: boolean;
    totalPages: number;
    totalRecords: number;
  };
};

export default function ParaReaderPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const paraId = Number(params.id);
  const { status } = useSession();

  const toggleBookmarkAyah = useAppStore((state) => state.toggleBookmarkAyah);
  const bookmarkedAyahs = useAppStore((state) => state.bookmarkedAyahs);
  const paraReadProgress = useAppStore((state) => state.paraReadProgress);
  const setParaReadProgress = useAppStore((state) => state.setParaReadProgress);

  const [verses, setVerses] = useState<VerseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [showWordByWord, setShowWordByWord] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [tajweedEnabled, setTajweedEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(38);

  const [activeWordId, setActiveWordId] = useState<number | null>(null);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const paraMeta = PARA_META.find((item) => item.id === paraId);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    setVerses([]);

    fetch(`/api/quran/para/${paraId}?page=1&perPage=8`)
      .then((res) => res.json())
      .then((json: ParaApiResponse) => {
        setVerses(json.verses ?? []);
        setHasMore(Boolean(json.pagination?.hasMore));
      })
      .finally(() => setLoading(false));
  }, [paraId]);

  useEffect(() => {
    const stored = paraReadProgress[paraId];
    if (!stored) return;
    setActiveVerseKey(stored.verseKey);
    setActiveWordId(stored.wordId);
  }, [paraId, paraReadProgress]);

  useEffect(() => {
    if (!activeWordId || !activeVerseKey) return;
    window.setTimeout(() => {
      resumeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [activeWordId, activeVerseKey, verses.length]);

  useEffect(() => {
    if (!authMessage) return;
    const timer = window.setTimeout(() => setAuthMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [authMessage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/quran/para/${paraId}?page=${nextPage}&perPage=8`);
      if (!res.ok) return;
      const json = (await res.json()) as ParaApiResponse;

      setVerses((prev) => [...prev, ...(json.verses ?? [])]);
      setHasMore(Boolean(json.pagination?.hasMore));
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, paraId]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "380px 0px"
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore, verses.length]);

  const scrollToVerse = useCallback((verseKey: string) => {
    const target = verseRefs.current[verseKey];
    if (!target) return;
    setActiveVerseKey(verseKey);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const bookmarkState = useMemo(() => {
    if (!activeVerseKey) return false;
    return bookmarkedAyahs.includes(activeVerseKey);
  }, [activeVerseKey, bookmarkedAyahs]);

  return (
    <div>
      <div className="sticky top-[64px] z-30 mb-4 rounded-3xl border border-emerald-100/70 bg-white/90 p-4 shadow-card backdrop-blur dark:border-emerald-900/40 dark:bg-dark-800/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300" href="/quran/para">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Paras
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Para {paraId} {paraMeta ? `· ${paraMeta.name}` : ""}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`rounded-full border px-3 py-1.5 text-xs ${bookmarkState ? "border-gold-400 text-gold-700 dark:text-gold-200" : "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"}`}
              onClick={() => {
                if (status !== "authenticated") {
                  setAuthMessage("Please sign in to save ayahs.");
                  void signIn(undefined, { callbackUrl: window.location.href });
                  return;
                }
                if (!activeVerseKey) return;
                toggleBookmarkAyah(activeVerseKey);
              }}
              type="button"
            >
              <Bookmark className="mr-1 inline h-3.5 w-3.5" />
              Bookmark Ayah
            </button>

            <label className="text-xs text-slate-600 dark:text-slate-300">Font</label>
            <input max={52} min={26} onChange={(e) => setFontSize(Number(e.target.value))} type="range" value={fontSize} />

            <button className={`rounded-full px-3 py-1.5 text-xs ${showWordByWord ? "bg-emerald-500 text-white" : "border border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"}`} onClick={() => setShowWordByWord(!showWordByWord)} type="button">
              Word by Word {showWordByWord ? "On" : "Off"}
            </button>
            <button className={`rounded-full px-3 py-1.5 text-xs ${showTransliteration ? "bg-gold-400 text-white" : "border border-gold-300 text-gold-700 dark:border-gold-700/40 dark:text-gold-200"}`} onClick={() => setShowTransliteration(!showTransliteration)} type="button">
              Transliteration
            </button>
            <button className={`rounded-full px-3 py-1.5 text-xs ${tajweedEnabled ? "bg-emerald-700 text-white" : "border border-emerald-300 text-emerald-700 dark:border-emerald-700/40 dark:text-emerald-200"}`} onClick={() => setTajweedEnabled(!tajweedEnabled)} type="button">
              Tajweed Colors
            </button>
          </div>
        </div>
        {authMessage ? <p className="mt-2 text-xs text-gold-700 dark:text-gold-200">{authMessage}</p> : null}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="h-36 rounded-3xl border border-emerald-100 bg-white/70 p-4 dark:border-emerald-900/40 dark:bg-dark-800/60" key={index}>
              <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} className="h-full w-full rounded-2xl bg-emerald-100/60 dark:bg-emerald-900/30" transition={{ duration: 1.1, repeat: Infinity }} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex gap-2 overflow-x-auto lg:hidden">
            {verses.map((verse) => (
              <button
                className={`rounded-full border px-3 py-1.5 text-xs whitespace-nowrap ${activeVerseKey === verse.verseKey ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"}`}
                key={`m-${verse.verseKey}`}
                onClick={() => scrollToVerse(verse.verseKey)}
                type="button"
              >
                {verse.verseKey}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-[168px] max-h-[calc(100vh-190px)] overflow-auto rounded-3xl border border-emerald-100/70 bg-white/80 p-3 shadow-card dark:border-emerald-900/40 dark:bg-dark-800/70">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ayah Index</p>
                <div className="space-y-1">
                  {verses.map((verse) => (
                    <button
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${activeVerseKey === verse.verseKey ? "bg-emerald-500 text-white" : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-dark-700"}`}
                      key={`d-${verse.verseKey}`}
                      onClick={() => scrollToVerse(verse.verseKey)}
                      type="button"
                    >
                      {verse.verseKey}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-4">
              {verses.map((verse, verseIndex) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-emerald-100/70 bg-white/85 p-4 shadow-card dark:border-emerald-900/40 dark:bg-dark-800/70"
                  initial={{ opacity: 0, y: 8 }}
                  key={`v-${verse.verseKey}`}
                  ref={(node) => {
                    verseRefs.current[verse.verseKey] = node;
                  }}
                  transition={{ duration: 0.28, delay: Math.min(verseIndex * 0.02, 0.25) }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{verse.verseKey}</p>

                  {showWordByWord ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {verse.words.map((word) => (
                        <div key={`${verse.verseKey}-${word.id}-${word.position}`} ref={activeWordId === word.id ? resumeRef : null}>
                          <QuranWord
                            fontSize={fontSize}
                            isActive={activeWordId === word.id}
                            onClick={() => {
                              setActiveVerseKey(verse.verseKey);
                              setActiveWordId(word.id);
                              setParaReadProgress(paraId, { verseKey: verse.verseKey, wordId: word.id });

                              if (!word.audioUrl) return;
                              if (!audioRef.current) {
                                audioRef.current = new Audio();
                              }

                              audioRef.current.src = word.audioUrl;
                              audioRef.current.play().catch(() => undefined);
                              audioRef.current.onended = () => setActiveWordId(null);
                            }}
                            showTransliteration={showTransliteration}
                            showWordByWord={showWordByWord}
                            tajweedEnabled={tajweedEnabled}
                            word={word}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 text-right">
                      <p className={`font-arabic leading-[2.1] text-emerald-900 dark:text-emerald-100`} style={{ fontSize }}>
                        {verse.text}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{verse.words.map((word) => word.translation).join(" ")}</p>
                    </div>
                  )}
                </motion.div>
              ))}

              <div ref={sentinelRef} />

              {loadingMore ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100/70 bg-white/70 py-3 text-sm text-slate-600 dark:border-emerald-900/40 dark:bg-dark-800/60 dark:text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more ayahs...
                </div>
              ) : null}

              {!hasMore ? <p className="text-center text-xs text-slate-500 dark:text-slate-400">You reached the end of this Para.</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
