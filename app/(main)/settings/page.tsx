import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { SettingsView } from "@/components/settings-view"

export const metadata = {
  title: "Settings — LC Tracker",
  description: "Account and app settings",
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      leetcodeUsername: true,
      codeforcesUsername: true,
      emailSubscribed: true,
    },
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <SettingsView user={user} />
    </div>
  )
}
