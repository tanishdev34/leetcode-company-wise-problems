import { describe, it, expect } from "vitest"

describe("Review interval logic", () => {
  const INTERVALS: Record<number, number> = {
    1: 1, // forgot
    2: 2, // struggled
    3: 4, // moderate
    4: 7, // good
    5: 14, // mastered
  }

  function getNextReviewDate(confidence: number): Date {
    const interval = INTERVALS[confidence] ?? 4
    const next = new Date()
    next.setDate(next.getDate() + interval)
    return next
  }

  it("should schedule 1 day for forgot (confidence=1)", () => {
    const now = new Date()
    const next = getNextReviewDate(1)
    const diffMs = next.getTime() - now.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(1)
  })

  it("should schedule 14 days for mastered (confidence=5)", () => {
    const now = new Date()
    const next = getNextReviewDate(5)
    const diffMs = next.getTime() - now.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(14)
  })

  it("should default to 4 days for unknown confidence", () => {
    const now = new Date()
    const next = getNextReviewDate(99)
    const diffMs = next.getTime() - now.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(4)
  })

  it("should return correct intervals for all confidence levels", () => {
    const expected = [
      { confidence: 1, days: 1 },
      { confidence: 2, days: 2 },
      { confidence: 3, days: 4 },
      { confidence: 4, days: 7 },
      { confidence: 5, days: 14 },
    ]
    for (const { confidence, days } of expected) {
      const now = new Date()
      const next = getNextReviewDate(confidence)
      const diffMs = next.getTime() - now.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(days)
    }
  })
})
