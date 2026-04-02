import { DashboardGreeting } from "@/components/dashboard-greeting";
import { UploadZone } from "@/components/upload-zone";
import { CaseList } from "@/components/case-list";

export default function DashboardPage() {
  return (
    <div className="pt-16">
      <DashboardGreeting />
      <p className="mt-2 text-base text-muted-foreground">
        Upload discovery request PDFs to start a new case.
      </p>
      <div className="mt-8">
        <UploadZone />
      </div>
      <div className="mt-8">
        <CaseList />
      </div>
    </div>
  );
}
