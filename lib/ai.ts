import { openrouter as openrouterProvider } from "@openrouter/ai-sdk-provider"

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "z-ai/glm-4.5"

export function getAiModel() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required for AI features")
  }
  return openrouterProvider(OPENROUTER_MODEL)
}

export function getAiModelName() {
  return OPENROUTER_MODEL
}
