import { AiInterviewCoachWrapper } from "./coach-wrapper"

export const metadata = {
  title: "AI Interview Coach — LC Tracker",
  description: "Get AI-powered feedback on your solutions",
}

export default function CoachPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">AI Interview Coach</h1>
        <p className="mt-2 text-muted-foreground">
          Select a question you&apos;ve worked on and get structured feedback on your
          solution, including correctness, complexity, edge cases, and follow-up
          questions.
        </p>
      </div>
      <AiInterviewCoachWrapper />
    </div>
  )
}
