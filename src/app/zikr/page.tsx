import { SectionHeading } from "@/components/shared/section-heading";
import { ZikrTools } from "@/components/zikr/zikr-tools";

export default function ZikrPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Zikr & Spiritual Tools"
        subtitle="Tasbih counter, duas, Hijri calendar, zakat estimation, Ramadan mode, and daily habit consistency."
      />
      <ZikrTools />
    </div>
  );
}
