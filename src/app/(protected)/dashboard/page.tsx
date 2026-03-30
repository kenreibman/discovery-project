import { DashboardGreeting } from "@/components/dashboard-greeting";
import { UploadZoneShell } from "@/components/upload-zone-shell";

export default function DashboardPage() {
  return (
    <div className="pt-16">
      <DashboardGreeting />
      <div className="mt-8">
        <UploadZoneShell />
      </div>
    </div>
  );
}
