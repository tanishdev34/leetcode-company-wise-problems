import { prisma } from "@/lib/db"

const RETRY_DELAYS_MS = [2000, 8000, 30000]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runAnalysis(code: string, language: string) {
  const { generateText, Output } = await import("ai")
  const { getAiModel } = await import("@/lib/ai")
  const { z } = await import("zod")

  const schema = z.object({
    algorithm: z
      .string()
      .describe(
        "Clear explanation of the algorithm using **bold** for key terms and `backticks` for data structure names"
      ),
    timeComplexity: z
      .string()
      .describe("Big O time complexity with brief reasoning"),
    spaceComplexity: z
      .string()
      .describe("Big O space complexity with brief reasoning"),
    hints: z
      .array(z.string())
      .describe(
        "Exactly 3 progressive hints guiding toward the solution. Each hint uses **bold** for key concepts and `backticks` for code terms. Do NOT reveal the full solution."
      ),
  })

  const { output } = await generateText({
    model: getAiModel(),
    output: Output.object({ schema }),
    prompt: `You are a LeetCode solution analyzer. Analyze the following ${language} code and fill the structured output fields.

Code:
\`\`\`${language}
${code}
\`\`\``,
  })

  const notesContent = `## Algorithm\n\n${output.algorithm}\n\n## Complexity\n\n- **Time Complexity:** ${output.timeComplexity}\n- **Space Complexity:** ${output.spaceComplexity}`
  const hintsContent = output.hints
    .slice(0, 3)
    .map((hint, i) => `### Hint ${i + 1}\n${hint}`)
    .join("\n\n")

  return { notesContent, hintsContent }
}

export async function processAnalysisJob(jobId: string): Promise<void> {
  const job = await prisma.analysisJob.findUnique({ where: { id: jobId } })
  if (!job) return
  if (job.status === "done") return

  await prisma.analysisJob.update({
    where: { id: jobId },
    data: { status: "running" },
  })

  let lastError: unknown = null

  for (let attempt = job.attempts; attempt < job.maxAttempts; attempt++) {
    try {
      const { notesContent, hintsContent } = await runAnalysis(
        job.code,
        job.language
      )

      const existing = await prisma.userQuestion.findUnique({
        where: {
          userId_questionId: { userId: job.userId, questionId: job.questionId },
        },
        select: { notes: true, hints: true },
      })

      const mergedNotes = existing?.notes
        ? `${existing.notes}\n\n---\n\n${notesContent}`
        : notesContent
      const mergedHints = existing?.hints
        ? `${existing.hints}\n\n${hintsContent}`
        : hintsContent

      await prisma.userQuestion.upsert({
        where: {
          userId_questionId: {
            userId: job.userId,
            questionId: job.questionId,
          },
        },
        update: { notes: mergedNotes, hints: mergedHints },
        create: {
          userId: job.userId,
          questionId: job.questionId,
          notes: mergedNotes,
          hints: mergedHints,
        },
      })

      await prisma.analysisJob.update({
        where: { id: jobId },
        data: {
          status: "done",
          attempts: attempt + 1,
          error: null,
        },
      })
      return
    } catch (err) {
      lastError = err
      console.error(`analyzeJob ${jobId} attempt ${attempt + 1} failed:`, err)

      const isLast = attempt + 1 >= job.maxAttempts
      await prisma.analysisJob.update({
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

  console.error(`analyzeJob ${jobId} exhausted retries:`, lastError)
}
