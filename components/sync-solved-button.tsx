"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle2 } from "lucide-react"

type SyncStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; synced: number; matched: number; imported: number; warning?: string }
  | { type: "error"; message: string }

interface SyncSolvedButtonProps {
  username: string | null
}

export function SyncSolvedButton({ username }: SyncSolvedButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<SyncStatus>({ type: "idle" })

  async function handleSync() {
    if (!username) return
    setStatus({ type: "loading" })

    try {
      const res = await fetch(`/api/sync?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const result = await res.json()

      if (res.ok) {
        setStatus({
          type: "success",
          synced: result.synced,
          matched: result.matched,
          imported: result.imported ?? 0,
          warning: result.warning,
        })
        router.refresh()
      } else {
        setStatus({ type: "error", message: result.error })
      }
    } catch {
      setStatus({ type: "error", message: "Failed to sync" })
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status.type === "success" && (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {status.synced} marked solved
          <span className="text-muted-foreground">
            ({status.matched} matched
            {status.imported > 0 ? `, ${status.imported} imported` : ""})
          </span>
        </span>
      )}
      {status.type === "error" && (
        <span className="text-xs text-destructive">{status.message}</span>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={status.type === "loading" || !username}
        title={username ? undefined : "Connect your LeetCode username in Settings first"}
        className="gap-1.5"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${status.type === "loading" ? "animate-spin" : ""}`}
        />
        {status.type === "loading" ? "Syncing…" : "Sync Solved"}
      </Button>
    </div>
  )
}
