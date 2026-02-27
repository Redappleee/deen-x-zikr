import { SectionHeading } from "@/components/shared/section-heading";
import { SalahCenter } from "@/components/salah/salah-center";

export default function SalahPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Salah Center"
        subtitle="Accurate prayer timings with geo-search for large and small places, calculation methods, countdown, and calendar."
      />
      <SalahCenter />
    </div>
  );
}
