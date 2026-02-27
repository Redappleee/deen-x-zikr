"use client";

import { motion } from "framer-motion";

type QuranWordData = {
  id: number;
  position: number;
  text: string;
  translation: string;
  transliteration: string;
  audioUrl: string;
  charType: string;
};

type Props = {
  word: QuranWordData;
  fontSize: number;
  showWordByWord: boolean;
  showTransliteration: boolean;
  tajweedEnabled: boolean;
  isActive: boolean;
  onClick: () => void;
};

function tajweedClass(word: QuranWordData): string {
  if (!word.charType) return "text-emerald-800 dark:text-emerald-200";
  if (word.charType.includes("end")) return "text-gold-700 dark:text-gold-300";
  if (word.charType.includes("pause")) return "text-sky-700 dark:text-sky-300";
  return "text-emerald-800 dark:text-emerald-200";
}

export function QuranWord({
  word,
  fontSize,
  showWordByWord,
  showTransliteration,
  tajweedEnabled,
  isActive,
  onClick
}: Props): React.JSX.Element {
  return (
    <motion.button
      animate={isActive ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.95] } : { scale: 1, opacity: 1 }}
      className={`group rounded-2xl px-2 py-1.5 text-center transition ${isActive ? "bg-gold-100/70 dark:bg-gold-900/30" : "hover:bg-emerald-50 dark:hover:bg-dark-700"}`}
      onClick={onClick}
      transition={{ duration: 0.3 }}
      type="button"
    >
      <p className={`font-arabic leading-tight ${tajweedEnabled ? tajweedClass(word) : "text-emerald-900 dark:text-emerald-100"}`} style={{ fontSize }}>
        {word.text}
      </p>
      {showWordByWord ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{word.translation || "-"}</p> : null}
      {showTransliteration ? <p className="text-[10px] text-slate-400 dark:text-slate-500">{word.transliteration || ""}</p> : null}
    </motion.button>
  );
}
