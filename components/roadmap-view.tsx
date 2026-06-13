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
  updateRoadmapItemStatus,
  rebalanceRoadmap,
  updateRoadmapStatus,
  deleteRoadmap,
} from "@/actions/roadmaps"
import { RoadmapCreateDialog } from "./roadmap-create-dialog"
import {
  Plus, Calendar, Target, ChevronRight, RotateCcw,
  Pause, Play, Archive, ExternalLink, Lock, Trash2, Sparkles,
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

const FEASIBILITY_COLORS: Record<string, string> = {
  realistic: "bg-green-500/20 text-green-400",
  tight: "bg-amber-500/20 text-amber-400",
  unrealistic: "bg-red-500/20 text-red-400",
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  new_question: "New",
  review: "Review",
  catchup: "Catch-up",
  checkpoint: "Checkpoint",
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
  intensity: string
  feasibility: string
  generationStatus: string
  generationError: string | null
  aiSummary: string | null
  prompt: string | null
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
  prompt: string | null
  intensity: string
  aiSummary: string | null
  feasibility: string
  feasibilityNote: string | null
  generationStatus: string
  generationError: string | null
  items: {
    id: string
    plannedDate: Date
    sortOrder: number
    status: string
    sourceReason: string | null
    locked: boolean
    itemType: string
    aiReason: string | null
    dayTheme: string | null
    question: { id: string; title: string; leetcodeUrl: string; difficulty: string; topics: string[] }
  }[]
  events: { id: string; type: string; payload: unknown; createdAt: Date }[]
}

type RoadmapDetailItem = RoadmapDetail["items"][number]

export function RoadmapView() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RoadmapDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [rebalancing, setRebalancing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [designVerbIndex, setDesignVerbIndex] = useState(0)
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  const [completingItemIds, setCompletingItemIds] = useState<Set<string>>(new Set())

  const fetchRoadmaps = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const result = await getRoadmaps()
    if (result.success) {
      setRoadmaps(result.data.roadmaps)
      if (!selectedId && result.data.roadmaps.length > 0) {
        setSelectedId(result.data.roadmaps[0].id)
      }
    }
    if (showLoading) setLoading(false)
  }, [selectedId])

  const fetchDetail = useCallback(async (id: string, showLoading = true) => {
    if (showLoading) setDetailLoading(true)
    const result = await getRoadmapDetail(id)
    if (result.success) {
      setDetail(result.data)
      if (!["pending", "running"].includes(result.data.generationStatus)) {
        setNewlyCreatedId((current) => current === id ? null : current)
      }
    }
    if (showLoading) setDetailLoading(false)
  }, [])

  useEffect(() => { fetchRoadmaps() }, [fetchRoadmaps])

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId, selectedId !== newlyCreatedId)
  }, [selectedId, fetchDetail, newlyCreatedId])

  const hasGeneratingRoadmap = roadmaps.some((roadmap) =>
    ["pending", "running"].includes(roadmap.generationStatus)
  )
  const isNewRoadmapDesigning = Boolean(newlyCreatedId && selectedId === newlyCreatedId)

  useEffect(() => {
    if (!hasGeneratingRoadmap) return

    const refreshInterval = window.setInterval(() => {
      fetchRoadmaps(false)
      if (selectedId) fetchDetail(selectedId, false)
    }, 2500)
    const verbInterval = window.setInterval(() => {
      setDesignVerbIndex((index) => (index + 1) % DESIGNING_VERBS.length)
    }, 1800)

    return () => {
      window.clearInterval(refreshInterval)
      window.clearInterval(verbInterval)
    }
  }, [fetchDetail, fetchRoadmaps, hasGeneratingRoadmap, selectedId])

  const handleComplete = async (itemId: string, completed: boolean) => {
    if (!selectedId || completingItemIds.has(itemId)) return

    const previousDetail = detail
    const previousRoadmaps = roadmaps
    const item = detail?.items.find((roadmapItem) => roadmapItem.id === itemId)
    if (!item || (item.status === "completed") === completed) return

    setCompletingItemIds((ids) => new Set(ids).add(itemId))
    setDetail((current) => current
      ? {
          ...current,
          items: current.items.map((roadmapItem) =>
            roadmapItem.id === itemId
              ? { ...roadmapItem, status: completed ? "completed" : "planned" }
              : roadmapItem
          ),
        }
      : current
    )
    setRoadmaps((current) => current.map((roadmap) =>
      roadmap.id === selectedId
        ? {
            ...roadmap,
            completedItems: completed
              ? Math.min(roadmap.totalItems, roadmap.completedItems + 1)
              : Math.max(0, roadmap.completedItems - 1),
          }
        : roadmap
    ))

    const result = await updateRoadmapItemStatus(itemId, completed)
    if (!result.success) {
      setDetail(previousDetail)
      setRoadmaps(previousRoadmaps)
    }
    setCompletingItemIds((ids) => {
      const next = new Set(ids)
      next.delete(itemId)
      return next
    })
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

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm("Delete this roadmap? This cannot be undone.")) return
    setDeleting(true)
    const result = await deleteRoadmap(selectedId)
    if (result.success) {
      setSelectedId(null)
      setDetail(null)
      fetchRoadmaps()
    }
    setDeleting(false)
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
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(440px,1fr)_minmax(320px,400px)] 2xl:grid-cols-[minmax(300px,380px)_minmax(520px,1fr)_minmax(360px,460px)]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Roadmaps</h1>
          <p className="text-sm text-muted-foreground">Fast study plans tailored to your goals</p>
        </div>
        <Button className="shrink-0 self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Roadmap
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(440px,1fr)_minmax(320px,400px)] 2xl:grid-cols-[minmax(300px,380px)_minmax(520px,1fr)_minmax(360px,460px)]">
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
              const isGenerating = ["pending", "running"].includes(r.generationStatus)
              const hasGenerationError = r.generationStatus === "error"
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setSelectedId(r.id); setSelectedDay(null) }}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    selectedId === r.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  {isGenerating && <RoadmapDesigningFlow />}
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                    {isGenerating ? (
                      <Badge variant="outline" className="shrink-0 border-cyan-400/30 bg-cyan-400/10 text-[10px] text-cyan-300">
                        designing
                      </Badge>
                    ) : hasGenerationError ? (
                      <Badge variant="outline" className="shrink-0 border-red-400/30 bg-red-500/10 text-[10px] text-red-300">
                        needs retry
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${STATUS_COLORS[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    )}
                  </div>
                  {isGenerating ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-cyan-200">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>{DESIGNING_VERBS[designVerbIndex]}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-cyan-950/60">
                        <div className="h-full w-1/2 animate-[roadmap-flow_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{r.completedItems}/{r.totalItems} done</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span>{pct}%</span>
                    </div>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span className="shrink-0">
                      {new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(r.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="ml-auto shrink-0 capitalize">{r.intensity}</span>
                    {r.feasibility !== "realistic" && (
                      <Badge variant="outline" className={`text-[10px] ${FEASIBILITY_COLORS[r.feasibility] ?? ""}`}>
                        {r.feasibility}
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Center: Calendar timeline */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 py-3">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <CardTitle className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere]">
                {detail ? detail.name : isNewRoadmapDesigning ? "Designing your roadmap" : "Select a roadmap"}
              </CardTitle>
              {detail && (
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-8" onClick={handleRebalance} disabled={rebalancing}>
                    <RotateCcw className={`mr-1 h-3.5 w-3.5 ${rebalancing ? "animate-spin" : ""}`} /> Rebalance
                  </Button>
                  {detail.status === "active" ? (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleStatusChange("paused")}>
                      <Pause className="mr-1 h-3.5 w-3.5" /> Pause
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleStatusChange("active")}>
                      <Play className="mr-1 h-3.5 w-3.5" /> Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => handleStatusChange("archived")}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={handleDelete} disabled={deleting}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
            ) : !detail && isNewRoadmapDesigning ? (
              <RoadmapDesigningPanel />
            ) : !detail ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Select a roadmap to view its timeline
              </div>
            ) : ["pending", "running"].includes(detail.generationStatus) ? (
              <RoadmapDesigningPanel />
            ) : detail.generationStatus === "error" ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-300">
                  !
                </div>
                <p className="text-sm font-medium">Roadmap generation failed</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {detail.generationError ?? "Try creating the roadmap again with a slightly broader goal."}
                </p>
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
                  const isSelected = selectedDay === date
                  const completedCount = items.filter((i) => i.status === "completed").length
                  const allDone = completedCount === items.length
                  const theme = items.find((item) => item.dayTheme)?.dayTheme
                  const panelId = `roadmap-day-panel-${date}`

                  return (
                    <div key={date} className="space-y-1">
                      <button
                        type="button"
                        aria-expanded={isSelected}
                        aria-controls={panelId}
                        onClick={() => setSelectedDay((current) => current === date ? null : date)}
                        className={`w-full text-left rounded-md px-3 py-2 transition-colors flex items-center gap-3 ${
                          isSelected ? "bg-primary/10 border border-primary/30" :
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
                          {theme && (
                            <span className="block text-[10px] text-muted-foreground/70 truncate">{theme}</span>
                          )}
                        </div>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </button>
                      {isSelected && (
                        <div
                          id={panelId}
                          data-testid={panelId}
                          className="ml-[52px] rounded-md border border-primary/20 bg-background/80 p-2"
                        >
                          <RoadmapDayItemsList
                            items={items}
                            completingItemIds={completingItemIds}
                            onComplete={handleComplete}
                          />
                        </div>
                      )}
                    </div>
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
                : detail ? "Plan Overview" : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {!selectedDay && !detail && isNewRoadmapDesigning ? (
              <div className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase text-cyan-300">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Designing your roadmap
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  You can leave this page. The roadmap is being generated in the background and will appear here when it is ready.
                </p>
              </div>
            ) : !selectedDay && detail ? (
              <div className="space-y-3">
                {["pending", "running"].includes(detail.generationStatus) && (
                  <div className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase text-cyan-300">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      Designing your roadmap
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      You can leave this page. The roadmap is being generated in the background and will appear here when it is ready.
                    </p>
                  </div>
                )}
                {detail.generationStatus === "error" && (
                  <div className="rounded-md border border-red-400/20 bg-red-500/5 p-3">
                    <div className="text-[10px] uppercase text-red-300 mb-1">Generation failed</div>
                    <p className="text-sm text-muted-foreground">
                      {detail.generationError ?? "Try creating the roadmap again."}
                    </p>
                  </div>
                )}
                {detail.aiSummary && (
                  <div className="rounded-md border p-3">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">AI Summary</div>
                    <p className="text-sm leading-6 [overflow-wrap:anywhere]">{detail.aiSummary}</p>
                  </div>
                )}
                {detail.feasibilityNote && detail.feasibility !== "realistic" && (
                  <div className="rounded-md border p-3">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Feasibility</div>
                    <p className="text-sm leading-6 [overflow-wrap:anywhere]">{detail.feasibilityNote}</p>
                  </div>
                )}
                {detail.prompt && (
                  <div className="rounded-md border p-3">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Your Goal</div>
                    <p className="text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{detail.prompt}</p>
                  </div>
                )}
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline" className="capitalize">{detail.intensity}</Badge>
                  {detail.feasibility !== "realistic" && (
                    <Badge variant="outline" className={`${FEASIBILITY_COLORS[detail.feasibility] ?? ""}`}>
                      {detail.feasibility}
                    </Badge>
                  )}
                </div>
              </div>
            ) : !selectedDay ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Select a day to see its questions
              </div>
            ) : selectedDayItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No questions for this day
              </div>
            ) : (
              <RoadmapDayItemsList
                items={selectedDayItems}
                completingItemIds={completingItemIds}
                onComplete={handleComplete}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <RoadmapCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setNewlyCreatedId(id)
          setSelectedId(id)
          setSelectedDay(null)
          setDetail(null)
          fetchRoadmaps(false)
          fetchDetail(id, false)
          setCreateOpen(false)
        }}
      />
      <style>{`
        @keyframes roadmap-flow {
          0% { transform: translateX(-105%); opacity: 0.55; }
          50% { opacity: 1; }
          100% { transform: translateX(210%); opacity: 0.55; }
        }
        @keyframes root-draw {
          from { stroke-dashoffset: 80; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}

function RoadmapDayItemsList({
  items,
  completingItemIds,
  onComplete,
}: {
  items: RoadmapDetailItem[]
  completingItemIds: Set<string>
  onComplete: (itemId: string, completed: boolean) => void
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-md border p-3 ${
            item.status === "completed" ? "bg-green-500/5 border-green-500/20" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            <Checkbox
              checked={item.status === "completed"}
              onCheckedChange={(checked) => onComplete(item.id, checked === true)}
              disabled={completingItemIds.has(item.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${item.status === "completed" ? "line-through opacity-60" : ""}`}>
                  {item.question.title}
                </span>
                {item.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                {item.itemType !== "new_question" && (
                  <Badge variant="outline" className="text-[10px]">
                    {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-[10px] ${DIFF_COLORS[item.question.difficulty] ?? ""}`}>
                  {item.question.difficulty}
                </Badge>
                {(item.aiReason ?? item.sourceReason) && (
                  <span className="text-[10px] text-muted-foreground">
                    {item.aiReason ?? item.sourceReason}
                  </span>
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
  )
}

const DESIGNING_VERBS = [
  "figuring your path",
  "balancing the climb",
  "mapping strong roots",
  "choosing the right questions",
  "ensuring your success",
]

function RoadmapDesigningFlow() {
  return (
    <div className="pointer-events-none mb-2 overflow-hidden rounded-md border border-cyan-400/10 bg-gradient-to-br from-cyan-400/10 via-emerald-400/5 to-fuchsia-400/10 p-2">
      <svg viewBox="0 0 220 42" className="h-10 w-full text-cyan-200" aria-hidden="true">
        <path
          d="M12 34 C42 18, 56 18, 88 31 S140 40, 165 18 S198 8, 210 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          className="[animation:root-draw_2.4s_linear_infinite]"
        />
        <path
          d="M72 31 C78 22, 86 17, 98 13 M126 35 C130 25, 138 21, 151 19 M48 22 C43 14, 36 10, 24 8"
          fill="none"
          stroke="rgb(110 231 183)"
          strokeWidth="1.2"
          strokeDasharray="5 7"
          className="[animation:root-draw_1.8s_linear_infinite]"
        />
        <circle cx="12" cy="34" r="2.4" fill="currentColor" className="animate-pulse" />
        <circle cx="98" cy="13" r="2" fill="rgb(110 231 183)" className="animate-pulse" />
        <circle cx="210" cy="14" r="2.4" fill="rgb(217 70 239)" className="animate-pulse" />
      </svg>
    </div>
  )
}

function RoadmapDesigningPanel() {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-4 max-w-md rounded-lg border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-background to-fuchsia-400/10 p-4">
        <RoadmapDesigningFlow />
        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-cyan-100">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Designing your roadmap
        </div>
        <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">
          Figuring your path, balancing the climb, and choosing questions that move you forward.
        </p>
      </div>
    </div>
  )
}
