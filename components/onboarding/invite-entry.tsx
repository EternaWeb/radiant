"use client"

import { useEffect } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Loader2, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type InviteEntryProps = {
  token: string
  email: string
  organizationName: string
  departmentName: string
  roleLabel: string
}

export function InviteEntry({ token, email, organizationName, departmentName, roleLabel }: InviteEntryProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function saveToken() {
      const response = await fetch("/api/invites/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()

      if (!active) return
      if (!response.ok) {
        setError(result.error ?? "Could not prepare this invite.")
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.push(`/invite/${token}/onboarding`)
        return
      }

      setReady(true)
    }

    saveToken()
    return () => {
      active = false
    }
  }, [router, token])

  async function signIn() {
    setLoading(true)
    setError(null)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const next = encodeURIComponent(`/invite/${token}/onboarding`)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${next}`,
      },
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Activity className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">You are invited to Radiant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join {organizationName} in {departmentName} as {roleLabel}.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-background p-3 text-left text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" /> Invite sent to
          </p>
          <p className="mt-1 font-medium">{email}</p>
        </div>
        <button
          onClick={signIn}
          disabled={loading || !ready}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Opening Google..." : ready ? "Continue with Google" : "Preparing invite..."}
        </button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
