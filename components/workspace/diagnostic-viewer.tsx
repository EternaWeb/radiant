"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CaseTimeline } from "@/components/dashboard/case-timeline"
import { DiagnosticImageViewer } from "@/components/workspace/diagnostic-image-viewer"
import { ViewerToolbar } from "@/components/workspace/viewer-toolbar"
import { formatFindingLabel, formatFindingZone, findingsToGradientLayers, findingsToHeatmapBoxes } from "@/lib/lung-zones"
import { useWorkspaceRecord } from "@/lib/use-workspace-record"
import { confidenceLabel, priorRecordImage, useViewerControls } from "@/lib/viewer-utils"

type SidebarTab = "findings" | "report" | "history" | "analysis"

export function DiagnosticViewer({ recordId }: { recordId: string }) {
  const router = useRouter()
  const { caseView, record, loading, error } = useWorkspaceRecord(recordId)
  const [activeTab, setActiveTab] = useState<SidebarTab>("findings")
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("")
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const {
    controls,
    zoomIn,
    zoomOut,
    resetZoom,
    fitZoom,
    patch,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useViewerControls()

  const boxes = useMemo(() => (record ? findingsToHeatmapBoxes(record.findings) : []), [record])
  const gradients = useMemo(() => (record ? findingsToGradientLayers(record.findings) : []), [record])
  const previousStudyImage = useMemo(
    () => (caseView && record ? priorRecordImage(caseView.records, record.recordNumber) : null),
    [caseView, record],
  )
  const focusedImage = record?.images[0]?.image ?? record?.image ?? "/placeholder.svg"

  function downloadReport() {
    if (!record) return
    const link = document.createElement("a")
    link.href = `/api/records/${record.id}/report`
    link.download = `radiant-record-${record.recordNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  async function loadDepartments() {
    if (departments.length > 0) return
    const response = await fetch("/api/departments")
    const payload = (await response.json()) as { departments?: { id: string; name: string }[] }
    setDepartments(payload.departments ?? [])
  }

  async function shareCase() {
    if (!caseView || !selectedDepartmentId) return
    const response = await fetch(`/api/cases/${caseView.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId: selectedDepartmentId }),
    })
    const payload = (await response.json()) as { error?: string }
    if (!response.ok) {
      setShareMessage(payload.error ?? "Could not share case.")
      return
    }
    setShareMessage("Case shared successfully.")
  }

  function selectFinding(findingId: string) {
    setHighlightedFindingId(findingId)
    setActiveTab("report")
    window.requestAnimationFrame(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !caseView || !record) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold">Viewer unavailable</p>
        <p className="max-w-md text-sm text-muted-foreground">{error ?? "Record not found or access denied."}</p>
        <Button asChild variant="outline">
          <Link href="/">Return to dashboard</Link>
        </Button>
      </div>
    )
  }

  const symptoms =
    [
      record.clinicalChecks.fever ? "Fever" : null,
      record.clinicalChecks.cough ? "Cough" : null,
      record.clinicalChecks.shortnessOfBreath ? "Shortness of breath" : null,
      record.clinicalChecks.chestPain ? "Chest pain" : null,
      record.clinicalChecks.additionalSymptoms || null,
    ]
      .filter(Boolean)
      .join(", ") || "None reported"

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: "findings", label: "AI Findings" },
    { id: "report", label: "Report" },
    { id: "history", label: "History" },
    { id: "analysis", label: "AI Analysis" },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ViewerToolbar
        caseView={caseView}
        record={record}
        controls={controls}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitZoom={fitZoom}
        onPatch={patch}
        onDownloadReport={downloadReport}
        onShareClick={() => {
          setShareOpen((open) => !open)
          void loadDepartments()
        }}
      />

      {shareOpen && (
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={selectedDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" disabled={!selectedDepartmentId} onClick={() => void shareCase()}>
              Share
            </Button>
            {shareMessage && <span className="text-xs text-muted-foreground">{shareMessage}</span>}
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors sm:text-xs ${
                  activeTab === tab.id ? "border-b-2 border-accent-blue text-accent-blue" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[min(72vh,820px)] flex-1 overflow-y-auto p-4">
            {activeTab === "findings" && (
              <div className="space-y-3">
                {boxes.length > 0 ? (
                  boxes.map((box) => {
                    const active = highlightedFindingId === box.id
                    return (
                      <button
                        key={box.id}
                        type="button"
                        onClick={() => selectFinding(box.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          active ? "border-accent-blue bg-accent-blue/10" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{box.label}</p>
                            <p className="text-xs text-muted-foreground">{box.zoneLabel}</p>
                          </div>
                          <Badge variant={riskVariant(box.confidence)}>{box.confidence}%</Badge>
                        </div>
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {confidenceLabel(box.confidence)}
                        </p>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No AI findings yet. Run analysis from the dashboard.</p>
                )}
              </div>
            )}

            {activeTab === "report" && (
              <div ref={reportRef} className="space-y-4 text-sm leading-relaxed">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                  <p>{record.summary}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Findings detail</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {record.findings.map((finding, index) => (
                      <li key={`${finding.label}-${index}`}>
                        {formatFindingLabel(finding.label)} — {finding.confidence}% ({formatFindingZone(finding.zone)})
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comparison</p>
                  <p>{record.comparison}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</p>
                  <p>{record.recommendation}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disclaimer</p>
                  <p className="text-muted-foreground">{record.disclaimer}</p>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Patient</dt>
                  <dd className="font-medium">{caseView.client.name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">SpO2</dt>
                  <dd>{record.clinicalChecks.spo2 ?? "-"}%</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Symptoms</dt>
                  <dd>{symptoms}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Previous hospitals</dt>
                  <dd>{caseView.client.previousHospitals.join(", ") || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Trauma history</dt>
                  <dd>{caseView.client.traumaHistory || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Study date</dt>
                  <dd>{record.date}</dd>
                </div>
              </dl>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-2 text-accent-blue">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-semibold">GPT Vision Analysis</span>
                </div>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">{record.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Risk score</dt>
                    <dd className="font-medium">{record.risk}%</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Findings count</dt>
                    <dd className="font-medium">{record.findings.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Images</dt>
                    <dd className="font-medium">{record.images.length}</dd>
                  </div>
                </dl>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Overlays are generated from GPT lung-zone annotations. Heatmap gradients visualize confidence-weighted regions for
                  decision support — not pixel-level Grad-CAM output.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-[420px] flex-col bg-[#0a0a0a] p-3 sm:p-4">
          <DiagnosticImageViewer
            image={focusedImage}
            previousStudyImage={previousStudyImage}
            boxes={boxes}
            gradients={gradients}
            controls={controls}
            highlightedFindingId={highlightedFindingId}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onFindingClick={selectFinding}
          />
        </div>
      </div>

      <div className="border-t border-border bg-background p-3 sm:p-4">
        <CaseTimeline
          records={caseView.records}
          selectedRecordId={record.id}
          onSelect={(nextRecordId) => router.push(`/workspace/viewer/${nextRecordId}`)}
          showAddButton={false}
        />
      </div>
    </div>
  )
}
