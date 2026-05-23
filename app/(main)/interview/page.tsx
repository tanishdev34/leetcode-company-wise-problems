import { InterviewRoom } from "@/components/interview-room"

export const metadata = {
  title: "Mock Interview Room — LC Tracker",
  description: "Practice with timed, randomly-selected LeetCode questions",
}

export default function InterviewPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <InterviewRoom />
    </div>
  )
}
