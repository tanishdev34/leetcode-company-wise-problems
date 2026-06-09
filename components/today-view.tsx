"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SyncSolvedButton } from "@/components/sync-solved-button"
import {
  Map, Brain, Clock, CheckCircle2, ChevronRight,
  ArrowRight, Calendar, Flame,
} from "lucide-react"

const DIFF_COLORS: Record<string, string> = {
  EASY: "bg-green-500/20 text-green-400",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  HARD: "bg-red-500/20 text-red-400",
}

interface TodayViewProps {
  username: string | null
  activeRoadmaps: {
    id: string
    name: string
    companyName: string | null
    totalItems: number
    completedItems: number
    endDate: Date
  }[]
  dueReviews: number
  recentSolved: {
    id: string
    title: string
    leetcodeUrl: string
    difficulty: string
    solvedAt: Date | null
  }[]
}

export function TodayView({ username, activeRoadmaps, dueReviews, recentSolved }: TodayViewProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <SyncSolvedButton username={username} />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <Map className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{activeRoadmaps.length}</p>
              <p className="text-[10px] text-muted-foreground">Active roadmaps</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <Brain className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-lg font-bold">{dueReviews}</p>
              <p className="text-[10px] text-muted-foreground">Due reviews</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-lg font-bold">{recentSolved.length}</p>
              <p className="text-[10px] text-muted-foreground">Recent solved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2.5">
            <Flame className="h-5 w-5 text-orange-400" />
            <div>
              <p className="text-lg font-bold">{username ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground">LeetCode</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active roadmaps */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Active Roadmaps</CardTitle>
            <Link href="/roadmaps">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {activeRoadmaps.length === 0 ? (
            <div className="py-6 text-center">
              <Map className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No active roadmaps</p>
              <Link href="/roadmaps">
                <Button size="sm">Create one</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRoadmaps.map((r) => {
                const pct = r.totalItems > 0 ? Math.round((r.completedItems / r.totalItems) * 100) : 0
                const daysLeft = Math.max(0, Math.ceil((new Date(r.endDate).getTime() - Date.now()) / 86400000))
                return (
                  <Link
                    key={r.id}
                    href="/roadmaps"
                    className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{r.name}</span>
                        {r.companyName && (
                          <Badge variant="outline" className="text-[10px]">{r.companyName}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="inline h-3 w-3 mr-0.5" />
                        {daysLeft}d left
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Due reviews */}
      {dueReviews > 0 && (
        <Card className="border-amber-500/20">
          <CardContent className="py-4 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-amber-400" />
              <div>
                <p className="text-sm font-medium">{dueReviews} review{dueReviews !== 1 ? "s" : ""} due</p>
                <p className="text-xs text-muted-foreground">Reinforce what you&apos;ve learned</p>
              </div>
            </div>
            <Link href="/reviews">
              <Button size="sm" variant="outline">
                Review now <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent solved */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Recently Solved</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {recentSolved.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No questions solved yet. Start solving!
            </p>
          ) : (
            <div className="space-y-1">
              {recentSolved.map((q, i) => (
                <Link
                  key={i}
                  href={`/questions/${q.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-accent transition-colors group"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className="text-sm truncate flex-1">{q.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${DIFF_COLORS[q.difficulty] ?? ""}`}>
                    {q.difficulty}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
