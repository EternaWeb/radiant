"use client"

import { useState } from "react"
import { Search, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { useApp } from "@/lib/app-context"
import { formatFindingLabel, formatFindingZone } from "@/lib/lung-zones"
import { useCases } from "@/lib/use-cases"

const filters = ["All", "X-Ray", "MRI", "CT", "Ultrasound"] as const

const statusVariant = { Critical: "danger", Pending: "warning", Reviewed: "success" } as const

export function PacsArchive() {
  const { openCase } = useApp()
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  const [query, setQuery] = useState("")
  const { cases, loading, error } = useCases(query)

  const rows = cases
    .map((caseView) => ({ caseView, record: caseView.records.at(-1) }))
    .filter(({ record }) => {
    const matchFilter = filter === "All" || record?.modality === filter
    return matchFilter
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient or ID…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 lg:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Patient ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Modality</th>
                  <th className="px-5 py-3 font-medium">Top finding</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ caseView, record }) => (
                  <tr
                    key={caseView.id}
                    onClick={() => openCase(caseView, record?.id)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{caseView.client.clientCode}</td>
                    <td className="px-5 py-3.5 font-medium">{caseView.client.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{record?.date ?? "No record"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{record?.modality ?? "X-Ray"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {record?.findings[0]
                        ? `${formatFindingLabel(record.findings[0].label)} · ${formatFindingZone(record.findings[0].zone)}`
                        : "Awaiting analysis"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={riskVariant(record?.risk ?? 0)}>{record?.risk ?? 0}%</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant[record?.status ?? "Pending"]}>{record?.status ?? "Pending"}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                      {loading ? "Loading studies..." : "No studies match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
