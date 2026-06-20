"use client"

import { useState } from "react"
import { ScanLine, Hospital, Ambulance, BarChart3, Check, ArrowRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { roles } from "@/lib/data"
import { useApp } from "@/lib/app-context"
import type { ClinicalRole } from "@/lib/supabase/types"

const icons: Record<string, LucideIcon> = {
  scan: ScanLine,
  hospital: Hospital,
  ambulance: Ambulance,
  chart: BarChart3,
}

export function RoleSelect() {
  const { setStage, setRole } = useApp()
  const [selected, setSelected] = useState<ClinicalRole>("radiologist")

  function next() {
    setRole(selected)
    setStage("setup")
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center px-6 py-12">
      <Stepper step={2} />
      <h1 className="mt-8 text-balance text-3xl font-bold tracking-tight md:text-4xl">Choose your role</h1>
      <p className="mt-2 text-muted-foreground">
        We&apos;ll tailor the dashboard, alerts, and tools to how you work.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const Icon = icons[role.icon]
          const roleId = role.id as ClinicalRole
          const active = selected === roleId
          return (
            <button
              key={role.id}
              onClick={() => setSelected(roleId)}
              className={`group relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all ${
                active
                  ? "border-accent-blue bg-accent-blue/5 ring-2 ring-accent-blue/30"
                  : "border-border bg-card hover:border-accent-blue/40 hover:bg-card/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    active ? "bg-accent-blue text-accent-blue-foreground" : "bg-muted text-accent-blue"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-blue text-accent-blue-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{role.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="lg" onClick={() => setStage("login")}>
          Back
        </Button>
        <Button variant="accent" size="lg" className="h-11 px-6 text-base" onClick={next} data-icon="inline-end">
          Continue <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

export function Stepper({ step }: { step: number }) {
  const labels = ["Profile", "Role", "Hospital Setup"]
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-accent-blue text-accent-blue-foreground"
                  : done
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </span>
            <span className={`text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < labels.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}
