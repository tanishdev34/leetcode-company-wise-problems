import { MistakeMemoryView } from "@/components/mistake-memory-view";

export const metadata = {
  title: "Mistake Memory — LC Tracker",
  description: "Recurring mistake patterns from reviews and mock interviews",
};

export default function MistakeMemoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <MistakeMemoryView />
    </div>
  );
}
