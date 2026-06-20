"use client"

import { ArrowRight, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
import { Stepper } from "./role-select"

export function ProfileSetup() {
  const { fullName, setFullName, setStage, user, invite } = useApp()
  const name = fullName.trim()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-6 py-12">
      <Stepper step={1} />
      <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue">
        <UserRound className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight md:text-4xl">Complete your profile</h1>
      <p className="mt-2 text-muted-foreground">
        Enter your full name so your workspace and department directory show the right identity.
      </p>

      {invite && (
        <div className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          You are joining <span className="font-medium text-foreground">{invite.organizationName}</span> in{" "}
          <span className="font-medium text-foreground">{invite.departmentName}</span> as{" "}
          <span className="font-medium text-foreground">{invite.email}</span>.
        </div>
      )}

      <label className="mt-8 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Full Name</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="e.g. Dr. Alex Smith"
          className="h-11 rounded-lg border border-border bg-input px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30"
        />
      </label>

      <p className="mt-3 text-xs text-muted-foreground">Signed in as {user?.email ?? "your Google account"}.</p>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="lg" onClick={() => setStage("login")}>
          Back
        </Button>
        <Button
          variant="accent"
          size="lg"
          className="h-11 px-6 text-base"
          disabled={name.length < 2}
          onClick={() => {
            setFullName(name)
            setStage("role")
          }}
          data-icon="inline-end"
        >
          Continue <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
