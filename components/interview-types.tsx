import { Star } from "lucide-react"

export interface Question {
  id: string
  title: string
  leetcodeUrl: string
  difficulty: string
  topics: string[]
}

export interface Session {
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

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function difficultyColor(d: string) {
  switch (d) {
    case "EASY": return "border-green-500/30 text-green-500 bg-green-500/10"
    case "MEDIUM": return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
    case "HARD": return "border-red-500/30 text-red-500 bg-red-500/10"
    default: return ""
  }
}

export function StarRating({ value, onChange, readonly = false }: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}) {
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
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  )
}
