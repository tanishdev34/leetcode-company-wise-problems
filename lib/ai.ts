import { openrouter } from "@openrouter/ai-sdk-provider"
import { extractJsonMiddleware, wrapLanguageModel } from "ai"
import { prisma } from "@/lib/db"

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash"
const OPENROUTER_PROVIDER = "deepseek"

export const DAILY_AI_LIMIT = 4

export function getAiModel() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required for AI features")
  }
  if (!OPENROUTER_MODEL.startsWith(`${OPENROUTER_PROVIDER}/`)) {
    throw new Error(
      "OPENROUTER_MODEL must use a deepseek/* model because OpenRouter routing is pinned to DeepSeek"
    )
  }
  return wrapLanguageModel({
    model: openrouter(OPENROUTER_MODEL, {
      provider: {
        only: [OPENROUTER_PROVIDER],
        allow_fallbacks: false,
      },
    }),
    middleware: extractJsonMiddleware(),
  })
}

export function getAiModelName() {
  return OPENROUTER_MODEL
}

export async function checkAiRateLimit(
  userId: string,
  role: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (role === "admin") {
    return { allowed: true, remaining: -1 }
  }

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const count = await prisma.aiUsage.count({
    where: { userId, createdAt: { gte: startOfDay } },
  })

  const remaining = Math.max(0, DAILY_AI_LIMIT - count)
  return { allowed: count < DAILY_AI_LIMIT, remaining }
}

export async function recordAiUsage(
  userId: string,
  feature: string
): Promise<void> {
  await prisma.aiUsage.create({ data: { userId, feature } })
}
