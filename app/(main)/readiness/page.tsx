import { ReadinessScores } from "@/components/readiness-scores";

export const metadata = {
  title: "Interview Readiness — LC Tracker",
  description: "Per-company interview readiness scores",
};

export default function ReadinessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ReadinessScores />
    </div>
  );
}
