"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getRoadmaps,
  getRoadmapDetail,
  completeRoadmapItem,
  moveRoadmapItem,
  rebalanceRoadmap,
  updateRoadmapStatus,
} from "@/actions/roadmaps"
import { RoadmapCreateDialog } from "./roadmap-create-dialog"
import {
  Plus, Calendar, Target, ChevronRight, RotateCcw,
  Pause, Play, Archive, ExternalLink, Lock, Unlock,
} from "lucide-react"

const DIFF_COLORS: Record<string, string> = {
  EASY: "bg-green-500/20 text-green-400",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  HARD: "bg-red-500/20 text-red-400",
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-blue-500/20 text-blue-400",
}

interface Roadmap {
  id: string
  name: string
  status: string
  goalType: string
  companyName: string | null
  startDate: Date
  endDate: Date
  totalItems: number
  completedItems: number
  dailyQuestionTarget: number
}

interface RoadmapDetail {
  id: string
  name: string
  status: string
  goalType: string
  companyName: string | null
  topicSlug: string | null
  startDate: Date
  endDate: Date
  dailyQuestionTarget: number
  studyDays: number[]
  strategy: string
  items: {
    id: string
    plannedDate: Date
    sortOrder: number
    status: string
    sourceReason: string | null
    locked: boolean
    question: { id: string; title: string; leetcodeUrl: string; difficulty: string; topics: string[] }
  }[]
  events: { id: string; type: string; payload: unknown; createdAt: Date }[]
}

export function RoadmapView() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RoadmapDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [rebalancing, setRebalancing] = useState(false)

  const fetchRoadmaps = useCallback(async () => {
    setLoading(true)
    const result = await getRoadmaps()
    if (result.success) {
      setRoadmaps(result.data.roadmaps)
      if (!selectedId && result.data.roadmaps.length > 0) {
        setSelectedId(result.data.roadmaps[0].id)
      }
    }
    setLoading(false)
  }, [selectedId])

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    const result = await getRoadmapDetail(id)
    if (result.success) setDetail(result.data)
    setDetailLoading(false)
  }, [])

  useEffect(() => { fetchRoadmaps() }, [fetchRoadmaps])

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId)
  }, [selectedId, fetchDetail])

  const handleComplete = async (itemId: string) => {
    const result = await completeRoadmapItem(itemId)
    if (result.success && selectedId) {
      fetchDetail(selectedId)
      fetchRoadmaps()
    }
  }

  const handleRebalance = async () => {
    if (!selectedId) return
    setRebalancing(true)
    const result = await rebalanceRoadmap(selectedId)
    if (result.success && selectedId) {
      fetchDetail(selectedId)
    }
    setRebalancing(false)
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedId) return
    await updateRoadmapStatus(selectedId, status)
    fetchDetail(selectedId)
    fetchRoadmaps()
  }

  // Group items by date
  const dayGroups = detail
    ? Object.entries(
        detail.items.reduce((acc, item) => {
          const key = new Date(item.plannedDate).toISOString().split("T")[0]
          if (!acc[key]) acc[key] = []
          acc[key].push(item)
          return acc
        }, {} as Record<string, typeof detail.items>)
      ).sort(([a], [b]) => a.localeCompare(b))
    : []

  const selectedDayItems = selectedDay
    ? detail?.items.filter((i) => new Date(i.plannedDate).toISOString().split("T")[0] === selectedDay) ?? []
    : []

  const today = new Date().toISOString().split("T")[0]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roadmaps</h1>
          <p className="text-sm text-muted-foreground">Study plans with daily question assignments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Roadmap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        {/* Left: Roadmap list */}
        <div className="space-y-2">
          {roadmaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No roadmaps yet</p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create one
                </Button>
              </CardContent>
            </Card>
          ) : (
            roadmaps.map((r) => {
              const pct = r.totalItems > 0 ? Math.round((r.completedItems / r.totalItems) * 100) : 0
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setSelectedId(r.id); setSelectedDay(null) }}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    selectedId === r.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{r.name}</span>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{r.completedItems}/{r.totalItems} done</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(r.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    <span className="ml-auto">{r.dailyQuestionTarget}/day</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Center: Calendar timeline */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {detail ? detail.name : "Select a roadmap"}
              </CardTitle>
              {detail && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={handleRebalance} disabled={rebalancing}>
                    <RotateCcw className={`mr-1 h-3.5 w-3.5 ${rebalancing ? "animate-spin" : ""}`} /> Rebalance
                  </Button>
                  {detail.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange("paused")}>
                      <Pause className="mr-1 h-3.5 w-3.5" /> Pause
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange("active")}>
                      <Play className="mr-1 h-3.5 w-3.5" /> Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange("archived")}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {detailLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !detail ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Select a roadmap to view its timeline
              </div>
            ) : dayGroups.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No items in this roadmap
              </div>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {dayGroups.map(([date, items]) => {
                  const isToday = date === today
                  const isPast = date < today
                  const completedCount = items.filter((i) => i.status === "completed").length
                  const allDone = completedCount === items.length

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDay(date)}
                      className={`w-full text-left rounded-md px-3 py-2 transition-colors flex items-center gap-3 ${
                        selectedDay === date ? "bg-primary/10 border border-primary/30" :
                        isToday ? "bg-amber-500/10 border border-amber-500/20" :
                        "hover:bg-accent border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-sm font-bold">
                          {new Date(date + "T12:00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {items.map((item, idx) => (
                            <span
                              key={idx}
                              className={`inline-block h-2 w-2 rounded-full ${
                                item.status === "completed" ? "bg-green-400" :
                                item.status === "skipped" ? "bg-muted-foreground/30" :
                                isPast ? "bg-amber-400" :
                                "bg-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {completedCount}/{items.length} questions
                          {allDone && " ✓"}
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Inspector */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">
              {selectedDay
                ? new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {!selectedDay ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Click a day to see its questions
              </div>
            ) : selectedDayItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No questions for this day
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md border p-3 ${
                      item.status === "completed" ? "bg-green-500/5 border-green-500/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={item.status === "completed"}
                        onCheckedChange={() => handleComplete(item.id)}
                        disabled={item.status === "completed"}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${item.status === "completed" ? "line-through opacity-60" : ""}`}>
                            {item.question.title}
                          </span>
                          {item.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[10px] ${DIFF_COLORS[item.question.difficulty] ?? ""}`}>
                            {item.question.difficulty}
                          </Badge>
                          {item.sourceReason && (
                            <span className="text-[10px] text-muted-foreground">{item.sourceReason}</span>
                          )}
                        </div>
                        {item.question.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.question.topics.slice(0, 3).map((t) => (
                              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {t}
                              </span>
                            ))}
                            {item.question.topics.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{item.question.topics.length - 3}</span>
                            )}
                          </div>
                        )}
                        <a
                          href={item.question.leetcodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
                        >
                          Open on LeetCode <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RoadmapCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { fetchRoadmaps(); setCreateOpen(false) }}
      />
    </div>
  )
}
