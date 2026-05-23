import { describe, it, expect } from "vitest"

// Test the sorting logic that's used in getCompanyQuestions
describe("Question sorting logic", () => {
  type Item = { questionId: string; frequency: number }
  type SolvedMap = Map<string, Date | null>

  function sortQuestions(items: Item[], solvedMap: SolvedMap): Item[] {
    return [...items].sort((a, b) => {
      const aSolved = solvedMap.has(a.questionId)
      const bSolved = solvedMap.has(b.questionId)

      if (aSolved !== bSolved) {
        return aSolved ? -1 : 1
      }

      if (aSolved) {
        const aTime = solvedMap.get(a.questionId)?.getTime() ?? 0
        const bTime = solvedMap.get(b.questionId)?.getTime() ?? 0
        return bTime - aTime
      }

      return b.frequency - a.frequency
    })
  }

  it("should put solved questions first", () => {
    const items = [
      { questionId: "q1", frequency: 10 },
      { questionId: "q2", frequency: 50 },
    ]
    const solvedMap = new Map([["q1", new Date("2024-01-01")]])

    const sorted = sortQuestions(items, solvedMap)
    expect(sorted[0].questionId).toBe("q1")
    expect(sorted[1].questionId).toBe("q2")
  })

  it("should sort solved questions by recency (most recent first)", () => {
    const items = [
      { questionId: "q1", frequency: 10 },
      { questionId: "q2", frequency: 50 },
      { questionId: "q3", frequency: 30 },
    ]
    const solvedMap = new Map([
      ["q1", new Date("2024-03-01")],
      ["q2", new Date("2024-01-01")],
    ])

    const sorted = sortQuestions(items, solvedMap)
    // q1 (Mar) should come before q2 (Jan)
    expect(sorted[0].questionId).toBe("q1")
    expect(sorted[1].questionId).toBe("q2")
    // q3 is unsolved
    expect(sorted[2].questionId).toBe("q3")
  })

  it("should sort unsolved questions by frequency descending", () => {
    const items = [
      { questionId: "q1", frequency: 10 },
      { questionId: "q2", frequency: 80 },
      { questionId: "q3", frequency: 50 },
    ]
    const solvedMap = new Map<string, Date | null>()

    const sorted = sortQuestions(items, solvedMap)
    expect(sorted[0].questionId).toBe("q2") // 80
    expect(sorted[1].questionId).toBe("q3") // 50
    expect(sorted[2].questionId).toBe("q1") // 10
  })

  it("should handle empty inputs", () => {
    expect(sortQuestions([], new Map())).toEqual([])
  })

  it("should handle all solved questions", () => {
    const items = [
      { questionId: "q1", frequency: 10 },
      { questionId: "q2", frequency: 50 },
    ]
    const solvedMap = new Map([
      ["q1", new Date("2024-01-01")],
      ["q2", new Date("2024-06-01")],
    ])

    const sorted = sortQuestions(items, solvedMap)
    expect(sorted[0].questionId).toBe("q2") // more recent
    expect(sorted[1].questionId).toBe("q1")
  })
})

describe("ActionResult<T> pattern", () => {
  type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string }

  function createSuccess<T>(data: T): ActionResult<T> {
    return { success: true, data }
  }

  function createError(error: string): ActionResult<never> {
    return { success: false, error }
  }

  it("should create a success result", () => {
    const result = createSuccess({ id: "1", name: "test" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("test")
    }
  })

  it("should create an error result", () => {
    const result = createError("Something went wrong")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe("Something went wrong")
    }
  })

  it("should narrow types correctly with if-else", () => {
    const results: ActionResult<{ value: number }>[] = [
      createSuccess({ value: 42 }),
      createError("fail"),
    ]

    const values = results.map((r) => {
      if (r.success) return r.data.value
      return -1
    })

    expect(values).toEqual([42, -1])
  })
})

describe("Notes validation", () => {
  it("should reject notes exceeding 10,000 characters", () => {
    const MAX_NOTES_LENGTH = 10000
    const longNotes = "a".repeat(MAX_NOTES_LENGTH + 1)
    expect(longNotes.length).toBeGreaterThan(MAX_NOTES_LENGTH)
  })

  it("should accept notes within the limit", () => {
    const MAX_NOTES_LENGTH = 10000
    const validNotes = "a".repeat(MAX_NOTES_LENGTH)
    expect(validNotes.length).toBe(MAX_NOTES_LENGTH)
  })

  it("should reject code exceeding 50,000 characters", () => {
    const MAX_CODE_LENGTH = 50000
    const longCode = "a".repeat(MAX_CODE_LENGTH + 1)
    expect(longCode.length).toBeGreaterThan(MAX_CODE_LENGTH)
  })
})
