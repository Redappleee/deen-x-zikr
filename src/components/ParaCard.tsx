import Link from "next/link";
import { motion } from "framer-motion";
import type { ParaMeta } from "@/lib/quran/para";

type Props = {
  para: ParaMeta;
};

export function ParaCard({ para }: Props): React.JSX.Element {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.2 }}>
      <Link
        className="group block rounded-3xl border border-emerald-100/70 bg-white/80 p-4 shadow-card transition hover:shadow-aura dark:border-emerald-900/40 dark:bg-dark-800/70"
        href={`/quran/para/${para.id}`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Para {para.id}</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{para.name}</h3>
        <div className="my-3 h-px bg-gradient-to-r from-transparent via-gold-300/80 to-transparent dark:via-gold-700/60" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Start: {para.startSurahName}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ayah: {para.startSurah}:{para.startAyah}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total Ayahs: {para.totalAyahs}</p>
      </Link>
    </motion.div>
  );
}
