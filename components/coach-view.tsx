"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getDueReviews, scheduleReview } from "@/actions/review"
import {
  Brain, CheckCircle2, ExternalLink, RotateCcw,
  ArrowRight, Loader2,
} from "lucide-react"
import Link from "next/link"

const DIFF_COLORS: Record<string, string> = {
  EASY: "bg-green-500/20 text-green-400",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  HARD: "bg-red-500/20 text-red-400",
}

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Forgot",
  2: "Struggled",
  3: "Moderate",
  4: "Good",
  5: "Mastered",
}

export function CoachView() {
  const [dueItems, setDueItems] = useState<{
    id: string
    questionId: string
    questionTitle: string
    leetcodeUrl: string
    difficulty: string
    confidence: number
    reviewCount: number
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const fetchDue = useCallback(async () => {
    setLoading(true)
    const result = await getDueReviews()
    if (result.success) setDueItems(result.data.items)
    setLoading(false)
  }, [])

  useEffect(() => { fetchDue() }, [fetchDue])

  const handleReview = async (confidence: number) => {
    if (currentIndex >= dueItems.length) return
    const item = dueItems[currentIndex]
    setSubmitting(true)
    const result = await scheduleReview(item.questionId, confidence)
    if (result.success) setCurrentIndex((prev) => prev + 1)
    setSubmitting(false)
  }

  const currentItem = dueItems[currentIndex]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coach</h1>
        <p className="text-sm text-muted-foreground">Review, reflect, and improve</p>
      </div>

      {/* Review section */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-amber-400" />
              Spaced Repetition Reviews
            </CardTitle>
            <Link href="/reviews">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Full view <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : dueItems.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No reviews due.</p>
            </div>
          ) : currentIndex >= dueItems.length ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-2" />
              <p className="text-sm font-medium mb-1">Session complete!</p>
              <p className="text-xs text-muted-foreground mb-3">
                Reviewed {dueItems.length} question{dueItems.length !== 1 ? "s" : ""}
              </p>
              <Button size="sm" onClick={() => { setCurrentIndex(0); fetchDue() }}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Start fresh
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{currentIndex + 1}/{dueItems.length}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${((currentIndex) / dueItems.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{currentItem.questionTitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${DIFF_COLORS[currentItem.difficulty] ?? ""}`}>
                        {currentItem.difficulty}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Review #{currentItem.reviewCount + 1}
                      </span>
                    </div>
                  </div>
                  <a href={currentItem.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mb-2">How well did you remember this?</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleReview(level)}
                      className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors text-center ${
                        level <= 2 ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" :
                        level === 3 ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" :
                        "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {CONFIDENCE_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links to other coach surfaces */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/interview">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="py-4 px-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Mock Interview</p>
                <p className="text-xs text-muted-foreground">Practice timed sessions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/memory">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="py-4 px-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-purple-500/10 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Mistake Patterns</p>
                <p className="text-xs text-muted-foreground">See recurring mistakes</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
