"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  startInterview,
  completeInterview,
  cancelInterview,
  getInterviewHistory,
  getRandomQuestion,
} from "@/actions/interview"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { MultiplayerRoom } from "./multiplayer-room"
import {
  Loader2, ExternalLink, Clock, Play, ChevronRight, Star, CheckCircle, XCircle, AlertTriangle,
  Users, User, Copy, ArrowLeft, LogIn,
} from "lucide-react"

type InterviewPhase = "setup" | "interview" | "rating" | "recap"

interface Question {
  id: string
  title: string
  leetcodeUrl: string
  difficulty: string
  topics: string[]
}

interface Session {
  id: string
  questionId: string
  questionTitle: string
  leetcodeUrl: string
  difficulty: string
  status: string
  startedAt: Date
  endedAt: Date | null
  duration: number | null
  rating: number | null
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`h-8 w-8 transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            className={`h-full w-full ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function InterviewRoom() {
  const router = useRouter()
  const [phase, setPhase] = useState<InterviewPhase>("setup")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mode selection
  const [mode, setMode] = useState<"solo" | "multiplayer" | "">("")

  // Multiplayer state
  const [mpPhase, setMpPhase] = useState<"lobby" | "create" | "join" | "room">("lobby")
  const [roomCode, setRoomCode] = useState("")
  const [roomQuestion, setRoomQuestion] = useState<Question | null>(null)
  const [roomDuration, setRoomDuration] = useState(45)
  const [roomStartedAt, setRoomStartedAt] = useState<Date | null>(null)

  // Setup state
  const [difficulty, setDifficulty] = useState<string>("")
  const [durationMinutes, setDurationMinutes] = useState(45)

  // Interview state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [notes, setNotes] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Completion state
  const [rating, setRating] = useState(0)
  const [reflection, setReflection] = useState("")
  const [completedSession, setCompletedSession] = useState<Session | null>(null)

  // History state
  const [history, setHistory] = useState<Session[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Load history on mount
  useEffect(() => {
    async function load() {
      setHistoryLoading(true)
      const result = await getInterviewHistory()
      if (result.success) {
        setHistory(result.data.sessions as unknown as Session[])
      }
      setHistoryLoading(false)
    }
    load()
  }, [])

  // Timer logic
  useEffect(() => {
    if (phase !== "interview" || timeRemaining <= 0) return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, timeRemaining])

  // Auto-end when timer hits 0
  useEffect(() => {
    if (phase === "interview" && timeRemaining === 0 && sessionId) {
      handleCompleteInterview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining])

  // ─── Multiplayer handlers ─────────────────────────
  const handleCreateRoom = useCallback(async () => {
    setLoading(true)
    setError(null)

    const questionResult = await getRandomQuestion(difficulty || undefined)
    if (!questionResult.success) {
      setError(questionResult.error)
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/interview/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: questionResult.data.id, durationMinutes }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Failed to create room")
        setLoading(false)
        return
      }
      const data = await res.json()
      setRoomCode(data.data.roomCode)
      setRoomQuestion({ ...questionResult.data, topics: questionResult.data.topics || [] })
      setRoomDuration(durationMinutes)
      setRoomStartedAt(new Date(data.data.startedAt || Date.now()))
      setMpPhase("room")
    } catch {
      setError("Failed to create room")
    }
    setLoading(false)
  }, [difficulty, durationMinutes])

  const handleJoinRoom = useCallback(async () => {
    const code = roomCode.trim().toUpperCase()
    if (code.length < 4) {
      setError("Please enter a valid room code")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/interview/room?code=${encodeURIComponent(code)}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Room not found")
        setLoading(false)
        return
      }
      const data = await res.json()
      setRoomCode(code)
      setRoomQuestion({
        id: data.data.question.id,
        title: data.data.question.title,
        leetcodeUrl: data.data.question.leetcodeUrl,
        difficulty: data.data.question.difficulty,
        topics: data.data.question.topics || [],
      })
      setRoomDuration(data.data.duration ? Math.floor(data.data.duration / 60) : 45)
      setRoomStartedAt(new Date(data.data.startedAt))
      setMpPhase("room")
    } catch {
      setError("Failed to join room")
    }
    setLoading(false)
  }, [roomCode])

  const handleLeaveRoom = useCallback(() => {
    setMpPhase("lobby")
    setRoomCode("")
    setRoomQuestion(null)
    setRoomStartedAt(null)
    setError(null)
  }, [])

  const handleSelectMode = useCallback((selectedMode: "solo" | "multiplayer") => {
    setMode(selectedMode)
    setError(null)
  }, [])

