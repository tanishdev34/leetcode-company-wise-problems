"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Loader2, Sparkles } from "lucide-react"

const INTENSITIES = [
  { value: "relaxed" as const, label: "Relaxed", desc: "Light days, fewer questions" },
  { value: "balanced" as const, label: "Balanced", desc: "Steady daily practice" },
  { value: "aggressive" as const, label: "Aggressive", desc: "Heavy days, fast progress" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

export function RoadmapCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const [prompt, setPrompt] = useState("")
  const [deadline, setDeadline] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [topicSlug, setTopicSlug] = useState("")
  const [intensity, setIntensity] = useState<"relaxed" | "balanced" | "aggressive">("balanced")

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
    setPrompt("")
    setDeadline("")
    setCompanyId("")
    setTopicSlug("")
    setIntensity("balanced")
    setError("")
  }

  const handleCreate = async () => {
    setCreating(true)
    setError("")
    const result = await createRoadmap({
      prompt,
      companyId: companyId || undefined,
      topicSlug: topicSlug || undefined,
      deadline: deadline || undefined,
      intensity,
    })
    setCreating(false)
    if (result.success) {
      reset()
      onCreated(result.data.id)
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Roadmap</DialogTitle>
          <DialogDescription>
            Describe your interview goal. The planner will choose the pace, schedule, and questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="roadmap-prompt">What are you preparing for?</Label>
            <Textarea
              id="roadmap-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Prepare me for Google graphs before July 20"
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label>Intensity</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {INTENSITIES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntensity(opt.value)}
                  className={`rounded-md border px-3 py-2 text-center transition-colors ${
                    intensity === opt.value ? "border-primary bg-primary/10" : "hover:bg-accent"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="roadmap-company">Company (optional)</Label>
              <select
                id="roadmap-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="roadmap-topic">Topic (optional)</Label>
              <select
                id="roadmap-topic"
                value={topicSlug}
                onChange={(e) => setTopicSlug(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="roadmap-deadline">Deadline (optional)</Label>
            <Input
              id="roadmap-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={creating || !prompt.trim()}>
            {creating ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Designing your plan...</>
            ) : (
              <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate Roadmap</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
