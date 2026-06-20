"use client"

import { useState } from "react"
import { Database, Cpu, Bell, LogOut } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"

function Toggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  )
}

export function SettingsView() {
  const { hospital, role, setStage } = useApp()

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Database className="h-4 w-4 text-primary" /> Connection
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Hospital" value={hospital.name} />
            <Row label="Department" value={hospital.department} />
            <Row label="Role" value={role ?? "Radiologist"} />
            <Row label="PACS" value="Sectra PACS Cloud" status />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Cpu className="h-4 w-4 text-primary" /> AI Engine
          </h3>
          <div className="flex flex-col gap-4">
            <SettingRow icon={Cpu} label="Auto-analyze incoming studies" desc="Run AI on every new DICOM as it arrives" />
            <SettingRow icon={Bell} label="Critical risk alerts" desc="Notify departments for risk scores above 80" />
            <SettingRow icon={Bell} label="Daily summary digest" desc="Email a morning report of processed studies" defaultOn={false} />
          </div>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        size="lg"
        className="h-10 self-start px-5"
        onClick={() => setStage("welcome")}
        data-icon="inline-start"
      >
        <LogOut data-icon="inline-start" /> Sign out
      </Button>
    </div>
  )
}

function Row({ label, value, status }: { label: string; value: string; status?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 font-medium">
        {value}
        {status && <Badge variant="success">Connected</Badge>}
      </dd>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  desc,
  defaultOn = true,
}: {
  icon: typeof Cpu
  label: string
  desc: string
  defaultOn?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Toggle defaultOn={defaultOn} />
    </div>
  )
}
