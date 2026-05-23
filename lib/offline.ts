// Client-side only - DO NOT import in server components
"use client"

import { get, set, del, keys, clear } from "idb-keyval"

export interface OfflineReview {
  id: string
  questionId: string
  questionTitle: string
  leetcodeUrl: string
  difficulty: string
  confidence: number
  reviewCount: number
  lastReviewedAt: string | null
  nextReviewAt: string
}

export interface OfflineNotes {
  questionId: string
  notes: string
  syncedAt: string
}

export async function cacheReviews(reviews: OfflineReview[]) {
  await set("cached_reviews", reviews)
  await set("reviews_last_synced", new Date().toISOString())
}

export async function getCachedReviews(): Promise<OfflineReview[]> {
  return (await get("cached_reviews")) || []
}

export async function cacheNotes(questionId: string, notes: string) {
  const allNotes = await getCachedNotesMap()
  allNotes[questionId] = { questionId, notes, syncedAt: new Date().toISOString() }
  await set("cached_notes_map", allNotes)
}

export async function getCachedNotesMap(): Promise<Record<string, OfflineNotes>> {
  return (await get("cached_notes_map")) || {}
}

export async function getCachedNote(questionId: string): Promise<string | null> {
  const notes = await getCachedNotesMap()
  return notes[questionId]?.notes || null
}

export async function getLastSyncedTime(): Promise<string | null> {
  return (await get("reviews_last_synced")) || null
}

export async function clearOfflineCache() {
  await clear()
}

export function isOnline(): boolean {
  return navigator.onLine
}

export function onOnlineChange(callback: (online: boolean) => void) {
  const handler = () => callback(navigator.onLine)
  window.addEventListener("online", handler)
  window.addEventListener("offline", handler)
  return () => {
    window.removeEventListener("online", handler)
    window.removeEventListener("offline", handler)
  }
}
