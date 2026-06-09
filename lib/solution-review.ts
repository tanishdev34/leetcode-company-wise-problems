import { prisma } from "@/lib/db"

const RETRY_DELAYS_MS = [2000, 8000, 30000]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runSolutionReview(code: string, language: string, title: string) {
  const { generateText, Output } = await import("ai")
  const { getAiModel } = await import("@/lib/ai")
  const { z } = await import("zod")

  const schema = z.object({
    correctness: z
      .enum(["correct", "partially_correct", "incorrect"])
      .describe("Does the solution correctly solve the problem?"),
    timeComplexity: z.string().describe("Big O time complexity with reasoning"),
    spaceComplexity: z.string().describe("Big O space complexity with reasoning"),
    edgeCases: z.array(z.string()).describe("Edge cases the solution handles or misses"),
    explanation: z.string().describe("Quality of the solution explanation and code clarity"),
    followUps: z.array(z.string()).describe("2-3 follow-up questions an interviewer might ask"),
    suggestions: z.string().describe("Specific improvement suggestions for the solution"),
  })

  const { output } = await generateText({
    model: getAiModel(),
    output: Output.object({ schema }),
    prompt: `You are a technical interviewer reviewing a candidate's solution to the problem "${title}". Analyze the following ${language} code and provide interview-style feedback.

Code:
\`\`\`${language}
${code}
\`\`\``,
  })

  return output
}

export async function processSolutionReview(jobId: string): Promise<void> {
  const job = await prisma.solutionReview.findUnique({ where: { id: jobId } })
  if (!job || job.status === "done") return

  await prisma.solutionReview.update({
    where: { id: jobId },
    data: { status: "running" },
  })

  // Fetch the question title
  const question = await prisma.question.findUnique({
    where: { id: job.questionId },
    select: { title: true },
  })
  const title = question?.title ?? "Unknown Problem"

  let lastError: unknown = null

  for (let attempt = job.attempts; attempt < job.maxAttempts; attempt++) {
    try {
      const review = await runSolutionReview(job.code, job.language, title)

      await prisma.solutionReview.update({
        where: { id: jobId },
        data: {
          status: "done",
          attempts: attempt + 1,
          error: null,
          correctness: review.correctness,
          timeComplexity: review.timeComplexity,
          spaceComplexity: review.spaceComplexity,
          edgeCases: JSON.stringify(review.edgeCases),
          explanation: review.explanation,
          followUps: JSON.stringify(review.followUps),
          suggestions: review.suggestions,
        },
      })
      return
    } catch (err) {
      lastError = err
      console.error(`solutionReview ${jobId} attempt ${attempt + 1} failed:`, err)

      const isLast = attempt + 1 >= job.maxAttempts
      await prisma.solutionReview.update({
        where: { id: jobId },
        data: {
          attempts: attempt + 1,
          error: err instanceof Error ? err.message : String(err),
          status: isLast ? "error" : "running",
        },
      })

      if (isLast) return
      const delay =
        RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
      await sleep(delay)
    }
  }

  console.error(`solutionReview ${jobId} exhausted retries:`, lastError)
}
