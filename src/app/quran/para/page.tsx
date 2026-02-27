"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ParaMeta } from "@/lib/quran/para";
import { ParaCard } from "@/components/ParaCard";
import { SectionHeading } from "@/components/shared/section-heading";

type ParaResponse = {
  para: ParaMeta[];
};

export default function ParaListingPage(): React.JSX.Element {
  const [para, setPara] = useState<ParaMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quran/para")
      .then((res) => res.json())
      .then((json: ParaResponse) => setPara(json.para ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <SectionHeading
        title="Para x Quran"
        subtitle="Read the Quran by 30 Paras with calm word-by-word focus and distraction-free layout."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} className="h-44 rounded-3xl border border-emerald-100 bg-white/70 dark:border-emerald-900/40 dark:bg-dark-800/60" key={index} transition={{ duration: 1.2, repeat: Infinity }} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {para.map((item) => (
            <ParaCard key={item.id} para={item} />
          ))}
        </div>
      )}
    </div>
  );
}
