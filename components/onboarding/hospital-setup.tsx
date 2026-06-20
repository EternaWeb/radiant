"use client"

import { useState } from "react"
import { Building2, ArrowRight, ArrowDown, Cpu, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
import { Stepper } from "./role-select"
import type { DepartmentRecord, Organization, Profile } from "@/lib/supabase/types"

type CompleteOnboardingResponse = {
  error?: string
  profile?: Profile
  organization?: Organization
  department?: DepartmentRecord
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-lg border border-border bg-input px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30"
      />
    </label>
  )
}

export function HospitalSetup() {
  const { setStage, hospital, setHospital, fullName, role, invite, completeAuthState } = useApp()
  const [name, setName] = useState(hospital.name)
  const [department, setDepartment] = useState(hospital.department)
  const [pacs, setPacs] = useState("Sectra PACS Cloud")
  const [dicom, setDicom] = useState("dicom://pacs.stvincent.org:11112")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function next() {
    if (!role) {
      setError("Choose a role before connecting your hospital.")
      return
    }

    setLoading(true)
    setError(null)
    setHospital({ name: name || "St. Vincent Medical Center", department: department || "Radiology" })

    try {
      const endpoint = invite ? `/api/invites/${invite.token}` : "/api/onboarding/complete"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          clinicalRole: role,
          hospitalName: name,
          departmentName: department,
        }),
      })
      const result = await readJson(response)

      if (!response.ok) {
        setError(result?.error ?? "Could not complete onboarding.")
        return
      }

      if (!result?.profile || !result.organization || !result.department) {
        setError("Could not complete onboarding.")
        return
      }

      completeAuthState({
        profile: result.profile,
        organization: result.organization,
        department: result.department,
      })
    } catch {
      setError("Could not complete onboarding.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center px-6 py-12">
      <Stepper step={3} />
      <h1 className="mt-8 text-balance text-3xl font-bold tracking-tight md:text-4xl">Connect your hospital</h1>
      <p className="mt-2 text-muted-foreground">Link your PACS and DICOM endpoint so the AI engine can stream studies.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Hospital Name"
            value={name}
            onChange={invite ? () => undefined : setName}
            placeholder="e.g. St. Vincent Medical Center"
          />
          <Field
            label="Your department"
            value={department}
            onChange={invite ? () => undefined : setDepartment}
            placeholder="e.g. Radiology"
          />
          <Field label="PACS Connection" value={pacs} onChange={setPacs} placeholder="PACS provider" />
          <Field label="DICOM Endpoint" value={dicom} onChange={setDicom} placeholder="dicom://host:port" />
        </div>

        {/* pipeline visual */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6">
          <PipelineNode icon={Building2} label="Hospital" sub={name || "Your facility"} tone="muted" />
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
          <PipelineNode icon={Database} label="PACS" sub={pacs} tone="primary" />
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
          <PipelineNode icon={Cpu} label="AI Engine" sub="Radiant Core" tone="success" />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="lg" onClick={() => setStage("role")}>
          Back
        </Button>
        <Button variant="accent" size="lg" className="h-11 px-6 text-base" onClick={next} disabled={loading} data-icon="inline-end">
          {loading ? "Saving..." : "Connect System"} <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  )
}

function PipelineNode({
  icon: Icon,
  label,
  sub,
  tone,
}: {
  icon: typeof Building2
  label: string
  sub: string
  tone: "muted" | "primary" | "success"
}) {
  const toneClass = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-accent-blue/15 text-accent-blue",
    success: "bg-success/15 text-success",
  }[tone]
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

async function readJson(response: Response): Promise<CompleteOnboardingResponse | null> {
  const contentType = response.headers.get("content-type")
  if (!contentType?.includes("application/json")) return null
  return (await response.json()) as CompleteOnboardingResponse
}
