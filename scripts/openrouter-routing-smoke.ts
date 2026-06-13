import "dotenv/config"

import { generateText } from "ai"
import { getAiModel, getAiModelName } from "../lib/ai"

const startedAt = new Date()

console.log("[openrouter-smoke] starting", startedAt.toISOString())
console.log("[openrouter-smoke] model", getAiModelName())
console.log("[openrouter-smoke] expected provider", "deepseek")

const result = await generateText({
  model: getAiModel(),
  system: "You are a terse routing smoke-test responder.",
  prompt: "Reply with exactly: deepseek-routing-ok",
  maxOutputTokens: 80,
})

console.log("[openrouter-smoke] text", result.text.trim())
console.log(
  "[openrouter-smoke] providerMetadata",
  JSON.stringify(result.providerMetadata ?? null, null, 2)
)
console.log("[openrouter-smoke] usage", JSON.stringify(result.usage, null, 2))
console.log("[openrouter-smoke] finished", new Date().toISOString())
