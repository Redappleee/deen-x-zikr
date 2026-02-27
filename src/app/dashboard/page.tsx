import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { SectionHeading } from "@/components/shared/section-heading";

export default function DashboardPage(): React.JSX.Element {
  return (
    <div>
      <SectionHeading
        title="User Dashboard"
        subtitle="Manage your account, spiritual progress, bookmarks, and saved preferences."
      />
      <UserDashboard />
    </div>
  );
}
