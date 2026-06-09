"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LeetcodeUsernameForm } from "@/components/leetcode-username-form"
import { CodeforcesUsernameForm } from "@/components/codeforces-username-form"
import { EmailSubscriptionToggle } from "@/components/email-subscription-toggle"
import { User, Link2, Mail } from "lucide-react"

interface SettingsViewProps {
  user: {
    email: string
    name: string | null
    leetcodeUsername: string | null
    codeforcesUsername: string | null
    emailSubscribed: boolean
  } | null
}

export function SettingsView({ user }: SettingsViewProps) {
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and integrations</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
          {user.name && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm">{user.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Accounts */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Linked Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <LeetcodeUsernameForm initialValue={user.leetcodeUsername ?? undefined} />
          <CodeforcesUsernameForm initialValue={user.codeforcesUsername ?? undefined} />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <EmailSubscriptionToggle />
        </CardContent>
      </Card>
    </div>
  )
}
