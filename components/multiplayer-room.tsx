"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  LiveblocksProvider,
  RoomProvider,
  useMyPresence,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useStorage,
  useMutation,
  ClientSideSuspense,
} from "@liveblocks/react/suspense"
import { Json } from "@liveblocks/client"
import { liveblocksConfig } from "@/lib/liveblocks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, ExternalLink, Send, Users, Copy, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react"
import { useSession } from "@/lib/auth-client"

// ─── Types ───────────────────────────────────────────
interface Question {
  id: string
  title: string
  leetcodeUrl: string
  difficulty: string
  topics: string[]
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: number
}

type Presence = {
  name: string
  avatar: string
  isReady: boolean
}

// ─── Timer hook ──────────────────────────────────────
function useCountdown(targetEndTime: number | null) {
  const [remaining, setRemaining] = useState<number>(0)
  useEffect(() => {
    if (!targetEndTime) return
    const tick = () => setRemaining(Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetEndTime])
  return remaining
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

// ─── Room content ────────────────────────────────────
function RoomContent({
  roomCode,
  question,
  duration,
  startedAt,
}: {
  roomCode: string
  question: Question
  duration: number
  startedAt: Date
}) {
  const { data: session } = useSession()
  const [myPresence, updateMyPresence] = useMyPresence()
  const others = useOthers()
  const broadcast = useBroadcastEvent()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [copied, setCopied] = useState(false)

  // Shared Liveblocks Storage for collaborative notes
  const notes = useStorage((root) => root.notes)
  const updateNotes = useMutation(({ storage }, newNotes: string) => {
    storage.set("notes", newNotes)
  }, [])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const targetEndTime = startedAt ? startedAt.getTime() + duration * 1000 : null
  const timeRemaining = useCountdown(targetEndTime)
  const isUrgent = timeRemaining < 300 && timeRemaining > 0
  const isOver = timeRemaining <= 0
  const timerProgress = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0

  useEffect(() => {
    updateMyPresence({
      name: session?.user?.name || session?.user?.email || "Anonymous",
      avatar: session?.user?.image || "",
      isReady: true,
    } as Presence)
  }, [session, updateMyPresence])

  // Listen for chat messages via broadcast
  useEventListener((eventData) => {
    const ev = eventData.event as unknown as { type: string; data: ChatMessage }
    if (ev?.type === "chat" && ev?.data) {
      setMessages((prev) => [...prev, ev.data])
    }
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: session?.user?.id || "unknown",
      userName: session?.user?.name || session?.user?.email || "Anonymous",
      text: chatInput.trim(),
      timestamp: Date.now(),
    }
    broadcast({ type: "chat", data: msg } as unknown as Json)
    setMessages((prev) => [...prev, msg])
    setChatInput("")
  }, [chatInput, session, broadcast])

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [roomCode])

  const difficultyColor = (d: string) => {
    switch (d) {
      case "EASY": return "border-green-500/30 text-green-500 bg-green-500/10"
      case "MEDIUM": return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
      case "HARD": return "border-red-500/30 text-red-500 bg-red-500/10"
      default: return ""
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setError(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <Card className={isUrgent ? "border-red-500/50 bg-red-500/5" : ""}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{others.length + 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${isUrgent ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
              <span className={`font-mono font-bold tabular-nums ${isUrgent ? "text-red-500" : ""}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Room: {roomCode}</Badge>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopyCode}>
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isOver && <Progress value={timerProgress} className={`h-1 ${isUrgent ? "bg-red-500/30" : ""}`} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xl">{question.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className={difficultyColor(question.difficulty)}>{question.difficulty}</Badge>
                    {question.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">{topic}</Badge>
                    ))}
                  </div>
                </div>
                <a href={question.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 h-4 w-4" /> LeetCode</Button>
                </a>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Collaborative Notes</CardTitle>
              <CardDescription className="text-xs">Notes sync in real-time across all participants</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={typeof notes === "string" ? notes : ""}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="Write your approach, code, edge cases... (shared in real-time)"
                className="min-h-[200px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{session?.user?.name || session?.user?.email || "You"}</span>
                  <Badge variant="outline" className="text-[10px]">Host</Badge>
                </div>
                {others.map((other) => (
                  <div key={other.id} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{(other.presence as Presence)?.name || "Participant"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[350px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-3 pt-0">
              <ScrollArea className="flex-1 mb-3 pr-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No messages yet.</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <span className="font-medium text-xs text-primary">{msg.userName}</span>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="h-9 text-sm"
                />
                <Button size="sm" className="h-9 w-9 p-0" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Wrapper with LiveblocksProvider + RoomProvider ──
export function MultiplayerRoom({ roomCode, question, duration, startedAt }: {
  roomCode: string
  question: Question
  duration: number
  startedAt: Date
  onLeave: () => void
}) {
  const roomId = `interview-${roomCode}`

  const content = (
    <RoomProvider id={roomId} initialPresence={{ name: "", avatar: "", isReady: false }} initialStorage={{ notes: "" }}>
      <ClientSideSuspense fallback={<div className="flex justify-center py-12 text-muted-foreground">Connecting to room...</div>}>
        <RoomContent
          roomCode={roomCode}
          question={question}
          duration={duration}
          startedAt={startedAt}
        />
      </ClientSideSuspense>
    </RoomProvider>
  )

  // Use publicApiKey if available, otherwise authEndpoint
  if (liveblocksConfig.publicApiKey) {
    return (
      <LiveblocksProvider publicApiKey={liveblocksConfig.publicApiKey}>
        {content}
      </LiveblocksProvider>
    )
  }

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks/auth">
      {content}
    </LiveblocksProvider>
  )
}
