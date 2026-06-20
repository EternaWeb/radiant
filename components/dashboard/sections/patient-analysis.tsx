"use client"

import { useState } from "react"
import {
  ZoomIn,
  Contrast,
  Layers,
  Ruler,
  Check,
  ArrowLeft,
  FileText,
  Share2,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { patients } from "@/lib/data"
import { useApp } from "@/lib/app-context"
import { HeatmapViewer } from "../heatmap-viewer"
import { RiskGauge } from "../risk-gauge"

const tools = [
  { icon: ZoomIn, label: "Zoom" },
  { icon: Contrast, label: "Contrast" },
  { icon: Layers, label: "Slices" },
  { icon: Ruler, label: "Measure" },
]

export function PatientAnalysis() {
  const { selectedPatient, setSelectedPatient } = useApp()
  const patient = selectedPatient ?? patients.find((p) => p.id === "p4")!
  const [approved, setApproved] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedPatient && (
            <button
              onClick={() => setSelectedPatient(null)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight">{patient.name}</h2>
            <p className="text-sm text-muted-foreground">
              {patient.patientId} · {patient.modality} · {patient.bodyPart} · {patient.date}
            </p>
          </div>
        </div>
        <Badge variant={riskVariant(patient.risk)}>{riskVariant(patient.risk) === "danger" ? "Critical" : "Review"}</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Image viewer */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {tools.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <HeatmapViewer
            image={patient.image}
            boxes={
              patient.bodyPart === "Chest"
                ? [
                    { top: 46, left: 18, width: 26, height: 30, label: patient.findings[0].label, confidence: patient.findings[0].confidence, tone: "danger" },
                    { top: 32, left: 58, width: 20, height: 22, label: "Opacity", confidence: patient.findings[1]?.confidence ?? 80, tone: "warning" },
                  ]
                : [
                    { top: 30, left: 40, width: 24, height: 26, label: patient.findings[0].label, confidence: patient.findings[0].confidence, tone: "danger" },
                  ]
            }
          />
        </div>

        {/* AI findings */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Findings
                </h3>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {patient.findings.map((f) => (
                  <li key={f.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{f.label}</span>
                      <span className="tabular-nums text-muted-foreground">{f.confidence}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${f.confidence}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center p-5">
              <h3 className="mb-2 self-start font-semibold">Risk Score</h3>
              <RiskGauge score={patient.risk} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Structured report */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-primary" /> Structured Diagnostic Report
            </h3>
            <Badge variant="muted">
              <Sparkles className="h-3 w-3" /> AI generated
            </Badge>
          </div>

          <div className="grid gap-5 text-sm leading-relaxed sm:grid-cols-2">
            <ReportBlock title="Summary" body={patient.summary} />
            <ReportBlock title="Findings" body={patient.findings.map((f) => f.label).join("; ") + "."} />
            <ReportBlock title="Comparison" body={patient.comparison} />
            <ReportBlock title="Recommendation" body={patient.recommendation} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-10 px-5"
              onClick={() => setApproved(true)}
              disabled={approved}
              data-icon="inline-start"
            >
              <Check data-icon="inline-start" />
              {approved ? "Approved & Saved" : "Approve & Save"}
            </Button>
            <Button variant="outline" size="lg" className="h-10 px-5" data-icon="inline-start">
              <Share2 data-icon="inline-start" /> Share with departments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-foreground/90">{body}</p>
    </div>
  )
}
