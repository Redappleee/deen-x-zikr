import Link from "next/link";
import { QuranReader } from "@/components/quran/quran-reader";
import { SectionHeading } from "@/components/shared/section-heading";

export default function QuranPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Divine Reading Experience"
        subtitle="Read Quran with translations, tafsir, audio reciters, bookmarks, and immersive focused reading mode."
      />
      <div className="mb-4">
        <Link className="inline-flex rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700 transition hover:shadow-aura dark:border-emerald-800/40 dark:text-emerald-200" href="/quran/para">
          Open Para x Quran (Word by Word)
        </Link>
      </div>
      <QuranReader />
    </div>
  );
}
