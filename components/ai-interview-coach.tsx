"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight, Lightbulb, Clock, Cpu } from "lucide-react"

interface SolutionReview {
  id: string
  status: string
  correctness: string | null
  timeComplexity: string | null
  spaceComplexity: string | null
  edgeCases: string | null
  explanation: string | null
  followUps: string | null
  suggestions: string | null
  error: string | null
  code: string
  language: string
}

interface AiInterviewCoachProps {
  questionId: string
  code: string
  language: string
  initialReview?: SolutionReview | null
}

function getCorrectnessBadge(correctness: string | null) {
  switch (correctness) {
    case "correct":
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-sm px-3 py-1">
          <CheckCircle className="h-4 w-4 mr-1" />
          Correct
        </Badge>
      )
    case "partially_correct":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-sm px-3 py-1">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Partially Correct
        </Badge>
      )
    case "incorrect":
      return (
        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-sm px-3 py-1">
          <XCircle className="h-4 w-4 mr-1" />
          Incorrect
        </Badge>
      )
    default:
      return null
  }
}

export function AiInterviewCoach({
  questionId,
  code,
  language,
  initialReview,
}: AiInterviewCoachProps) {
  const [review, setReview] = useState<SolutionReview | null>(initialReview ?? null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [followUpsOpen, setFollowUpsOpen] = useState(false)
  const [expandedEdgeCase, setExpandedEdgeCase] = useState<number | null>(null)

  const pollForResults = useCallback(async (jobId: string) => {
    setPolling(true)
    const maxAttempts = 60 // 2 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      try {
        const res = await fetch(`/api/solution-review?jobId=${jobId}`)
        if (!res.ok) continue
        const data = await res.json()
        if (data.job?.status === "done" || data.job?.status === "error") {
          setReview(data.job)
          setPolling(false)
          return
        }
      } catch {
        // continue polling
      }
    }
    setPolling(false)
  }, [])

  const handleReview = useCallback(async () => {
    if (!code.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/solution-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, code, language }),
      })
      const data = await res.json()
      if (data.jobId) {
        setReview((prev) =>
          prev
            ? { ...prev, status: "pending" }
            : {
                id: data.jobId,
                status: "pending",
                correctness: null,
                timeComplexity: null,
                spaceComplexity: null,
                edgeCases: null,
                explanation: null,
                followUps: null,
                suggestions: null,
                error: null,
                code,
                language,
              }
        )
        pollForResults(data.jobId)
      }
    } catch (err) {
      console.error("Failed to enqueue review:", err)
    } finally {
      setLoading(false)
    }
  }, [questionId, code, language, pollForResults])

  // Parse JSON fields
  const edgeCasesList: string[] = (() => {
    try {
      return review?.edgeCases ? JSON.parse(review.edgeCases) : []
    } catch {
      return []
    }
  })()

  const followUpsList: string[] = (() => {
    try {
      return review?.followUps ? JSON.parse(review.followUps) : []
    } catch {
      return []
    }
  })()

  const isRunning = review?.status === "pending" || review?.status === "running" || polling

  return (
    <div className="space-y-4">
      {/* Review Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleReview}
          disabled={!code.trim() || loading || isRunning}
          size="lg"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reviewing...
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4" />
              Review My Solution
            </>
          )}
        </Button>
        {!code.trim() && (
          <p className="text-sm text-muted-foreground">
            Save your code first to get a review
          </p>
        )}
      </div>

      {/* Loading state */}
      {isRunning && !review?.correctness && (
        <Card className="border-primary/20">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Analyzing your solution...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {review?.status === "error" && (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Review Failed
            </CardTitle>
            <CardDescription>
              {review.error || "An unexpected error occurred. Please try again."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Results */}
      {review?.status === "done" && review.correctness && (
        <div className="space-y-4">
          {/* Correctness Badge */}
          <div className="flex items-center gap-3">
            {getCorrectnessBadge(review.correctness)}
          </div>

          {/* Complexity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Complexity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Time Complexity</h4>
                <p className="text-sm">{review.timeComplexity}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Space Complexity</h4>
                <p className="text-sm">{review.spaceComplexity}</p>
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          {review.explanation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Explanation & Code Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{review.explanation}</p>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {review.suggestions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-500" />
                  Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{review.suggestions}</p>
              </CardContent>
            </Card>
          )}

          {/* Edge Cases */}
          {edgeCasesList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Edge Cases</CardTitle>
                <CardDescription>
                  Edge cases your solution handles or might miss
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {edgeCasesList.map((edge, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() =>
                        setExpandedEdgeCase(expandedEdgeCase === i ? null : i)
                      }
                    >
                      {edge.length > 40 ? `${edge.slice(0, 40)}...` : edge}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Questions */}
          {followUpsList.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setFollowUpsOpen(!followUpsOpen)}
              >
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Follow-up Questions
                  </span>
                  {followUpsOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  Questions an interviewer might ask next
                </CardDescription>
              </CardHeader>
              {followUpsOpen && (
                <CardContent>
                  <ul className="space-y-3">
                    {followUpsList.map((q, i) => (
                      <li
                        key={i}
                        className="rounded-lg border bg-muted/30 p-3 text-sm"
                      >
                        <span className="font-medium text-primary mr-2">Q{i + 1}:</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
