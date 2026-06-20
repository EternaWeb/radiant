"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, Loader2, Mail, Stethoscope } from "lucide-react"
import { RadiantLogo } from "@/components/radiant-logo"
import { Button } from "@/components/ui/button"
import type { ClinicalRole } from "@/lib/supabase/types"

type InviteOnboardingProps = {
  token: string
  invitedEmail: string
  signedInEmail: string
  organizationName: string
  departmentName: string
  clinicalRole: ClinicalRole
  roleLabel: string
  initialFullName: string
}

export function InviteOnboarding({
  token,
  invitedEmail,
  signedInEmail,
  organizationName,
  departmentName,
  clinicalRole,
  roleLabel,
  initialFullName,
}: InviteOnboardingProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const name = fullName.trim()

  async function acceptInvite() {
    if (name.length < 2) {
      setError("Enter your full name to continue.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          clinicalRole,
        }),
      })
      const result = await readJson(response)

      if (!response.ok) {
        setError(result?.error ?? "Could not accept this invite.")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Could not accept this invite. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-blue/15 blur-[120px]" />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl">
        <RadiantLogo className="h-10 rounded-md" />
        <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight">Complete your invite</h1>
        <p className="mt-2 text-muted-foreground">
          Your hospital, department, and role are already set by the workspace admin. Enter your name to join the
          organization.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InviteDetail icon={Building2} label="Hospital" value={organizationName} />
          <InviteDetail icon={Building2} label="Department" value={departmentName} />
          <InviteDetail icon={Stethoscope} label="Role" value={roleLabel} />
          <InviteDetail icon={Mail} label="Invite email" value={invitedEmail} />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm">
          <p className="text-muted-foreground">Signed in with Google as</p>
          <p className="mt-1 font-medium">{signedInEmail}</p>
        </div>

        <label className="mt-6 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">Full Name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Dr. Alex Smith"
            className="h-11 rounded-lg border border-border bg-input px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30"
          />
        </label>

        <Button
          variant="accent"
          size="lg"
          className="mt-6 h-11 w-full px-6 text-base"
          onClick={acceptInvite}
          disabled={loading || name.length < 2}
          data-icon="inline-end"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              Join Organization <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function InviteDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  )
}

async function readJson(response: Response): Promise<{ error?: string } | null> {
  const contentType = response.headers.get("content-type")
  if (!contentType?.includes("application/json")) return null
  return (await response.json()) as { error?: string }
}
