"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, Download, Loader2, Share2, Sparkles } from "lucide-react"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CaseTimeline } from "@/components/dashboard/case-timeline"
import { HeatmapViewer } from "@/components/dashboard/heatmap-viewer"
import { RiskGauge } from "@/components/dashboard/risk-gauge"
import { WorkspaceChrome } from "@/components/workspace/workspace-chrome"
import { formatFindingLabel, findingsToGradientLayers, findingsToHeatmapBoxes } from "@/lib/lung-zones"
import { resolveOverlayFindings } from "@/lib/overlay-findings"
import { loadDepartmentsCached } from "@/lib/use-departments"
import { useWorkspaceRecord } from "@/lib/use-workspace-record"
import { useAlerts } from "@/lib/use-studies"
import { confidenceLabel } from "@/lib/viewer-utils"

type DepartmentOption = { id: string; name: string }

export function ClinicalWorkspace({ recordId }: { recordId: string }) {
  const router = useRouter()
  const { caseView, record, loading, error } = useWorkspaceRecord(recordId)
  const { alerts } = useAlerts()
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("")
  const [shareBusy, setShareBusy] = useState(false)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false)

  const caseAlerts = useMemo(() => {
    if (!caseView || !record) return []
    return alerts.filter((alert) => alert.caseId === caseView.id || alert.recordId === record.id)
  }, [alerts, caseView, record])

  const uniqueDepartments = useMemo(() => {
    if (!caseView) return []
    const names = new Map<string, string>()
    for (const assignment of caseView.assignments) {
      if (assignment.departmentId) {
        names.set(assignment.departmentId, assignment.departmentName)
      }
    }
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }))
  }, [caseView])

  const overlaySource = useMemo(() => (record ? resolveOverlayFindings(record) : { findings: [], isDemo: false }), [record])
  const overlayBoxes = useMemo(() => findingsToHeatmapBoxes(overlaySource.findings), [overlaySource.findings])
  const overlayGradients = useMemo(() => findingsToGradientLayers(overlaySource.findings), [overlaySource.findings])

  async function loadDepartments() {
    if (departmentsLoaded) return
    const payload = await loadDepartmentsCached()
    setDepartments(payload.departments ?? [])
    setDepartmentsLoaded(true)
  }

  async function shareWithDepartment() {
    if (!caseView || !selectedDepartmentId) return
    setShareBusy(true)
    setShareMessage(null)

    try {
      const response = await fetch(`/api/cases/${caseView.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: selectedDepartmentId }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not share case.")
      }
      const departmentName = departments.find((department) => department.id === selectedDepartmentId)?.name ?? "department"
      setShareMessage(`Shared with ${departmentName}.`)
    } catch (shareError) {
      setShareMessage(shareError instanceof Error ? shareError.message : "Could not share case.")
    } finally {
      setShareBusy(false)
    }
  }

  function downloadReport() {
    if (!record) return
    const link = document.createElement("a")
    link.href = `/api/records/${record.id}/report`
    link.download = `radiant-record-${record.recordNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !caseView || !record) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold">Workspace unavailable</p>
        <p className="max-w-md text-sm text-muted-foreground">{error ?? "Record not found or access denied."}</p>
        <Button asChild variant="outline">
          <Link href="/">Return to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <WorkspaceChrome
        caseView={caseView}
        record={record}
        primaryAction={{ href: `/workspace/viewer/${record.id}`, label: "Open Viewer" }}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</p>
                  <h1 className="mt-1 text-2xl font-bold">{caseView.client.name}</h1>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Patient ID</dt>
                      <dd className="font-medium">{caseView.client.clientCode}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Age</dt>
                      <dd className="font-medium">{caseView.client.age}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">DOB</dt>
                      <dd className="font-medium">{caseView.client.dateOfBirth}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Study</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {record.modality} · {record.bodyPart}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{record.date}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Badge variant={riskVariant(record.risk)}>
                      {record.riskLevel?.toUpperCase() ?? "PENDING"} ({record.risk}%)
                    </Badge>
                    <Badge variant="muted">{record.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">AI overlay preview</h3>
                  {overlaySource.isDemo && (
                    <Badge variant="warning" className="text-[10px] uppercase">
                      Demo
                    </Badge>
                  )}
                </div>
                <HeatmapViewer
                  image={record.image}
                  boxes={overlayBoxes}
                  gradients={overlayGradients}
                  isDemo={overlaySource.isDemo}
                  imageClassName="block max-h-72 w-full object-contain select-none"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-blue" />
                  <h3 className="font-semibold">AI Findings</h3>
                </div>
                {record.findings.length > 0 ? (
                  <ul className="space-y-3">
                    {record.findings.map((finding, index) => (
                      <li
                        key={`${finding.label}-${finding.zone}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{formatFindingLabel(finding.label)}</p>
                          <p className="text-xs text-muted-foreground">{confidenceLabel(finding.confidence)}</p>
                        </div>
                        <span className="font-mono text-lg font-semibold tabular-nums">{finding.confidence}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Awaiting AI analysis for this record.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-3 font-semibold">Assigned departments</h3>
                {uniqueDepartments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {uniqueDepartments.map((department) => (
                      <span
                        key={department.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-sm text-success"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {department.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No departments assigned yet.</p>
                )}
              </CardContent>
            </Card>

            {caseAlerts.length > 0 && (
              <Card className="border-destructive/30">
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <h3 className="font-semibold">Active alerts</h3>
                  </div>
                  <ul className="space-y-2">
                    {caseAlerts.map((alert) => (
                      <li key={alert.id} className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-muted-foreground">
                          Risk {alert.risk}% · {alert.time}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-3 font-semibold">Report preview</h3>
                <div className="space-y-4 text-sm leading-relaxed">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                    <p>{record.summary}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comparison</p>
                    <p>{record.comparison}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</p>
                    <p>{record.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk score</p>
                <RiskGauge score={record.risk} size={180} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  <h3 className="font-semibold">Share with department</h3>
                </div>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={selectedDepartmentId}
                  onFocus={() => void loadDepartments()}
                  onChange={(event) => setSelectedDepartmentId(event.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!selectedDepartmentId || shareBusy}
                  onClick={() => void shareWithDepartment()}
                >
                  {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share case"}
                </Button>
                {shareMessage && <p className="text-xs text-muted-foreground">{shareMessage}</p>}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button asChild variant="accent" size="lg">
                <Link href={`/workspace/viewer/${record.id}`}>Open Viewer</Link>
              </Button>
              <Button type="button" variant="outline" onClick={downloadReport} data-icon="inline-start">
                <Download data-icon="inline-start" />
                Download report
              </Button>
            </div>
          </aside>
        </div>

        <CaseTimeline
          records={caseView.records}
          selectedRecordId={record.id}
          onSelect={(nextRecordId) => router.push(`/workspace/${nextRecordId}`)}
          showAddButton={false}
        />
      </main>
    </div>
  )
}
