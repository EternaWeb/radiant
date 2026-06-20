"use client"

import { TrendingUp, TrendingDown, Minus, ArrowRight, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"
import { OrgLogo } from "@/components/org-logo"
import { useApp } from "@/lib/app-context"
import { findingsToHeatmapBoxes } from "@/lib/lung-zones"
import { useCases } from "@/lib/use-cases"
import { useAlerts } from "@/lib/use-studies"
import { HeatmapViewer } from "../heatmap-viewer"

const accentMap = {
  primary: "text-accent-blue",
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
  const { hospital, openCase, setSection, profile, organization } = useApp()
  const { cases, loading } = useCases()
  const { alerts } = useAlerts()
  const recent = cases.slice(0, 4)
  const records = cases.flatMap((caseView) => caseView.records.map((record) => ({ caseView, record })))
  const showcase = records.find((item) => item.record.risk >= 70) ?? records[0] ?? null
  const showcaseBoxes = showcase ? findingsToHeatmapBoxes(showcase.record.findings) : []
  const completed = records.filter((item) => item.record.rawStatus === "analyzed" || item.record.rawStatus === "critical")
  const highRiskCount = records.filter((item) => item.record.risk >= 70).length
  const kpis: Kpi[] = [
    { label: "Images Processed Today", value: String(records.length), delta: loading ? "Loading" : "Live", trend: "flat", accent: "primary" },
    { label: "High Risk Cases", value: String(highRiskCount), delta: `${alerts.length} active`, trend: "up", accent: "danger" },
    { label: "Analyzed Studies", value: String(completed.length), delta: "Archived", trend: "flat", accent: "success" },
    { label: "Departments Connected", value: hospital.department ? "1+" : "0", delta: "Workspace", trend: "flat", accent: "primary" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={profile?.full_name ?? "Radiant clinician"} src={profile?.avatar_url} size="lg" />
        <div>
          <p className="text-sm text-muted-foreground">Good morning</p>
          <h2 className="text-2xl font-bold tracking-tight">{profile?.full_name ?? "Radiant clinician"}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <OrgLogo name={hospital.name} src={organization?.logo_url} size="sm" />
            {hospital.name} · {hospital.department}
          </p>
        </div>
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
                className="inline-flex items-center gap-1 text-sm text-accent-blue hover:underline"
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
                  {recent.map((caseView) => {
                    const latest = caseView.records.at(-1)
                    return (
                    <tr
                      key={caseView.id}
                      onClick={() => openCase(caseView)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium">{caseView.client.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{latest?.modality ?? "X-Ray"}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{caseView.title}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={riskVariant(latest?.risk ?? 0)}>{latest?.risk ?? 0}%</Badge>
                      </td>
                    </tr>
                    )
                  })}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {loading ? "Loading cases..." : "No cases archived yet."}
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
              <Badge variant={showcase ? riskVariant(showcase.record.risk) : "muted"}>
                <Activity className="h-3 w-3" /> {showcase ? `${showcase.record.risk}% risk` : "No record"}
              </Badge>
            </div>
            {showcase ? (
              <>
                <HeatmapViewer image={showcase.record.image} heatmapImage={showcase.record.heatmapImage} boxes={showcaseBoxes} />
                <button
                  onClick={() => openCase(showcase.caseView, showcase.record.id)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Open full analysis <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Upload a chest X-ray to preview GPT lung-zone overlays here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
