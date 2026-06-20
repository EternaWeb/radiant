"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  FilePlus,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { useApp } from "@/lib/app-context"
import { formatFindingLabel, formatFindingZone } from "@/lib/lung-zones"
import { formatClinicalRole } from "@/lib/roles"
import { useCases } from "@/lib/use-cases"
import type { CaseAssignmentRole, CaseImageLabel, ClinicalRole } from "@/lib/supabase/types"
import type { CaseRecordView, CaseView } from "@/lib/cases"
import { BreadcrumbNav } from "../breadcrumb-nav"

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

type ClientSearchResult = CaseView["client"]

type ApiPayload<T> = T & {
  error?: string
  debug?: unknown
}

type DirectoryMember = {
  id: string
  name: string
  avatarUrl: string | null
  role: string
  clinicalRole: ClinicalRole
  email: string
  phone: string
  department: string
}

type DirectoryDepartment = {
  id: string
  name: string
  staff: DirectoryMember[]
}

type DepartmentsResponse = {
  departments?: DirectoryDepartment[]
  error?: string
}

export function PatientAnalysis() {
  const { selectedCase, selectedRecordId, setSelectedCase, setSelectedRecordId, openCase, isAdmin } = useApp()
  const { cases, loading, error, refresh } = useCases()
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showCaseForm, setShowCaseForm] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showAssigneesModal, setShowAssigneesModal] = useState(false)

  const activeCase = selectedCase ? cases.find((caseView) => caseView.id === selectedCase.id) ?? selectedCase : null
  const selectedRecord =
    activeCase?.records.find((record) => record.id === selectedRecordId) ?? activeCase?.records.at(-1) ?? null

  useEffect(() => {
    if (!selectedCase) return
    const fresh = cases.find((caseView) => caseView.id === selectedCase.id)
    if (fresh) setSelectedCase(fresh)
  }, [cases, selectedCase, setSelectedCase])

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

  function downloadReport(record: CaseRecordView) {
    const link = document.createElement("a")
    link.href = `/api/records/${record.id}/report`
    link.download = `radiant-record-${record.recordNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  async function createCase(form: NewCaseFormPayload) {
    setBusy(true)
    setFormError(null)

    try {
      const clientId = form.clientId ?? (await createClientFromForm(form.client)).id
      const caseResponse = await fetch(`/api/clients/${clientId}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.caseTitle }),
      })
      const casePayload = await readPayload<{ case?: CaseView }>(caseResponse)
      if (!caseResponse.ok || !casePayload.case) {
        throw new Error(casePayload.error ?? "Could not create case.")
      }

      openCase(casePayload.case)
      setShowCaseForm(false)
      await refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create case.")
    } finally {
      setBusy(false)
    }
  }

  async function createClientFromForm(client: NewCaseFormPayload["client"]) {
    if (!client) throw new Error("Select a patient or enter patient details.")

    const clientResponse = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    })
    const clientPayload = await readPayload<{ client?: { id: string } }>(clientResponse)
    if (!clientResponse.ok || !clientPayload.client) {
      throw new Error(clientPayload.error ?? "Could not create client.")
    }

    return clientPayload.client
  }

  async function createRecord({ notes, clinicalChecks, images }: { notes: string; clinicalChecks: Record<string, unknown>; images: UploadImage[] }) {
    if (!activeCase) return
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
  }

  async function deleteCase() {
    if (!activeCase) return
    setBusy(true)
    setFormError(null)

    try {
      const response = await fetch(`/api/cases/${activeCase.id}`, { method: "DELETE" })
      const payload = await readPayload<Record<string, never>>(response)
      if (!response.ok) throw new Error(payload.error ?? "Could not delete case.")
      setShowManageModal(false)
      setSelectedCase(null)
      setSelectedRecordId(null)
      await refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not delete case.")
    } finally {
      setBusy(false)
    }
  }

  async function deleteClient() {
    if (!activeCase) return
    setBusy(true)
    setFormError(null)

    try {
      const response = await fetch(`/api/clients/${activeCase.client.id}`, { method: "DELETE" })
      const payload = await readPayload<Record<string, never>>(response)
      if (!response.ok) throw new Error(payload.error ?? "Could not delete client.")
      setShowManageModal(false)
      setSelectedCase(null)
      setSelectedRecordId(null)
      await refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not delete client.")
    } finally {
      setBusy(false)
    }
  }

  async function assignStaff(profileId: string, role: CaseAssignmentRole) {
    if (!activeCase) return
    setBusy(true)
    setFormError(null)

    try {
      const response = await fetch(`/api/cases/${activeCase.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, role }),
      })
      const payload = await readPayload<{ case?: CaseView }>(response)
      if (!response.ok || !payload.case) throw new Error(payload.error ?? "Could not assign staff.")

      setSelectedCase(payload.case)
      await refresh({ silent: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not assign staff.")
    } finally {
      setBusy(false)
    }
  }

  async function removeStaff(profileId: string, role: CaseAssignmentRole) {
    if (!activeCase) return
    setBusy(true)
    setFormError(null)

    try {
      const response = await fetch(`/api/cases/${activeCase.id}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, role }),
      })
      const payload = await readPayload<{ case?: CaseView }>(response)
      if (!response.ok || !payload.case) throw new Error(payload.error ?? "Could not remove staff assignment.")

      setSelectedCase(payload.case)
      await refresh({ silent: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not remove staff assignment.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <BreadcrumbNav
              items={[
                { label: "Cases", icon: FolderOpen, onClick: () => setSelectedCase(null) },
                ...(activeCase
                  ? [
                      { label: activeCase.client.name, icon: UserRound, onClick: () => setSelectedRecordId(null) },
                      { label: activeCase.title, icon: ClipboardList, onClick: () => setSelectedRecordId(null) },
                      ...activeCase.records.map((record) => ({
                        label: `Record #${record.recordNumber}`,
                        icon: FileText,
                        onClick: () => setSelectedRecordId(record.id),
                      })),
                    ]
                  : []),
              ]}
            />
            {activeCase && (
              <Button type="button" variant="accent" onClick={() => setShowRecordForm(true)} data-icon="inline-start">
                <FilePlus data-icon="inline-start" /> Add record
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {!activeCase && (
            <Button type="button" variant="accent" onClick={() => setShowCaseForm(true)} data-icon="inline-start">
              <Plus data-icon="inline-start" /> New Case
            </Button>
          )}
          {activeCase && (
            <>
              <Button type="button" variant="outline" data-icon="inline-start">
                <MessageSquare data-icon="inline-start" /> Comment
              </Button>
              {selectedRecord && (
                <>
                  <Button asChild variant="accent" data-icon="inline-start">
                    <Link href={`/workspace/${selectedRecord.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" /> Open Workspace
                    </Link>
                  </Button>
                  <Button type="button" onClick={() => downloadReport(selectedRecord)} data-icon="inline-start">
                    <Download data-icon="inline-start" /> Report
                  </Button>
                </>
              )}
            </>
          )}
          {activeCase && isAdmin && (
            <Button type="button" variant="outline" size="icon" onClick={() => setShowManageModal(true)} aria-label="Manage case">
              <MoreHorizontal />
            </Button>
          )}
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {formError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}

      {!activeCase && <CaseListCard cases={cases} loading={loading} activeCaseId={null} onOpen={openCase} />}

      {activeCase && (
        <div className="flex min-w-0 flex-col gap-5">
          {selectedRecord ? (
            <RecordAnalysis
              caseView={activeCase}
              record={selectedRecord}
              onAnalyze={() => analyzeRecord(selectedRecord.id).then(() => reloadCase(activeCase.id))}
              onViewAssignees={() => setShowAssigneesModal(true)}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Select a record in the breadcrumb above or create a new record for this case.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showCaseForm && <NewCaseModal busy={busy} onClose={() => setShowCaseForm(false)} onSubmit={createCase} />}
      {activeCase && showRecordForm && (
        <AddRecordModal busy={busy} onCancel={() => setShowRecordForm(false)} onSubmit={createRecord} />
      )}
      {activeCase && showManageModal && (
        <ManageCaseModal
          caseView={activeCase}
          busy={busy}
          onClose={() => setShowManageModal(false)}
          onDeleteCase={deleteCase}
          onDeleteClient={deleteClient}
        />
      )}
      {activeCase && showAssigneesModal && (
        <AssignStaffModal
          caseView={activeCase}
          isAdmin={isAdmin}
          busy={busy}
          onClose={() => setShowAssigneesModal(false)}
          onAssign={assignStaff}
          onRemove={removeStaff}
        />
      )}
    </div>
  )
}

type NewCaseFormPayload = {
  clientId?: string
  client?: {
    firstName: string
    lastName: string
    dateOfBirth: string
    previousHospitals: string[]
    traumaHistory: string
    notes: string
    firstVisitDate: string
  }
  caseTitle: string
}

function NewCaseModal({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean
  onClose: () => void
  onSubmit: (form: NewCaseFormPayload) => void
}) {
  const [patientName, setPatientName] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null)
  const [clients, setClients] = useState<ClientSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [previousHospitals, setPreviousHospitals] = useState("")
  const [traumaHistory, setTraumaHistory] = useState("")
  const [notes, setNotes] = useState("")
  const [firstVisitDate, setFirstVisitDate] = useState("")
  const [caseTitle, setCaseTitle] = useState("")
  const nameParts = patientName.trim().split(/\s+/).filter(Boolean)
  const hasFullName = nameParts.length >= 2

  useEffect(() => {
    if (patientName.trim().length < 2 || selectedClient) {
      setClients([])
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ query: patientName.trim() })
        const response = await fetch(`/api/clients?${params}`, { signal: controller.signal })
        const payload = (await response.json()) as { clients?: ClientSearchResult[] }
        setClients(payload.clients ?? [])
      } catch {
        if (!controller.signal.aborted) setClients([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [patientName, selectedClient])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = caseTitle.trim() || `${selectedClient?.name ?? patientName.trim()} case`

    if (selectedClient) {
      onSubmit({ clientId: selectedClient.id, caseTitle: title })
      return
    }

    if (!hasFullName) return

    const lastName = nameParts.at(-1) ?? ""
    const firstName = nameParts.slice(0, -1).join(" ")
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
      caseTitle: title,
    })
  }

  return (
    <Modal title="New Case" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Patient name or ID
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={patientName}
              onChange={(event) => {
                setPatientName(event.target.value)
                setSelectedClient(null)
              }}
              placeholder="Start typing a patient name..."
              className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          {selectedClient && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-accent-blue/30 bg-accent-blue/10 px-3 py-2 text-sm">
              <span>{selectedClient.name} - {selectedClient.clientCode}</span>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedClient(null)}>
                Change
              </button>
            </div>
          )}
          {!selectedClient && (clients.length > 0 || searching) && (
            <div className="mt-2 rounded-lg border border-border bg-card p-2">
              {searching && <p className="px-2 py-1 text-xs text-muted-foreground">Searching patients...</p>}
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setSelectedClient(client)
                    setPatientName(client.name)
                  }}
                >
                  <span>{client.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{client.clientCode}</span>
                </button>
              ))}
            </div>
          )}
          {!selectedClient && patientName.trim() && !hasFullName && (
            <p className="mt-2 text-xs text-muted-foreground">Enter the full patient name to create a new patient.</p>
          )}
        </div>

        {!selectedClient && hasFullName && (
          <div className="grid gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-2">
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
          </div>
        )}

          <Field label="Case title">
            <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} placeholder="Respiratory follow-up" className={inputClass} />
          </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || (!selectedClient && (!hasFullName || !dateOfBirth))} data-icon="inline-start">
            {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
            Create case
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CaseListCard({
  cases,
  loading,
  activeCaseId,
  onOpen,
  compact = false,
}: {
  cases: CaseView[]
  loading: boolean
  activeCaseId: string | null
  onOpen: (caseView: CaseView) => void
  compact?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">{compact ? "Other cases" : "Cases"}</h3>
          <Badge variant="muted">{cases.length}</Badge>
        </div>
        <div className={compact ? "flex gap-3 overflow-x-auto pb-1" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
          {cases.map((caseView) => {
            const latest = caseView.records.at(-1)
            return (
              <button
                key={caseView.id}
                type="button"
                onClick={() => onOpen(caseView)}
                className={`rounded-xl border bg-card p-4 text-left transition-colors ${
                  activeCaseId === caseView.id ? "border-accent-blue bg-accent-blue/10" : "border-border bg-background hover:bg-muted/50"
                } ${compact ? "min-w-72" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{caseView.client.name}</p>
                  <Badge variant={latest ? riskVariant(latest.risk) : "muted"}>{latest ? `${latest.risk}%` : "No record"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {caseView.client.clientCode} · {caseView.title}
                </p>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {latest?.summary ?? "No record has been added yet."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{caseView.records.length} record{caseView.records.length === 1 ? "" : "s"}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
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

function AddRecordModal({
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
    <Modal title="New Record" onClose={onCancel} wide>
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
    </Modal>
  )
}

function RecordAnalysis({
  caseView,
  record,
  onAnalyze,
  onViewAssignees,
}: {
  caseView: CaseView
  record: CaseRecordView
  onAnalyze: () => Promise<unknown>
  onViewAssignees: () => void
}) {
  const [analyzing, setAnalyzing] = useState(false)
  const [focusedImageId, setFocusedImageId] = useState(record.images[0]?.id ?? null)
  const [expandedImage, setExpandedImage] = useState<CaseRecordView["images"][number] | null>(null)
  const focusedImage = record.images.find((image) => image.id === focusedImageId) ?? record.images[0] ?? null
  const assigned = caseView.assignments.slice(0, 3)
  const symptoms =
    [
      record.clinicalChecks.fever ? "Fever" : null,
      record.clinicalChecks.cough ? "Cough" : null,
      record.clinicalChecks.shortnessOfBreath ? "Shortness of breath" : null,
      record.clinicalChecks.chestPain ? "Chest pain" : null,
      record.clinicalChecks.additionalSymptoms || null,
    ]
      .filter(Boolean)
      .join(", ") || "-"
  const findingsSummary =
    record.findings
      .map((finding) => `${formatFindingLabel(finding.label)} (${formatFindingZone(finding.zone)}, ${finding.confidence}%)`)
      .join("; ") || "Awaiting AI findings."
  const topFinding = record.findings[0]

  useEffect(() => {
    setFocusedImageId(record.images[0]?.id ?? null)
    setExpandedImage(null)
  }, [record.id, record.images])

  async function runAnalyze() {
    setAnalyzing(true)
    try {
      await onAnalyze()
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="rounded-xl bg-[#F4F4F4] p-6 font-mono text-[12px] text-foreground">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3 font-sans">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff assigned</p>
              <p className="text-sm font-semibold">
                {caseView.assignments.length} clinician{caseView.assignments.length === 1 ? "" : "s"} on this case
              </p>
            </div>
            <button type="button" className="text-xs font-medium text-accent-blue hover:text-accent-blue/80" onClick={onViewAssignees}>
              View all
            </button>
          </div>
          <div className="grid max-w-3xl gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {assigned.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                onClick={onViewAssignees}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-white p-3 text-left font-sans transition-colors hover:border-accent-blue/40 hover:bg-accent-blue/5"
              >
                <UserAvatar name={assignment.name} src={assignment.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{assignment.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatClinicalRole(assignment.clinicalRole)} · {assignment.departmentName}
                  </p>
                </div>
              </button>
            ))}
            {assigned.length === 0 && (
              <button
                type="button"
                onClick={onViewAssignees}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-white p-3 text-left font-sans text-muted-foreground transition-colors hover:border-accent-blue/40 hover:text-foreground"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Assign staff to this case</span>
              </button>
            )}
          </div>
        </div>
        {record.rawStatus !== "analyzed" && record.rawStatus !== "critical" && (
          <Button variant="accent" size="sm" onClick={runAnalyze} disabled={analyzing} data-icon="inline-start">
            {analyzing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
            Analyze
          </Button>
        )}
      </div>

      <div className="grid gap-10 xl:grid-cols-[1fr_420px] 2xl:grid-cols-[1fr_520px]">
        <div className="flex flex-col gap-12">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-sans text-xl font-semibold">Details</h3>
              <div className="flex gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <ImageIcon className="h-4 w-4" />
              </div>
            </div>
            <dl className="grid max-w-xl grid-cols-[150px_1fr] gap-x-10 gap-y-3 uppercase">
              <DetailRow label="Patient ID" value={caseView.client.clientCode} />
              <DetailRow label="Patient Name" value={caseView.client.firstName} />
              <DetailRow label="Patient Surname" value={caseView.client.lastName} />
              <DetailRow label="Age" value={String(caseView.client.age)} />
              <DetailRow label="SpO2" value={String(record.clinicalChecks.spo2 ?? "-")} />
              <DetailRow label="Symptoms" value={symptoms} />
            </dl>

            <div className="my-6 h-px max-w-xl bg-foreground/70" />

            <h3 className="mb-4 font-sans text-xl font-semibold">History</h3>
            <dl className="grid max-w-xl grid-cols-[150px_1fr] gap-x-10 gap-y-3 uppercase">
              <DetailRow label="Taken" value={record.date} />
              <DetailRow label="Duration" value={record.date} />
              <DetailRow label="Released" value="-" />
              <DetailRow label="Previous Hospitals" value={caseView.client.previousHospitals.join(", ") || "N/A"} />
              <DetailRow label="Past Trauma" value={caseView.client.traumaHistory || "N/A"} />
            </dl>

            <div className="my-6 h-px max-w-xl bg-foreground/70" />
            <dl className="grid max-w-xl grid-cols-[150px_1fr] gap-x-10 gap-y-3 uppercase">
              <DetailRow label="Last Updated" value={record.date} />
            </dl>
          </section>

          <section className="max-w-4xl font-sans">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI diagnostic draft</p>
                <h3 className="text-2xl font-semibold">Report</h3>
              </div>
              <div className="font-mono text-right text-[10px] uppercase text-muted-foreground">
                <p>Main Model</p>
                <p>{record.date}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ReportStat title="Risk score" value={`${record.risk}%`} detail={record.status} variant={riskVariant(record.risk)} />
              <ReportStat
                title="Top finding"
                value={topFinding ? formatFindingLabel(topFinding.label) : "Pending"}
                detail={topFinding ? `${formatFindingZone(topFinding.zone)} · ${topFinding.confidence}%` : "Awaiting analysis"}
                variant={topFinding ? "default" : "muted"}
              />
              <ReportStat title="Clinical context" value={record.clinicalChecks.spo2 ? `${record.clinicalChecks.spo2}% SpO2` : "No SpO2"} detail={symptoms} variant="muted" />
            </div>

            <div className="mt-4 rounded-2xl border border-accent-blue/20 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-blue" />
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-blue">AI Summary</p>
              </div>
              <p className="max-w-3xl text-lg leading-8 text-foreground">{record.summary}</p>
            </div>

            <div className="mt-4 grid gap-4 text-sm leading-7 md:grid-cols-2">
              <ReportBlock title="Findings" body={findingsSummary} />
              <ReportBlock title="Timeline comparison" body={record.comparison} />
              <ReportBlock title="Recommendation" body={record.recommendation} />
              <ReportBlock title="Review note" body={record.disclaimer} muted />
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase">
            <span>{record.date}</span>
            {focusedImage && (
              <button type="button" onClick={() => setExpandedImage(focusedImage)} aria-label="Maximize image">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-sm bg-white">
            {focusedImage ? (
              <img src={focusedImage.image} alt={`${focusedImage.label} view`} className="aspect-square w-full object-contain" />
            ) : (
              <div className="flex aspect-square items-center justify-center border border-dashed border-border text-muted-foreground">
                No image uploaded
              </div>
            )}
          </div>
          {focusedImage && (
            <p className="w-fit bg-white px-2 py-1 text-[10px] font-semibold uppercase">
              {focusedImage.label} {focusedImage.labelNote ? `- ${focusedImage.labelNote}` : "view"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {record.images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setFocusedImageId(image.id)}
                className={`overflow-hidden rounded-sm border bg-white p-1 text-left transition-colors ${
                  focusedImage?.id === image.id ? "border-accent-blue" : "border-transparent hover:border-border"
                }`}
              >
                <img src={image.image} alt={`${image.label} thumbnail`} className="aspect-square w-full object-cover" />
                <span className="mt-1 inline-block bg-white px-1 text-[10px] font-semibold uppercase">
                  {image.label} view
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {expandedImage && (
        <ImagePreviewModal image={expandedImage} onClose={() => setExpandedImage(null)} />
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[11px] font-semibold">{label}</dt>
      <dd className="text-right text-[11px] font-semibold normal-case">{value}</dd>
    </>
  )
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-label="Close modal" />
      <div className={`relative z-10 max-h-[90svh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ImagePreviewModal({
  image,
  onClose,
}: {
  image: CaseRecordView["images"][number]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
      <button className="absolute right-5 top-5 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose} aria-label="Close image preview">
        <X className="h-5 w-5" />
      </button>
      <div className="flex max-h-full max-w-6xl flex-col gap-3">
        <img src={image.image} alt={`${image.label} enlarged`} className="max-h-[82svh] max-w-full object-contain" />
        <p className="font-mono text-xs uppercase text-white">
          {image.label} {image.labelNote ? `- ${image.labelNote}` : "view"}
        </p>
      </div>
    </div>
  )
}

function AssignStaffModal({
  caseView,
  isAdmin,
  busy,
  onClose,
  onAssign,
  onRemove,
}: {
  caseView: CaseView
  isAdmin: boolean
  busy: boolean
  onClose: () => void
  onAssign: (profileId: string, role: CaseAssignmentRole) => Promise<void>
  onRemove: (profileId: string, role: CaseAssignmentRole) => Promise<void>
}) {
  const [departments, setDepartments] = useState<DirectoryDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState("")
  const [role, setRole] = useState<CaseAssignmentRole>("primary")

  useEffect(() => {
    let cancelled = false

    async function loadStaff() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/departments")
        const payload = (await response.json()) as DepartmentsResponse
        if (!response.ok) throw new Error(payload.error ?? "Could not load staff directory.")
        if (!cancelled) setDepartments(payload.departments ?? [])
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : "Could not load staff directory.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStaff()
    return () => {
      cancelled = true
    }
  }, [])

  const staff = departments
    .flatMap((department) => department.staff.map((member) => ({ ...member, department: member.department || department.name })))
    .filter((member, index, all) => all.findIndex((candidate) => candidate.id === member.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name))

  const assignedKeys = new Set(caseView.assignments.map((assignment) => `${assignment.profileId}:${assignment.assignmentRole}`))
  const selectedAlreadyAssigned = profileId ? assignedKeys.has(`${profileId}:${role}`) : false
  const selectedStaff = staff.find((member) => member.id === profileId)

  async function handleAssign() {
    if (!profileId || selectedAlreadyAssigned) return
    await onAssign(profileId, role)
    setProfileId("")
  }

  return (
    <Modal title="Assigned staff" onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2">
          {caseView.assignments.length > 0 ? (
            caseView.assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <UserAvatar name={assignment.name} src={assignment.avatarUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{assignment.name}</p>
                      <Badge variant={assignment.assignmentRole === "emergency" ? "danger" : "default"}>
                        {assignment.assignmentRole === "emergency" ? "Emergency" : "Primary"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatClinicalRole(assignment.clinicalRole)}</p>
                    <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {assignment.departmentName}
                      </span>
                      {assignment.email && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> {assignment.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => onRemove(assignment.profileId, assignment.assignmentRole)}
                    disabled={busy}
                    data-icon="inline-start"
                  >
                    <Trash2 data-icon="inline-start" /> Remove assignment
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground md:col-span-2">
              No staff are assigned to this case yet.
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="mb-3">
              <h4 className="font-semibold">Add staff</h4>
              <p className="text-sm text-muted-foreground">Choose a member from the hospital directory and assign their case role.</p>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading staff directory...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[1fr_160px_auto]">
                <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className={inputClass}>
                  <option value="">Select staff member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.department} - {member.role}
                    </option>
                  ))}
                </select>
                <select value={role} onChange={(event) => setRole(event.target.value as CaseAssignmentRole)} className={inputClass}>
                  <option value="primary">Primary</option>
                  <option value="emergency">Emergency</option>
                </select>
                <Button
                  type="button"
                  variant="accent"
                  onClick={handleAssign}
                  disabled={!profileId || selectedAlreadyAssigned || busy}
                  data-icon="inline-start"
                >
                  <Plus data-icon="inline-start" /> Add
                </Button>
              </div>
            )}
            {selectedStaff && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-background p-3 text-sm">
                <UserAvatar name={selectedStaff.name} src={selectedStaff.avatarUrl} size="sm" />
                <div>
                  <p className="font-medium">{selectedStaff.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStaff.department} · {selectedStaff.role}
                  </p>
                </div>
              </div>
            )}
            {selectedAlreadyAssigned && (
              <p className="mt-2 text-xs text-muted-foreground">This staff member already has that assignment role.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ManageCaseModal({
  caseView,
  busy,
  onClose,
  onDeleteCase,
  onDeleteClient,
}: {
  caseView: CaseView
  busy: boolean
  onClose: () => void
  onDeleteCase: () => void
  onDeleteClient: () => void
}) {
  return (
    <Modal title="Manage Case" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">{caseView.client.name}</p>
          <p className="mt-1 text-muted-foreground">{caseView.client.clientCode} - {caseView.title}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <h4 className="font-medium text-destructive">Danger zone</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin-only actions. Deleting a client also deletes all of that client's cases and records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={onDeleteCase} disabled={busy} data-icon="inline-start">
              <Trash2 data-icon="inline-start" /> Delete case
            </Button>
            <Button type="button" variant="destructive" onClick={onDeleteClient} disabled={busy} data-icon="inline-start">
              <Trash2 data-icon="inline-start" /> Delete client
            </Button>
          </div>
        </div>
      </div>
    </Modal>
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

function ReportStat({
  title,
  value,
  detail,
  variant,
}: {
  title: string
  value: string
  detail: string
  variant: "default" | "success" | "warning" | "danger" | "muted" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant={variant}>{value}</Badge>
      </div>
      <p className="line-clamp-2 text-sm text-foreground">{detail}</p>
    </div>
  )
}

function ReportBlock({ title, body, muted = false }: { title: string; body: string; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className={muted ? "text-xs leading-6 text-muted-foreground" : "text-foreground/90"}>{body}</p>
    </div>
  )
}
