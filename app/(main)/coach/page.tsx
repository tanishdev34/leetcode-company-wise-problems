import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CoachView } from "@/components/coach-view"

export const metadata = {
  title: "Coach — LC Tracker",
  description: "Feedback, patterns, and review in one place",
}

export default async function CoachPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <CoachView />
    </div>
  )
}
