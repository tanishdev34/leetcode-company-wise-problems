"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Building2, Tag, BookOpen } from "lucide-react"

const TABS = [
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "topics", label: "Topics", icon: Tag },
]

interface LibraryViewProps {
  companies: { id: string; name: string; slug: string; count: number; solved: number }[]
  topics: string[]
}

export function LibraryView({ companies, topics }: LibraryViewProps) {
  const [tab, setTab] = useState("companies")
  const [query, setQuery] = useState("")

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )
  const filteredTopics = topics.filter((t) =>
    t.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground">Browse questions, companies, and topics</p>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setQuery("") }}
              className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${tab}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Companies */}
      {tab === "companies" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No companies found
            </div>
          ) : (
            filteredCompanies.map((c) => {
              const pct = c.count > 0 ? Math.round((c.solved / c.count) * 100) : 0
              return (
              <Link
                key={c.id}
                href={`/companies/${c.slug}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium truncate block">{c.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {c.solved}/{c.count}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              )
            })
          )}
        </div>
      )}

      {/* Topics */}
      {tab === "topics" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTopics.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No topics found
            </div>
          ) : (
            filteredTopics.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="flex items-center gap-2.5 rounded-md border p-3 hover:bg-accent transition-colors"
              >
                <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm font-medium">{t}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
