import { HadithLibrary } from "@/components/hadith/hadith-library";
import { SectionHeading } from "@/components/shared/section-heading";

export default function HadithPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Wisdom of the Prophet ﷺ"
        subtitle="A fuller hadith reading experience with daily wisdom, search, saved hadith, collection browsing, and shareable reflections."
      />
      <HadithLibrary />
    </div>
  );
}
