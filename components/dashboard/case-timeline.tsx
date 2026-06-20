"use client"

import { Plus } from "lucide-react"
import { Badge, riskVariant } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CaseRecordView } from "@/lib/cases"

export function CaseTimeline({
  records,
  selectedRecordId,
  onSelect,
  onAdd,
}: {
  records: CaseRecordView[]
  selectedRecordId: string | null
  onSelect: (recordId: string) => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case timeline</p>
          <h3 className="font-semibold">{records.length} record{records.length === 1 ? "" : "s"}</h3>
        </div>
        <Button type="button" size="sm" onClick={onAdd} data-icon="inline-start">
          <Plus data-icon="inline-start" />
          Add record
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {records.map((record) => {
          const active = record.id === selectedRecordId
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              className={`min-w-56 rounded-lg border p-3 text-left transition-colors ${
                active ? "border-accent-blue bg-accent-blue/10" : "border-border bg-background hover:bg-muted/50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">Record #{record.recordNumber}</span>
                <Badge variant={riskVariant(record.risk)}>{record.risk}%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{record.date}</p>
              <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{record.summary}</p>
            </button>
          )
        })}
        {records.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            No timeline records yet. Add the first record to upload labeled images and run AI.
          </div>
        )}
      </div>
    </div>
  )
}
