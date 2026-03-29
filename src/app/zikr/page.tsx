import { SectionHeading } from "@/components/shared/section-heading";
import { ZikrTools } from "@/components/zikr/zikr-tools";

export default function ZikrPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Zikr & Spiritual Tools"
        subtitle="Guided tasbih, rotating duas, Hijri calendar, Ramadan controls, a richer zakat calculator, and daily spiritual consistency tools."
      />
      <ZikrTools />
    </div>
  );
}
