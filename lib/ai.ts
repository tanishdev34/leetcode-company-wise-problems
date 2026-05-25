import { createAnthropic } from "@ai-sdk/anthropic"

export const crof = createAnthropic({
  baseURL: "https://anthropic.nahcrof.com/v1",
  apiKey: process.env.CROF_API_KEY,
})
