import { QiblaFinder } from "@/components/qibla/qibla-finder";
import { SectionHeading } from "@/components/shared/section-heading";

export default function QiblaPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="Find the Kaaba"
        subtitle="Real-time Qibla compass with smooth needle movement and map fallback when orientation sensors are limited."
      />
      <QiblaFinder />
    </div>
  );
}
