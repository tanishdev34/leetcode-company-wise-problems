import { StudyPlanner } from "@/components/study-planner";

export const metadata = {
  title: "Study Planner — LC Tracker",
  description: "Plan your weekly practice sessions",
};

export default function PlannerPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <StudyPlanner />
    </div>
  );
}
