"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  createRoadmap,
  getCompaniesForSelect,
  getTopicsForSelect,
} from "@/actions/roadmaps"
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"

const STRATEGIES = [
  { value: "balanced", label: "Balanced", desc: "Mix difficulties evenly" },
  { value: "frequency", label: "Frequency First", desc: "Most asked questions first" },
  { value: "weak_topic", label: "Weak Topics", desc: "Focus on areas with fewest solves" },
  { value: "sprint", label: "Interview Sprint", desc: "Hard problems first" },
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function RoadmapCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  // Form state
  const [name, setName] = useState("")
  const [goalType, setGoalType] = useState("company")
  const [companyId, setCompanyId] = useState("")
  const [topicSlug, setTopicSlug] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dailyTarget, setDailyTarget] = useState(3)
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [strategy, setStrategy] = useState("balanced")

  // Lookup data
  const [companies, setCompanies] = useState<{ id: string; name: string; slug: string }[]>([])
  const [topics, setTopics] = useState<string[]>([])

  const fetchLookups = useCallback(async () => {
    const [compRes, topicRes] = await Promise.all([
      getCompaniesForSelect(),
      getTopicsForSelect(),
    ])
    if (compRes.success) setCompanies(compRes.data.companies)
    if (topicRes.success) setTopics(topicRes.data.topics)
  }, [])

  useEffect(() => {
    if (open) fetchLookups()
  }, [open, fetchLookups])

  const reset = () => {
    setStep(0)
    setName("")
    setGoalType("company")
    setCompanyId("")
    setTopicSlug("")
    setStartDate("")
    setEndDate("")
    setDailyTarget(3)
    setStudyDays([1, 2, 3, 4, 5])
    setStrategy("balanced")
    setError("")
  }

  const canNext = () => {
    if (step === 0) {
      if (!name.trim()) return false
      if (goalType === "company" && !companyId) return false
      if (goalType === "topic" && !topicSlug) return false
      return true
    }
    if (step === 1) {
      if (!startDate || !endDate) return false
      if (new Date(endDate) <= new Date(startDate)) return false
      if (studyDays.length === 0) return false
      return true
    }
    return true
  }

  const handleCreate = async () => {
    setCreating(true)
    setError("")
    const result = await createRoadmap({
      name,
      goalType,
      companyId: goalType === "company" ? companyId : undefined,
      topicSlug: goalType === "topic" ? topicSlug : undefined,
      startDate,
      endDate,
      dailyQuestionTarget: dailyTarget,
      studyDays,
      strategy,
    })
    setCreating(false)
    if (result.success) {
      reset()
      onCreated()
    } else {
      setError(result.error)
    }
  }

  const toggleDay = (day: number) => {
    setStudyDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort())
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Roadmap</DialogTitle>
          <DialogDescription>
            {step === 0 ? "Choose your goal" : step === 1 ? "Set your schedule" : step === 2 ? "Pick a strategy" : "Review and create"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="roadmap-name">Name</Label>
              <Input
                id="roadmap-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Google Graphs by July"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Goal Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value: "company", label: "Company" },
                  { value: "topic", label: "Topic" },
                  { value: "mixed", label: "Mixed" },
                  { value: "custom", label: "Custom" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGoalType(opt.value)}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      goalType === opt.value ? "border-primary bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {goalType === "company" && (
              <div>
                <Label>Company</Label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {goalType === "topic" && (
              <div>
                <Label>Topic</Label>
                <select
                  value={topicSlug}
                  onChange={(e) => setTopicSlug(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a topic</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Questions per Day</Label>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDailyTarget(n)}
                    className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
                      dailyTarget === n ? "border-primary bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Study Days</Label>
              <div className="flex gap-1.5 mt-1">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      studyDays.includes(i) ? "border-primary bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStrategy(s.value)}
                className={`w-full text-left rounded-md border p-3 transition-colors ${
                  strategy === s.value ? "border-primary bg-primary/10" : "hover:bg-accent"
                }`}
              >
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="font-medium">
                  {goalType === "company" ? companies.find((c) => c.id === companyId)?.name :
                   goalType === "topic" ? topicSlug : goalType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">
                  {startDate} → {endDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-medium">{dailyTarget}/day, {studyDays.map((d) => DAYS[d]).join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strategy</span>
                <span className="font-medium">{STRATEGIES.find((s) => s.value === strategy)?.label}</span>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          {step > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
          ) : <div />}
          {step < 3 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating...</>
              ) : (
                <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Create Roadmap</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
