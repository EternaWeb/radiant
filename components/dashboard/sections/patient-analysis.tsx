"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
  Check,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
import { findingsToHeatmapBoxes, formatFindingLabel, formatFindingZone } from "@/lib/lung-zones"
import { useCases } from "@/lib/use-cases"
import type { CaseImageLabel, ClinicalRole } from "@/lib/supabase/types"
import type { CaseRecordView, CaseView } from "@/lib/cases"
import { HeatmapViewer } from "../heatmap-viewer"
import { RiskGauge } from "../risk-gauge"
import { BreadcrumbNav } from "../breadcrumb-nav"
import { CaseTimeline } from "../case-timeline"

const inputClass =
  "h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent-blue"

const textareaClass =
  "min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent-blue"

const imageLabels: CaseImageLabel[] = ["front", "left", "right", "posterior", "lateral", "other"]

type UploadImage = {
  file: File
  label: CaseImageLabel
  labelNote: string
}

type StaffMember = {
  id: string
  name: string
  email: string
  clinicalRole: ClinicalRole
}

type ApiPayload<T> = T & {
  error?: string
  debug?: unknown
}

export function PatientAnalysis() {
  const { selectedCase, selectedRecordId, setSelectedCase, setSelectedRecordId, openCase, isAdmin } = useApp()
  const { cases, loading, error, refresh } = useCases()
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [staff, setStaff] = useState<StaffMember[]>([])

  const activeCase = selectedCase ? cases.find((caseView) => caseView.id === selectedCase.id) ?? selectedCase : null
  const selectedRecord =
    activeCase?.records.find((record) => record.id === selectedRecordId) ?? activeCase?.records.at(-1) ?? null

  useEffect(() => {
    if (!selectedCase) return
    const fresh = cases.find((caseView) => caseView.id === selectedCase.id)
    if (fresh) setSelectedCase(fresh)
  }, [cases, selectedCase, setSelectedCase])

  useEffect(() => {
    if (!isAdmin) return

    async function loadStaff() {
      const response = await fetch("/api/departments")
      const payload = (await response.json()) as {
        departments?: Array<{ staff?: StaffMember[] }>
      }
      const flattened = (payload.departments ?? []).flatMap((department) => department.staff ?? [])
      setStaff(flattened)
    }

    void loadStaff()
  }, [isAdmin])

  async function readPayload<T>(response: Response): Promise<ApiPayload<T>> {
    const text = await response.text()
    if (!text) return {} as ApiPayload<T>

    try {
      return JSON.parse(text) as ApiPayload<T>
    } catch {
      return { error: "API returned a non-JSON response." } as ApiPayload<T>
    }
  }

  async function reloadCase(caseId: string) {
    const response = await fetch(`/api/cases/${caseId}`)
    const payload = await readPayload<{ case?: CaseView }>(response)

    if (response.ok && payload.case) {
      setSelectedCase(payload.case)
    }

    await refresh({ silent: true })
    return payload.case ?? null
  }

  async function analyzeRecord(recordId: string) {
    const response = await fetch(`/api/records/${recordId}/analyze`, { method: "POST" })
    const payload = await readPayload<{ record?: CaseRecordView }>(response)

    if (!response.ok || !payload.record) {
      throw new Error(payload.error ?? "Analysis failed.")
    }

    return payload.record
  }

  return (
    <div className="flex flex-col gap-5">
      <BreadcrumbNav
        items={[
          { label: "Clients", onClick: () => setSelectedCase(null) },
          ...(activeCase
            ? [
                { label: activeCase.client.name, onClick: () => setSelectedRecordId(null) },
                { label: activeCase.title, onClick: () => setSelectedRecordId(null) },
                ...(selectedRecord ? [{ label: `Record #${selectedRecord.recordNumber}` }] : []),
              ]
            : []),
        ]}
      />

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {formError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-5">
          <CreateClientCaseCard
            busy={busy}
            onSubmit={async (form) => {
              setBusy(true)
              setFormError(null)

              try {
                const clientResponse = await fetch("/api/clients", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form.client),
                })
                const clientPayload = await readPayload<{ client?: { id: string } }>(clientResponse)
                if (!clientResponse.ok || !clientPayload.client) {
                  throw new Error(clientPayload.error ?? "Could not create client.")
                }

                const caseResponse = await fetch(`/api/clients/${clientPayload.client.id}/cases`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: form.caseTitle }),
                })
                const casePayload = await readPayload<{ case?: CaseView }>(caseResponse)
                if (!caseResponse.ok || !casePayload.case) {
                  throw new Error(casePayload.error ?? "Could not create case.")
                }

                openCase(casePayload.case)
                await refresh()
              } catch (error) {
                setFormError(error instanceof Error ? error.message : "Could not create client case.")
              } finally {
                setBusy(false)
              }
            }}
          />

          <CaseListCard cases={cases} loading={loading} activeCaseId={activeCase?.id ?? null} onOpen={openCase} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {!activeCase && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Create a client case or select an existing case to review its record timeline.
              </CardContent>
            </Card>
          )}

          {activeCase && (
            <>
              <CaseHeader caseView={activeCase} selectedRecord={selectedRecord} />

              <CaseTimeline
                records={activeCase.records}
                selectedRecordId={selectedRecord?.id ?? null}
                onSelect={setSelectedRecordId}
                onAdd={() => setShowRecordForm(true)}
              />

              {showRecordForm && (
                <AddRecordCard
                  busy={busy}
                  onCancel={() => setShowRecordForm(false)}
                  onSubmit={async ({ notes, clinicalChecks, images }) => {
                    if (images.length === 0) {
                      setFormError("Upload at least one labeled image for this record.")
                      return
                    }

                    setBusy(true)
                    setFormError(null)

                    try {
                      const recordResponse = await fetch(`/api/cases/${activeCase.id}/records`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          notes,
                          clinicalChecks,
                          modality: "xray",
                          bodyPart: "Chest",
                        }),
                      })
                      const recordPayload = await readPayload<{ record?: CaseRecordView }>(recordResponse)
                      if (!recordResponse.ok || !recordPayload.record) {
                        throw new Error(recordPayload.error ?? "Could not create record.")
                      }

                      const imageBody = new FormData()
                      for (const image of images) {
                        imageBody.append("images", image.file)
                      }
                      imageBody.set("labels", JSON.stringify(images.map((image) => image.label)))
                      imageBody.set("labelNotes", JSON.stringify(images.map((image) => image.labelNote)))

                      const imageResponse = await fetch(`/api/records/${recordPayload.record.id}/images`, {
                        method: "POST",
                        body: imageBody,
                      })
                      const imagePayload = await readPayload<{ record?: CaseRecordView }>(imageResponse)
                      if (!imageResponse.ok || !imagePayload.record) {
                        throw new Error(imagePayload.error ?? "Could not upload record images.")
                      }

                      await analyzeRecord(recordPayload.record.id)
                      setSelectedRecordId(recordPayload.record.id)
                      await reloadCase(activeCase.id)
                      setShowRecordForm(false)
                    } catch (error) {
                      setFormError(error instanceof Error ? error.message : "Could not analyze record.")
                      await reloadCase(activeCase.id)
                    } finally {
                      setBusy(false)
                    }
                  }}
                />
              )}

              {isAdmin && (
                <AssignmentCard
                  caseView={activeCase}
                  staff={staff}
                  busy={busy}
                  onAssign={async (profileId) => {
                    setBusy(true)
                    setFormError(null)
                    try {
                      const response = await fetch(`/api/cases/${activeCase.id}/assignments`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ profileId, role: "primary" }),
                      })
                      const payload = await readPayload<{ case?: CaseView }>(response)
                      if (!response.ok || !payload.case) {
                        throw new Error(payload.error ?? "Could not assign doctor.")
                      }
                      setSelectedCase(payload.case)
                      await refresh({ silent: true })
                    } catch (error) {
                      setFormError(error instanceof Error ? error.message : "Could not assign doctor.")
                    } finally {
                      setBusy(false)
                    }
                  }}
                />
              )}

              {selectedRecord && <RecordAnalysis record={selectedRecord} onAnalyze={() => analyzeRecord(selectedRecord.id).then(() => reloadCase(activeCase.id))} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateClientCaseCard({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (form: {
    client: {
      firstName: string
      lastName: string
      dateOfBirth: string
      previousHospitals: string[]
      traumaHistory: string
      notes: string
      firstVisitDate: string
    }
    caseTitle: string
  }) => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [previousHospitals, setPreviousHospitals] = useState("")
  const [traumaHistory, setTraumaHistory] = useState("")
  const [notes, setNotes] = useState("")
  const [firstVisitDate, setFirstVisitDate] = useState("")
  const [caseTitle, setCaseTitle] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      client: {
        firstName,
        lastName,
        dateOfBirth,
        previousHospitals: previousHospitals
          .split(",")
          .map((hospital) => hospital.trim())
          .filter(Boolean),
        traumaHistory,
        notes,
        firstVisitDate,
      },
      caseTitle,
    })
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold">Create client case</h3>
          <p className="text-xs text-muted-foreground">New clients receive an auto-generated AM code.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required className={inputClass} />
            </Field>
            <Field label="Surname">
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} required className={inputClass} />
            </Field>
          </div>
          <Field label="Date of birth">
            <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="First visit date">
            <input type="date" value={firstVisitDate} onChange={(event) => setFirstVisitDate(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Previous hospitals">
            <input value={previousHospitals} onChange={(event) => setPreviousHospitals(event.target.value)} placeholder="City Hospital, General Clinic" className={inputClass} />
          </Field>
          <Field label="Trauma history">
            <textarea value={traumaHistory} onChange={(event) => setTraumaHistory(event.target.value)} className={textareaClass} />
          </Field>
          <Field label="Client notes">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={textareaClass} />
          </Field>
          <Field label="Case title">
            <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} placeholder="Respiratory follow-up" className={inputClass} />
          </Field>
          <Button type="submit" disabled={busy} data-icon="inline-start">
            {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
            Create case
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CaseListCard({
  cases,
  loading,
  activeCaseId,
  onOpen,
}: {
  cases: CaseView[]
  loading: boolean
  activeCaseId: string | null
  onOpen: (caseView: CaseView) => void
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 font-semibold">Open cases</h3>
        <div className="flex flex-col gap-2">
          {cases.map((caseView) => {
            const latest = caseView.records.at(-1)
            return (
              <button
                key={caseView.id}
                type="button"
                onClick={() => onOpen(caseView)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  activeCaseId === caseView.id ? "border-accent-blue bg-accent-blue/10" : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{caseView.client.name}</p>
                  <Badge variant={latest ? riskVariant(latest.risk) : "muted"}>{latest ? `${latest.risk}%` : "No record"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {caseView.client.clientCode} · {caseView.title}
                </p>
              </button>
            )
          })}
          {cases.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {loading ? "Loading cases..." : "No cases created yet."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CaseHeader({ caseView, selectedRecord }: { caseView: CaseView; selectedRecord: CaseRecordView | null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{caseView.client.name}</h2>
        <p className="text-sm text-muted-foreground">
          {caseView.client.clientCode} · Age {caseView.client.age} · {caseView.title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Previous hospitals: {caseView.client.previousHospitals.join(", ") || "None recorded"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={caseView.status === "open" ? "success" : "muted"}>{caseView.status}</Badge>
        {selectedRecord && <Badge variant={riskVariant(selectedRecord.risk)}>{selectedRecord.status}</Badge>}
      </div>
    </div>
  )
}

function AddRecordCard({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (payload: { notes: string; clinicalChecks: Record<string, unknown>; images: UploadImage[] }) => void
  onCancel: () => void
}) {
  const [notes, setNotes] = useState("")
  const [spo2, setSpo2] = useState("")
  const [fever, setFever] = useState(false)
  const [cough, setCough] = useState(false)
  const [shortnessOfBreath, setShortnessOfBreath] = useState(false)
  const [chestPain, setChestPain] = useState(false)
  const [additionalSymptoms, setAdditionalSymptoms] = useState("")
  const [images, setImages] = useState<UploadImage[]>([])

  function setFiles(files: FileList | null) {
    const defaults: CaseImageLabel[] = ["front", "left", "right", "lateral"]
    setImages(
      Array.from(files ?? []).map((file, index) => ({
        file,
        label: defaults[index] ?? "other",
        labelNote: "",
      })),
    )
  }

  function updateImage(index: number, patch: Partial<UploadImage>) {
    setImages((current) => current.map((image, imageIndex) => (imageIndex === index ? { ...image, ...patch } : image)))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      notes,
      clinicalChecks: {
        spo2: spo2 ? Number(spo2) : null,
        fever,
        cough,
        shortnessOfBreath,
        chestPain,
        additionalSymptoms,
      },
      images,
    })
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold">Add new record</h3>
          <p className="text-xs text-muted-foreground">Each record is a fresh AI run with new notes, checks, and labeled images.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Doctor notes">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={textareaClass} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="SpO2">
              <input value={spo2} onChange={(event) => setSpo2(event.target.value)} inputMode="numeric" placeholder="94" className={inputClass} />
            </Field>
            <CheckBox label="Fever" checked={fever} onChange={setFever} />
            <CheckBox label="Cough" checked={cough} onChange={setCough} />
            <CheckBox label="Shortness of breath" checked={shortnessOfBreath} onChange={setShortnessOfBreath} />
            <CheckBox label="Chest pain" checked={chestPain} onChange={setChestPain} />
          </div>

          <Field label="Additional symptoms">
            <input value={additionalSymptoms} onChange={(event) => setAdditionalSymptoms(event.target.value)} placeholder="free-text context" className={inputClass} />
          </Field>

          <div className="rounded-lg border border-border bg-background p-3">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" />
              Select images
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setFiles(event.target.files)} />
            </label>
            <div className="mt-3 flex flex-col gap-2">
              {images.map((image, index) => (
                <div key={`${image.file.name}-${index}`} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_150px_1fr]">
                  <p className="truncate text-sm font-medium">{image.file.name}</p>
                  <select value={image.label} onChange={(event) => updateImage(index, { label: event.target.value as CaseImageLabel })} className={inputClass}>
                    {imageLabels.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input value={image.labelNote} onChange={(event) => updateImage(index, { labelNote: event.target.value })} placeholder="label note" className={inputClass} />
                </div>
              ))}
              {images.length === 0 && <p className="text-sm text-muted-foreground">No images selected yet.</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="accent" disabled={busy} data-icon="inline-start">
              {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
              Add & analyze
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function AssignmentCard({
  caseView,
  staff,
  busy,
  onAssign,
}: {
  caseView: CaseView
  staff: StaffMember[]
  busy: boolean
  onAssign: (profileId: string) => void
}) {
  const assignedIds = new Set(caseView.assignments.map((assignment) => assignment.profileId))
  const available = staff.filter((member) => !assignedIds.has(member.id))
  const [profileId, setProfileId] = useState("")

  useEffect(() => {
    setProfileId(available[0]?.id ?? "")
  }, [available])

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-accent-blue" /> Assigned doctors
          </h3>
          <Badge variant="muted">{caseView.assignments.length} assigned</Badge>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {caseView.assignments.map((assignment) => (
            <Badge key={assignment.id} variant={assignment.assignmentRole === "emergency" ? "danger" : "default"}>
              {assignment.name} · {assignment.assignmentRole}
            </Badge>
          ))}
          {caseView.assignments.length === 0 && <p className="text-sm text-muted-foreground">No doctors assigned yet.</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className={inputClass}>
            {available.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.clinicalRole}
              </option>
            ))}
          </select>
          <Button type="button" disabled={busy || !profileId} onClick={() => onAssign(profileId)}>
            Assign primary
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RecordAnalysis({ record, onAnalyze }: { record: CaseRecordView; onAnalyze: () => Promise<unknown> }) {
  const [approved, setApproved] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const boxes = useMemo(() => findingsToHeatmapBoxes(record.findings), [record.findings])

  async function runAnalyze() {
    setAnalyzing(true)
    try {
      await onAnalyze()
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {record.images.map((image) => (
              <Badge key={image.id} variant="muted">
                {image.label}{image.labelNote ? ` · ${image.labelNote}` : ""}
              </Badge>
            ))}
          </div>
          <HeatmapViewer image={record.image} heatmapImage={record.heatmapImage} boxes={boxes} />
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-accent-blue" /> AI Findings
                </h3>
                {record.rawStatus !== "analyzed" && record.rawStatus !== "critical" && (
                  <Button variant="accent" size="sm" onClick={runAnalyze} disabled={analyzing} data-icon="inline-start">
                    {analyzing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
                    Analyze
                  </Button>
                )}
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {record.findings.length === 0 && (
                  <li className="text-sm text-muted-foreground">Run GPT-4o Vision analysis to generate structured findings and lung-zone overlays.</li>
                )}
                {record.findings.map((finding) => (
                  <li key={`${finding.label}-${finding.zone}`} className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{formatFindingLabel(finding.label)}</span>
                      <span className="tabular-nums text-muted-foreground">{finding.confidence}%</span>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Zone: <span className="font-medium text-foreground/80">{formatFindingZone(finding.zone)}</span>
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-destructive" style={{ width: `${finding.confidence}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center p-5">
              <h3 className="mb-2 self-start font-semibold">Risk Score</h3>
              <RiskGauge score={record.risk} />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                SpO2 {record.clinicalChecks.spo2 ?? "n/a"} · Fever {record.clinicalChecks.fever ? "yes" : "no"} · Cough{" "}
                {record.clinicalChecks.cough ? "yes" : "no"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-accent-blue" /> Structured Diagnostic Report
            </h3>
            <Badge variant="muted">
              <Sparkles className="h-3 w-3" /> AI assisted
            </Badge>
          </div>

          <div className="grid gap-5 text-sm leading-relaxed sm:grid-cols-2">
            <ReportBlock title="Summary" body={record.summary} />
            <ReportBlock
              title="Findings"
              body={
                record.findings
                  .map((finding) => `${formatFindingLabel(finding.label)} (${formatFindingZone(finding.zone)}, ${finding.confidence}%)`)
                  .join("; ") || "Awaiting GPT-4o Vision analysis."
              }
            />
            <ReportBlock title="Timeline comparison" body={record.comparison} />
            <ReportBlock title="Recommendation" body={record.recommendation} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{record.disclaimer}</p>

          <div className="mt-5">
            <Button variant="accent" size="lg" className="h-10 px-5" onClick={() => setApproved(true)} disabled={approved} data-icon="inline-start">
              <Check data-icon="inline-start" />
              {approved ? "Approved & Saved" : "Approve & Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
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

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
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
