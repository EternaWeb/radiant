"use client"

import { TrendingUp, TrendingDown, Minus, ArrowRight, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { kpis, patients } from "@/lib/data"
import { useApp } from "@/lib/app-context"
import { HeatmapViewer } from "../heatmap-viewer"

const accentMap = {
  primary: "text-primary",
  danger: "text-destructive",
  success: "text-success",
}

export function DashboardHome() {
  const { hospital, openPatient, setSection } = useApp()
  const recent = patients.slice(0, 4)
  const showcase = patients.find((p) => p.id === "p4")!

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Good morning</p>
        <h2 className="text-2xl font-bold tracking-tight">Dr. Alex Smith</h2>
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
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI heatmap preview */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">AI Heatmap Viewer</h3>
              <Badge variant="danger">
                <Activity className="h-3 w-3" /> High risk
              </Badge>
            </div>
            <HeatmapViewer
              image={showcase.image}
              boxes={[
                { top: 46, left: 18, width: 26, height: 30, label: "Possible Pneumonia", confidence: 92, tone: "danger" },
                { top: 32, left: 58, width: 20, height: 22, label: "Opacity", confidence: 87, tone: "warning" },
              ]}
            />
            <button
              onClick={() => openPatient(showcase)}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Open full analysis <ArrowRight className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
