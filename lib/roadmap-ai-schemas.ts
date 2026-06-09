import { z } from "zod"

export const roadmapGoalTypeSchema = z.enum(["company", "topic", "mixed", "custom"])
export const roadmapIntensitySchema = z.enum(["relaxed", "balanced", "aggressive"])
export const roadmapFeasibilitySchema = z.enum(["realistic", "tight", "unrealistic"])
export const roadmapItemTypeSchema = z.enum([
  "new_question",
  "review",
  "catchup",
  "checkpoint",
])

export const aiRoadmapItemSchema = z.object({
  questionId: z.string().min(1).describe("Existing local Question.id to schedule."),
  itemType: z
    .preprocess(
      (value) => value === "new" ? "new_question" : value,
      roadmapItemTypeSchema
    )
    .describe("Why this item is scheduled."),
  reason: z
    .string()
    .min(8)
    .max(220)
    .describe("Short user-facing explanation for why this question belongs here."),
  order: z.number().int().min(0).describe("Display order within the day."),
})

export const aiRoadmapDaySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("ISO date for this study day, YYYY-MM-DD."),
  theme: z
    .string()
    .min(3)
    .max(80)
    .describe("Short theme for the day, e.g. Graph foundations."),
  items: z.array(aiRoadmapItemSchema).max(6),
})

export const aiRoadmapPlanSchema = z.object({
  name: z.string().min(3).max(80),
  summary: z.string().min(20).max(700),
  goalType: roadmapGoalTypeSchema,
  inferredCompanySlug: z.string().nullable(),
  inferredTopicSlug: z.string().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intensity: roadmapIntensitySchema,
  feasibility: z.object({
    status: roadmapFeasibilitySchema,
    message: z.string().min(8).max(300),
  }),
  days: z.array(aiRoadmapDaySchema).min(1).max(120),
})

export type AiRoadmapPlan = z.infer<typeof aiRoadmapPlanSchema>
export type AiRoadmapDay = z.infer<typeof aiRoadmapDaySchema>
export type AiRoadmapItem = z.infer<typeof aiRoadmapItemSchema>
export type RoadmapIntensity = z.infer<typeof roadmapIntensitySchema>
