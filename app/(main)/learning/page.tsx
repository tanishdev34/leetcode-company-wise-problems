import { LearningGraphView } from "@/components/learning-graph-view";

export const metadata = {
  title: "Learning Graph — LC Tracker",
  description: "Topic, question, company, and review relationships as an interactive graph",
};

export default function LearningGraphPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <LearningGraphView />
    </div>
  );
}
