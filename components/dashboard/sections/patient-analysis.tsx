"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowLeft, Check, Contrast, FileText, Layers, Loader2, Ruler, Share2, Sparkles, Upload, ZoomIn } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
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

  const patient = selectedPatient ?? studies[0] ?? null

  useEffect(() => {
    setApproved(false)
  }, [patient?.id])

  async function analyzeStudy(study: StudyView) {
    setAnalyzing(true)
    setFormError(null)

    const response = await fetch(`/api/studies/${study.id}/analyze`, { method: "POST" })
    const payload = (await response.json()) as { study?: StudyView; error?: string }

    setAnalyzing(false)

    if (!response.ok || !payload.study) {
      setFormError(payload.error ?? "Analysis failed.")
      return
    }

    setSelectedPatient(payload.study)
    await refresh()
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!file) {
      setFormError("Choose a chest X-ray image first.")
      return
    }

    setUploading(true)
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
    const payload = (await response.json()) as { study?: StudyView; error?: string }

    setUploading(false)

    if (!response.ok || !payload.study) {
      setFormError(payload.error ?? "Upload failed.")
      return
    }

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
        onSubmit={handleUpload}
        onPatientIdChange={setPatientId}
        onPatientNameChange={setPatientName}
        onSpo2Change={setSpo2}
        onFeverChange={setFever}
        onSymptomsChange={setSymptoms}
        onFileChange={setFile}
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
              <HeatmapViewer image={patient.image} heatmapImage={patient.heatmapImage} />
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
                      <li className="text-sm text-muted-foreground">Run analysis to generate multi-label probabilities.</li>
                    )}
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
                <ReportBlock title="Findings" body={patient.findings.map((f) => f.label).join("; ") || "Awaiting analysis."} />
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
  onSubmit,
  onPatientIdChange,
  onPatientNameChange,
  onSpo2Change,
  onFeverChange,
  onSymptomsChange,
  onFileChange,
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPatientIdChange: (value: string) => void
  onPatientNameChange: (value: string) => void
  onSpo2Change: (value: string) => void
  onFeverChange: (value: boolean) => void
  onSymptomsChange: (value: string) => void
  onFileChange: (value: File | null) => void
}) {
  return (
    <Card>
      <CardContent className="p-5">
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
