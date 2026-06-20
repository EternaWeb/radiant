"use client"

import { FileText, ChevronRight, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { useApp } from "@/lib/app-context"
import { formatFindingLabel, formatFindingZone } from "@/lib/lung-zones"
import { useCases } from "@/lib/use-cases"

const statusVariant = { Critical: "danger", Pending: "warning", Reviewed: "success" } as const

export function Reports() {
  const { openCase } = useApp()
  const { cases, loading, error } = useCases()
  const rows = cases.map((caseView) => ({ caseView, record: caseView.records.at(-1) }))

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {rows.map(({ caseView, record }) => (
        <Card key={caseView.id} className="transition-colors hover:border-accent-blue/40">
          <CardContent className="flex cursor-pointer items-center gap-4 p-5" onClick={() => openCase(caseView, record?.id)}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-accent-blue">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{caseView.client.name}</p>
                <Badge variant="muted">
                  <Sparkles className="h-3 w-3" /> AI generated
                </Badge>
                <Badge variant={statusVariant[record?.status ?? "Pending"]}>{record?.status ?? "Pending"}</Badge>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{record?.summary ?? "No record report yet."}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {record?.findings[0]
                  ? `Top zone: ${formatFindingLabel(record.findings[0].label)} in ${formatFindingZone(record.findings[0].zone)}`
                  : "Awaiting GPT-4o Vision findings"}
              </p>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <Badge variant={riskVariant(record?.risk ?? 0)}>{record?.risk ?? 0}%</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
      {rows.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {loading ? "Loading reports..." : "No reports have been generated yet."}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
