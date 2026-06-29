import { openrouter } from "@openrouter/ai-sdk-provider"
import {
  extractJsonMiddleware,
  wrapLanguageModel,
  type LanguageModelMiddleware,
} from "ai"
import { prisma } from "@/lib/db"

const OPENROUTER_MODEL = "deepseek/deepseek-v4-pro"
const OPENROUTER_PROVIDER = "deepseek"

export const DAILY_AI_LIMIT = 4

// DeepSeek (via OpenRouter) only supports `response_format: { type: "json_object" }`,
// not strict `json_schema`. The OpenRouter provider emits `json_schema` whenever a
// schema is attached to the response format (see @openrouter/ai-sdk-provider getArgs),
// and DeepSeek rejects that with: "This response_format type is unavailable now".
//
// `Output.object()` always attaches the schema, so we intercept the request here:
// drop the schema (provider then sends `json_object`, which DeepSeek accepts) and move
// the schema into the prompt so the model still knows the exact shape. The downstream
// `extractJsonMiddleware` + `Output.object` parsing/validation are unchanged.
const deepseekJsonModeMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  transformParams: async ({ params }) => {
    const responseFormat = params.responseFormat
    if (responseFormat?.type !== "json" || responseFormat.schema == null) {
      return params
    }

    const instruction = `You must respond with a single valid JSON object that conforms to the following JSON schema. Output raw JSON only — no markdown code fences, no commentary.\n\nJSON schema:\n${JSON.stringify(responseFormat.schema)}`

    return {
      ...params,
      // Strip the schema -> OpenRouter sends `{ type: "json_object" }` instead of
      // `{ type: "json_schema", ... }`, which DeepSeek does not support.
      responseFormat: { type: "json" },
      prompt: [{ role: "system", content: instruction }, ...params.prompt],
    }
  },
}

export function getAiModel() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required for AI features")
  }
  return wrapLanguageModel({
    model: openrouter(OPENROUTER_MODEL, {
      provider: {
        only: [OPENROUTER_PROVIDER],
        allow_fallbacks: true,
      },
    }),
    middleware: [deepseekJsonModeMiddleware, extractJsonMiddleware()],
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
