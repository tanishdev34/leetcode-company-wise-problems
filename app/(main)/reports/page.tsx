import { StudyReportView } from "@/components/study-report-view";

export const metadata = {
  title: "Study Reports — LC Tracker",
  description: "Weekly study summary with highlights and recommended next actions",
};

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <StudyReportView />
    </div>
  );
}