  const handleBackToModeSelection = useCallback(() => {
    setMode("")
    setMpPhase("lobby")
    setRoomCode("")
    setRoomQuestion(null)
    setRoomStartedAt(null)
    setError(null)
  }, [])

  // ─── Solo handlers ────────────────────────────────
  const handleStartInterview = useCallback(async () => {
    setLoading(true)
    setError(null)

    const questionResult = await getRandomQuestion(difficulty || undefined)
    if (!questionResult.success) {
      setError(questionResult.error)
      setLoading(false)
      return
    }

    const q = questionResult.data
    setQuestion(q)

    const result = await startInterview(q.id, durationMinutes)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSessionId(result.data.id)
    setTimeRemaining(durationMinutes * 60)
    setNotes("")
    setPhase("interview")
    setLoading(false)
  }, [difficulty, durationMinutes])

  const handleCompleteInterview = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (sessionId) {
      await completeInterview(sessionId, {
        notes: notes || undefined,
      })
    }

    setPhase("rating")
  }, [sessionId, notes])

  const handleCancelInterview = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (sessionId) {
      await cancelInterview(sessionId)
    }

    setPhase("setup")
    setQuestion(null)
    setSessionId(null)
    setNotes("")
    setRating(0)
    setReflection("")

    // Refresh history
    const result = await getInterviewHistory()
    if (result.success) {
      setHistory(result.data.sessions as unknown as Session[])
    }
  }, [sessionId])

  const handleSubmitRating = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)

    await completeInterview(sessionId, {
      rating: rating || undefined,
      notes: notes || undefined,
      reflection: reflection || undefined,
    })

    setPhase("recap")

    // Build recap from current state
    setCompletedSession({
      id: sessionId,
      questionId: question?.id ?? "",
      questionTitle: question?.title ?? "",
      leetcodeUrl: question?.leetcodeUrl ?? "",
      difficulty: question?.difficulty ?? "",
      status: "completed",
      startedAt: new Date(),
      endedAt: new Date(),
      duration: timeRemaining !== null ? durationMinutes * 60 - timeRemaining : null,
      rating: rating || null,
    } as unknown as Session)

    setLoading(false)

    // Refresh history
    const result = await getInterviewHistory()
    if (result.success) {
      setHistory(result.data.sessions as unknown as Session[])
    }
  }, [sessionId, rating, notes, reflection, question, timeRemaining, durationMinutes])

  const handleStartNew = useCallback(() => {
    setPhase("setup")
    setMode("")
    setQuestion(null)
    setSessionId(null)
    setNotes("")
    setRating(0)
    setReflection("")
    setCompletedSession(null)
    setError(null)
    setMpPhase("lobby")
    setRoomCode("")
    setRoomQuestion(null)
    setRoomStartedAt(null)
  }, [])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const timerProgress = durationMinutes * 60 > 0
    ? ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100
    : 0

  const isUrgent = timeRemaining < 300 && timeRemaining > 0 // Less than 5 minutes

  const difficultyColor = (d: string) => {
    switch (d) {
      case "EASY": return "border-green-500/30 text-green-500 bg-green-500/10"
      case "MEDIUM": return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
      case "HARD": return "border-red-500/30 text-red-500 bg-red-500/10"
      default: return ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mode Selection */}
      {!mode && (
        <>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Mock Interview Room</CardTitle>
              <CardDescription>
                Choose how you want to practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSelectMode("solo")}
                  className="group flex flex-col items-center gap-3 rounded-xl border-2 border-border p-8 transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Solo Practice</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Practice alone with a timer and random question. Self-rate and track your progress.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode("multiplayer")}
                  className="group flex flex-col items-center gap-3 rounded-xl border-2 border-border p-8 transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Multiplayer Room</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Practice with friends. Create a room or join one with a code. Real-time chat & notes.
                    </p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{s.questionTitle}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge variant="outline" className={difficultyColor(s.difficulty)}>{s.difficulty}</Badge>
                          <Badge variant="outline" className={
                            s.status === "completed"
                              ? "border-green-500/30 text-green-500"
                              : s.status === "cancelled"
                                ? "border-muted-foreground/30 text-muted-foreground"
                                : "border-blue-500/30 text-blue-500"
                          }>
                            {s.status === "completed" ? <><CheckCircle className="mr-1 h-3 w-3" /> Completed</>
                              : s.status === "cancelled" ? <><XCircle className="mr-1 h-3 w-3" /> Cancelled</>
                              : <><Clock className="mr-1 h-3 w-3" /> In Progress</>}
                          </Badge>
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-muted-foreground">{formatDate(s.startedAt)}</p>
                      </div>
                      {s.rating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{s.rating}/5</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Solo Setup Phase */}
      {mode === "solo" && phase === "setup" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={handleBackToModeSelection}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <h2 className="text-lg font-semibold">Solo Practice</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Configure Your Session
              </CardTitle>
              <CardDescription>
                Practice with a timed, randomly-selected LeetCode question.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Random" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Leave empty for completely random</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleStartInterview} disabled={loading} className="w-full">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Start Interview</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}

      {/* Multiplayer Lobby */}
      {mode === "multiplayer" && mpPhase === "lobby" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={handleBackToModeSelection}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <h2 className="text-lg font-semibold">Multiplayer</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Create a Room
                </CardTitle>
                <CardDescription>
                  Set up a room and share the code with friends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Random" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleCreateRoom} disabled={loading} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    : <><Users className="mr-2 h-4 w-4" /> Create Room</>}
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-primary" />
                  Join a Room
                </CardTitle>
                <CardDescription>
                  Enter a room code shared by a friend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Code</label>
                  <Input
                    placeholder="Enter 6-character code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="font-mono text-lg tracking-widest text-center"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleJoinRoom} disabled={loading || roomCode.length < 4} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
                    : <><LogIn className="mr-2 h-4 w-4" /> Join Room</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}

      {/* Multiplayer Room */}
      {mode === "multiplayer" && mpPhase === "room" && roomQuestion && roomStartedAt && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Leave Room
            </Button>
          </div>
          <MultiplayerRoom
            roomCode={roomCode}
            question={roomQuestion}
            duration={roomDuration * 60}
            startedAt={roomStartedAt}
            onLeave={handleLeaveRoom}
          />
        </div>
      )}

      {/* Solo Interview Phase */}
      {mode === "solo" && phase === "interview" && question && (
        <div className="space-y-4">
          {/* Timer */}
          <Card className={`transition-colors ${isUrgent ? "border-red-500/50 bg-red-500/5" : ""}`}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Clock className={`h-5 w-5 ${isUrgent ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-2xl font-mono font-bold tabular-nums ${isUrgent ? "text-red-500" : ""}`}>
                    {formatTime(timeRemaining)}
                  </p>
                  <p className="text-xs text-muted-foreground">Time Remaining</p>
                </div>
              </div>
              <div className={`w-32 sm:w-48 ${isUrgent ? "rounded-md bg-red-500/20 p-0.5" : ""}`}>
                <Progress
                  value={timerProgress}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Question */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xl">{question.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className={difficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                    {question.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
                <a
                  href={question.leetcodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open on LeetCode
                  </Button>
                </a>
              </div>
            </CardHeader>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Notes / Scratch Work</CardTitle>
              <CardDescription className="text-xs">
                Write your thoughts, approach, and code sketch here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your approach, edge cases, or any notes..."
                className="min-h-[200px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCompleteInterview} className="flex-1">
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Interview
            </Button>
            <Button variant="outline" onClick={handleCancelInterview}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Solo Rating Phase */}
      {mode === "solo" && phase === "rating" && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">How did it go?</CardTitle>
            <CardDescription>
              Rate your performance and reflect on the interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium">Self Rating</p>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reflection</label>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What went well? What could you improve? How was the difficulty?"
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button onClick={handleSubmitRating} disabled={loading} className="flex-1">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Save & View Recap"
              )}
            </Button>
            <Button variant="outline" onClick={handleCancelInterview}>
              Skip
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Solo Recap Phase */}
      {mode === "solo" && phase === "recap" && completedSession && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Interview Complete!</CardTitle>
              <CardDescription>
                Here&apos;s your session recap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{completedSession.questionTitle}</p>
                  <p className="text-xs text-muted-foreground">Question</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {formatDuration(completedSession.duration)}
                  </p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="flex justify-center">
                    {completedSession.rating ? (
                      <StarRating value={completedSession.rating} readonly />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">—</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>

              {question && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{question.title}</p>
                      <Badge variant="outline" className={`mt-1 ${difficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </Badge>
                    </div>
                    <a
                      href={question.leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        View on LeetCode
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {reflection && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-sm font-medium">Reflection</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reflection}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleStartNew} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Start Another Interview
              </Button>
            </CardFooter>
          </Card>

          {/* Recent history preview */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.questionTitle}</p>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="outline" className={difficultyColor(s.difficulty)}>
                            {s.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(s.startedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.rating && (
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{s.rating}/5</span>
                          </div>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
