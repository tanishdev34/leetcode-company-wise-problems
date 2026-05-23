"use client"

import { useState, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { AiInterviewCoach } from "@/components/ai-interview-coach"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface SearchResult {
  id: string
  title: string
  difficulty: string
}

interface QuestionCodeInfo {
  code: string
  language: string
}

export function AiInterviewCoachWrapper() {
  const { data: session } = useSession()
  const [selectedQuestion, setSelectedQuestion] = useState<SearchResult | null>(null)
  const [questionCode, setQuestionCode] = useState<QuestionCodeInfo>({
    code: "",
    language: "cpp",
  })
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [review, setReview] = useState<{
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
  } | null>(null)

  const loadExistingReview = useCallback(async (questionId: string) => {
    try {
      const res = await fetch(`/api/solution-review?questionId=${questionId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.job?.status === "done" || data.job?.status === "error") {
        setReview(data.job)
      } else {
        setReview(null)
      }
    } catch {
      setReview(null)
    }
  }, [])

  const fetchQuestionCode = useCallback(async (questionId: string) => {
    try {
      const res = await fetch(`/api/question/code?questionId=${questionId}`)
      if (res.ok) {
        const data = await res.json()
        setQuestionCode({
          code: data.code || "",
          language: data.language || "cpp",
        })
      }
    } catch {
      setQuestionCode({ code: "", language: "cpp" })
    }
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults(data.questions || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSelectQuestion = useCallback(
    async (q: SearchResult) => {
      setSelectedQuestion(q)
      setQuestionCode({ code: "", language: "cpp" })
      setReview(null)
      setSearchResults([])
      setSearchQuery("")
      await Promise.all([fetchQuestionCode(q.id), loadExistingReview(q.id)])
    },
    [fetchQuestionCode, loadExistingReview]
  )

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Sign in to use the AI Interview Coach
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Question Selector */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Search for a question
        </label>
        <input
          type="text"
          placeholder="Search questions (min 2 characters)..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searching && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Searching...
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
            {searchResults.map((q) => (
              <button
                key={q.id}
                onClick={() => handleSelectQuestion(q)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <span className="flex-1 truncate">{q.title}</span>
                <span
                  className={`text-xs font-medium ${
                    q.difficulty === "EASY"
                      ? "text-green-500"
                      : q.difficulty === "MEDIUM"
                        ? "text-yellow-500"
                        : "text-red-500"
                  }`}
                >
                  {q.difficulty}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Question + Coach */}
      {selectedQuestion && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-1">
                {selectedQuestion.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {questionCode.code
                  ? "Code found — ready for review"
                  : "No saved code found. Save your solution code on the question page first."}
              </p>

              <AiInterviewCoach
                questionId={selectedQuestion.id}
                code={questionCode.code}
                language={questionCode.language}
                initialReview={review}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* No selection */}
      {!selectedQuestion && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              Search for a question above to review your solution
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
