"use client"

import { TrendingUp, TrendingDown, Minus, ArrowRight, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { useApp } from "@/lib/app-context"
import { useAlerts, useStudies } from "@/lib/use-studies"
import { HeatmapViewer } from "../heatmap-viewer"

const accentMap = {
  primary: "text-primary",
  danger: "text-destructive",
  success: "text-success",
}

type Kpi = {
  label: string
  value: string
  delta: string
  trend: "up" | "down" | "flat"
  accent: keyof typeof accentMap
}

export function DashboardHome() {
  const { hospital, openPatient, setSection, profile } = useApp()
  const { studies, loading } = useStudies()
  const { alerts } = useAlerts()
  const recent = studies.slice(0, 4)
  const showcase = studies.find((p) => p.risk >= 70) ?? studies[0] ?? null
  const completed = studies.filter((study) => study.rawStatus === "analyzed" || study.rawStatus === "critical")
  const highRiskCount = studies.filter((study) => study.risk >= 70).length
  const kpis: Kpi[] = [
    { label: "Images Processed Today", value: String(studies.length), delta: loading ? "Loading" : "Live", trend: "flat", accent: "primary" },
    { label: "High Risk Cases", value: String(highRiskCount), delta: `${alerts.length} active`, trend: "up", accent: "danger" },
    { label: "Analyzed Studies", value: String(completed.length), delta: "Archived", trend: "flat", accent: "success" },
    { label: "Departments Connected", value: hospital.department ? "1+" : "0", delta: "Workspace", trend: "flat", accent: "primary" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Good morning</p>
        <h2 className="text-2xl font-bold tracking-tight">{profile?.full_name ?? "Radiant clinician"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hospital.name} · {hospital.department}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className={`mt-2 text-3xl font-bold tabular-nums ${accentMap[kpi.accent]}`}>{kpi.value}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendIcon className="h-3.5 w-3.5" />
                  {kpi.delta}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Live activity */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 [animation:pulse-ring_2s_ease-out_infinite]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <h3 className="font-semibold">Live Analysis Feed</h3>
              </div>
              <button
                onClick={() => setSection("pacs")}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Patient</th>
                    <th className="px-4 py-2.5 font-medium">Modality</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Region</th>
                    <th className="px-4 py-2.5 text-right font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => openPatient(p)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.modality}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{p.bodyPart}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={riskVariant(p.risk)}>{p.risk}%</Badge>
                      </td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? "Loading studies..." : "No studies archived yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">AI Heatmap Viewer</h3>
              <Badge variant={showcase ? riskVariant(showcase.risk) : "muted"}>
                <Activity className="h-3 w-3" /> {showcase ? `${showcase.risk}% risk` : "No study"}
              </Badge>
            </div>
            {showcase ? (
              <>
                <HeatmapViewer image={showcase.image} heatmapImage={showcase.heatmapImage} />
                <button
                  onClick={() => openPatient(showcase)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Open full analysis <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Upload a chest X-ray to preview Grad-CAM heatmaps here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
