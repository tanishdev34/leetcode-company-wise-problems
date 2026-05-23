import { ReviewQueue } from "@/components/review-queue";

export const metadata = {
  title: "Review Queue — LC Tracker",
  description: "Spaced repetition review queue",
};

export default function ReviewsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ReviewQueue />
    </div>
  );
}
