import { HadithLibrary } from "@/components/hadith/hadith-library";
import { SectionHeading } from "@/components/shared/section-heading";

export default function HadithPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Wisdom of the Prophet ﷺ"
        subtitle="Read and save hadith from major collections with category filters and daily reflections."
      />
      <HadithLibrary />
    </div>
  );
}
