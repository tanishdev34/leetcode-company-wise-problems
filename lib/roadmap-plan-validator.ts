import type { AiRoadmapPlan, RoadmapIntensity } from "@/lib/roadmap-ai-schemas"

const INTENSITY_LIMITS: Record<RoadmapIntensity, number> = {
  relaxed: 2,
  balanced: 4,
  aggressive: 6,
}

export function validateAiRoadmapPlan(
  plan: AiRoadmapPlan,
  context: {
    intensity: RoadmapIntensity
    candidateById: Map<string, { solved: boolean }>
  }
): { valid: true; plan: AiRoadmapPlan; warnings: string[] } | { valid: false; error: string } {
  const warnings: string[] = []
  const seenNewQuestions = new Set<string>()
  const maxPerDay = INTENSITY_LIMITS[context.intensity]

  const cleanedDays = plan.days
    .map((day) => {
      const cleanItems = day.items
        .filter((item) => {
          const candidate = context.candidateById.get(item.questionId)
          if (!candidate) {
            warnings.push(`Dropped unknown question ${item.questionId}`)
            return false
          }

          if (candidate.solved && item.itemType !== "review") {
            warnings.push(`Dropped solved question ${item.questionId}`)
            return false
          }

          if (item.itemType === "new_question") {
            if (seenNewQuestions.has(item.questionId)) {
              warnings.push(`Dropped duplicate question ${item.questionId}`)
              return false
            }
            seenNewQuestions.add(item.questionId)
          }

          return true
        })
        .sort((a, b) => a.order - b.order)
        .slice(0, maxPerDay)
        .map((item, order) => ({ ...item, order }))

      if (day.items.length > cleanItems.length && cleanItems.length === maxPerDay) {
        warnings.push(`Capped ${day.date} to ${maxPerDay} items`)
      }

      return { ...day, items: cleanItems }
    })
    .filter((day) => day.items.length > 0)

  if (cleanedDays.length === 0) {
    return { valid: false, error: "AI roadmap did not contain any usable question assignments" }
  }

  return {
    valid: true,
    plan: { ...plan, days: cleanedDays },
    warnings,
  }
}
