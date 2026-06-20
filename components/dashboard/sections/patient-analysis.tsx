"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  ArrowLeft,
  Bug,
  Check,
  ClipboardList,
  Contrast,
  FileText,
  Layers,
  Loader2,
  Ruler,
  Share2,
  Sparkles,
  Upload,
  X,
  ZoomIn,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
import { findingsToHeatmapBoxes, formatFindingLabel, formatFindingZone } from "@/lib/lung-zones"
import type { StudyView } from "@/lib/studies"
import { useStudies } from "@/lib/use-studies"
import { HeatmapViewer } from "../heatmap-viewer"
import { RiskGauge } from "../risk-gauge"

const tools = [
  { icon: ZoomIn, label: "Zoom" },
  { icon: Contrast, label: "Contrast" },
  { icon: Layers, label: "Slices" },
  { icon: Ruler, label: "Measure" },
]

const inputClass =
  "h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"

type DebugEntry = {
  id: string
  time: string
  level: "info" | "success" | "warning" | "error"
  title: string
  details?: unknown
}

type ApiPayload = {
  study?: StudyView
  error?: string
  debug?: unknown
}

export function PatientAnalysis() {
  const { selectedPatient, setSelectedPatient } = useApp()
  const { studies, loading, error, refresh } = useStudies()
  const [approved, setApproved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [spo2, setSpo2] = useState("")
  const [fever, setFever] = useState(false)
  const [symptoms, setSymptoms] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([])

  const patient = selectedPatient ?? studies[0] ?? null
  const heatmapBoxes = patient ? findingsToHeatmapBoxes(patient.findings) : []

  useEffect(() => {
    setApproved(false)
  }, [patient?.id])

  function appendDebug(entry: Omit<DebugEntry, "id" | "time">) {
    setDebugEntries((current) => [
      {
        ...entry,
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString(),
      },
      ...current,
    ])
  }

  async function readApiPayload(response: Response): Promise<ApiPayload> {
    const text = await response.text()

    if (!text) {
      return {}
    }

    try {
      return JSON.parse(text) as ApiPayload
    } catch {
      return {
        error: "API returned a non-JSON response.",
        debug: {
          status: response.status,
          statusText: response.statusText,
          body: text.slice(0, 2000),
        },
      }
    }
  }

  async function analyzeStudy(study: StudyView) {
    setAnalyzing(true)
    setFormError(null)
    appendDebug({
      level: "info",
      title: "Analysis request started",
      details: {
        endpoint: `/api/studies/${study.id}/analyze`,
        method: "POST",
        studyId: study.id,
        patientId: study.patientId,
        currentStatus: study.rawStatus,
      },
    })

    const response = await fetch(`/api/studies/${study.id}/analyze`, { method: "POST" })
    const payload = await readApiPayload(response)

    setAnalyzing(false)

    if (!response.ok || !payload.study) {
      setFormError(payload.error ?? "Analysis failed.")
      setDebugOpen(true)
      appendDebug({
        level: "error",
        title: "Analysis request failed",
        details: {
          status: response.status,
          statusText: response.statusText,
          error: payload.error,
          debug: payload.debug,
        },
      })
      return
    }

    appendDebug({
      level: "success",
      title: "Analysis request completed",
      details: {
        status: response.status,
        studyId: payload.study.id,
        risk: payload.study.risk,
        rawStatus: payload.study.rawStatus,
        findings: payload.study.findings,
        zoneOverlayCount: findingsToHeatmapBoxes(payload.study.findings).length,
      },
    })
    setSelectedPatient(payload.study)
    await refresh()
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!file) {
      setFormError("Choose a chest X-ray image first.")
      appendDebug({
        level: "warning",
        title: "Upload blocked",
        details: { reason: "No image file selected." },
      })
      return
    }

    setUploading(true)
    appendDebug({
      level: "info",
      title: "Upload request started",
      details: {
        endpoint: "/api/studies/upload",
        method: "POST",
        patientId,
        patientName,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
        clinicalContext: {
          spo2: spo2 || null,
          fever,
          symptoms: symptoms || null,
        },
      },
    })
    const body = new FormData()
    body.set("image", file)
    body.set("patientId", patientId)
    body.set("patientName", patientName)
    body.set("bodyPart", "Chest")
    body.set("modality", "xray")
    body.set("spo2", spo2)
    body.set("fever", String(fever))
    body.set("symptoms", symptoms)

    const response = await fetch("/api/studies/upload", {
      method: "POST",
      body,
    })
    const payload = await readApiPayload(response)

    setUploading(false)

    if (!response.ok || !payload.study) {
      setFormError(payload.error ?? "Upload failed.")
      setDebugOpen(true)
      appendDebug({
        level: "error",
        title: "Upload request failed",
        details: {
          status: response.status,
          statusText: response.statusText,
          error: payload.error,
          debug: payload.debug,
        },
      })
      return
    }

    appendDebug({
      level: "success",
      title: "Upload request completed",
      details: {
        status: response.status,
        studyId: payload.study.id,
        patientId: payload.study.patientId,
        imageUrlPresent: Boolean(payload.study.image),
      },
    })
    setSelectedPatient(payload.study)
    setFile(null)
    await refresh()
    await analyzeStudy(payload.study)
  }

  return (
    <div className="flex flex-col gap-5">
      <UploadCard
        patientId={patientId}
        patientName={patientName}
        spo2={spo2}
        fever={fever}
        symptoms={symptoms}
        file={file}
        uploading={uploading}
        analyzing={analyzing}
        error={formError}
        debugCount={debugEntries.length}
        onSubmit={handleUpload}
        onPatientIdChange={setPatientId}
        onPatientNameChange={setPatientName}
        onSpo2Change={setSpo2}
        onFeverChange={setFever}
        onSymptomsChange={setSymptoms}
        onFileChange={setFile}
        onDebugOpen={() => setDebugOpen(true)}
      />

      <DebugModal
        open={debugOpen}
        entries={debugEntries}
        onClose={() => setDebugOpen(false)}
        onClear={() => setDebugEntries([])}
      />

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!patient && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {loading ? "Loading studies..." : "Upload a chest X-ray to start AI analysis."}
          </CardContent>
        </Card>
      )}

      {patient && (
        <>
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
            <Badge variant={riskVariant(patient.risk)}>{patient.status}</Badge>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
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
              <HeatmapViewer image={patient.image} heatmapImage={patient.heatmapImage} boxes={heatmapBoxes} />
            </div>

            <div className="flex flex-col gap-5">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Findings
                    </h3>
                    {patient.rawStatus !== "analyzed" && patient.rawStatus !== "critical" && (
                      <Button size="sm" onClick={() => analyzeStudy(patient)} disabled={analyzing} data-icon="inline-start">
                        {analyzing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                        Analyze
                      </Button>
                    )}
                  </div>
                  <ul className="mt-4 flex flex-col gap-3">
                    {patient.findings.length === 0 && (
                      <li className="text-sm text-muted-foreground">Run GPT-4o Vision analysis to generate structured findings and lung-zone overlays.</li>
                    )}
                    {patient.findings.map((f) => (
                      <li key={`${f.label}-${f.zone}`} className="rounded-lg border border-border bg-background p-3">
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">{formatFindingLabel(f.label)}</span>
                          <span className="tabular-nums text-muted-foreground">{f.confidence}%</span>
                        </div>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Zone: <span className="font-medium text-foreground/80">{formatFindingZone(f.zone)}</span>
                        </p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-destructive" style={{ width: `${f.confidence}%` }} />
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
                  {patient.clinicalContext && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Clinical modifiers: SpO2 {patient.clinicalContext.spo2 ?? "n/a"} · Fever{" "}
                      {patient.clinicalContext.fever ? "yes" : "no"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> Structured Diagnostic Report
                </h3>
                <Badge variant="muted">
                  <Sparkles className="h-3 w-3" /> AI assisted
                </Badge>
              </div>

              <div className="grid gap-5 text-sm leading-relaxed sm:grid-cols-2">
                <ReportBlock title="Summary" body={patient.summary} />
                <ReportBlock
                  title="Findings"
                  body={
                    patient.findings
                      .map((f) => `${formatFindingLabel(f.label)} (${formatFindingZone(f.zone)}, ${f.confidence}%)`)
                      .join("; ") || "Awaiting GPT-4o Vision analysis."
                  }
                />
                <ReportBlock title="Comparison" body={patient.comparison} />
                <ReportBlock title="Recommendation" body={patient.recommendation} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{patient.disclaimer}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="lg" className="h-10 px-5" onClick={() => setApproved(true)} disabled={approved} data-icon="inline-start">
                  <Check data-icon="inline-start" />
                  {approved ? "Approved & Saved" : "Approve & Save"}
                </Button>
                <Button variant="outline" size="lg" className="h-10 px-5" data-icon="inline-start">
                  <Share2 data-icon="inline-start" /> Share with departments
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function UploadCard({
  patientId,
  patientName,
  spo2,
  fever,
  symptoms,
  file,
  uploading,
  analyzing,
  error,
  debugCount,
  onSubmit,
  onPatientIdChange,
  onPatientNameChange,
  onSpo2Change,
  onFeverChange,
  onSymptomsChange,
  onFileChange,
  onDebugOpen,
}: {
  patientId: string
  patientName: string
  spo2: string
  fever: boolean
  symptoms: string
  file: File | null
  uploading: boolean
  analyzing: boolean
  error: string | null
  debugCount: number
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPatientIdChange: (value: string) => void
  onPatientNameChange: (value: string) => void
  onSpo2Change: (value: string) => void
  onFeverChange: (value: boolean) => void
  onSymptomsChange: (value: string) => void
  onFileChange: (value: File | null) => void
  onDebugOpen: () => void
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Upload & GPT-4o Vision Analysis</h3>
            <p className="text-xs text-muted-foreground">Uploads are archived in PACS, analyzed by GPT-4o Vision, and rendered as zone-aware decision support.</p>
          </div>
          <Button type="button" variant="outline" onClick={onDebugOpen} data-icon="inline-start">
            <Bug data-icon="inline-start" />
            Debug
            {debugCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {debugCount}
              </span>
            )}
          </Button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_120px_1.2fr_auto] lg:items-end">
          <Field label="Patient ID">
            <input value={patientId} onChange={(event) => onPatientIdChange(event.target.value)} required placeholder="PT-10421" className={inputClass} />
          </Field>
          <Field label="Patient name">
            <input value={patientName} onChange={(event) => onPatientNameChange(event.target.value)} required placeholder="Patient name" className={inputClass} />
          </Field>
          <Field label="SpO2">
            <input value={spo2} onChange={(event) => onSpo2Change(event.target.value)} inputMode="numeric" placeholder="94" className={inputClass} />
          </Field>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
            <input type="checkbox" checked={fever} onChange={(event) => onFeverChange(event.target.checked)} />
            Fever
          </label>
          <Field label="Symptoms">
            <input value={symptoms} onChange={(event) => onSymptomsChange(event.target.value)} placeholder="fever, cough" className={inputClass} />
          </Field>
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" />
              {file ? "Selected" : "Image"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
            </label>
            <Button type="submit" disabled={uploading || analyzing} data-icon="inline-start">
              {uploading || analyzing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
              {uploading ? "Uploading" : analyzing ? "Analyzing" : "Upload & analyze"}
            </Button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

function DebugModal({
  open,
  entries,
  onClose,
  onClear,
}: {
  open: boolean
  entries: DebugEntry[]
  onClose: () => void
  onClear: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const serialized = JSON.stringify(entries, null, 2)

  async function copyDebugLog() {
    await navigator.clipboard.writeText(serialized)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Bug className="h-5 w-5 text-primary" /> AI Pipeline Debug
            </h2>
            <p className="text-sm text-muted-foreground">
              Send the latest failed entry when you share the errors. No API keys are logged here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copyDebugLog} data-icon="inline-start">
              <ClipboardList data-icon="inline-start" />
              {copied ? "Copied" : "Copy log"}
            </Button>
            <Button type="button" variant="outline" onClick={onClear}>
              Clear
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[340px_1fr]">
          <div className="overflow-y-auto border-b border-border p-4 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline ({entries.length})
            </p>
            {entries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No debug events yet. Upload or analyze a study to populate this log.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          entry.level === "error"
                            ? "bg-destructive/15 text-destructive"
                            : entry.level === "success"
                              ? "bg-success/15 text-success"
                              : entry.level === "warning"
                                ? "bg-warning/15 text-warning"
                                : "bg-primary/15 text-primary"
                        }`}
                      >
                        {entry.level}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.time}</span>
                    </div>
                    <p className="text-sm font-semibold">{entry.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto bg-black p-4 text-xs text-green-100">
            <pre className="whitespace-pre-wrap break-words">{serialized || "[]"}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      {children}
    </label>
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
