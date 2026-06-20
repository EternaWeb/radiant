"use client"

import { FileText, ChevronRight, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, riskVariant } from "@/components/ui/badge"
import { patients } from "@/lib/data"
import { useApp } from "@/lib/app-context"

const statusVariant = { Critical: "danger", Pending: "warning", Reviewed: "success" } as const

export function Reports() {
  const { openPatient } = useApp()

  return (
    <div className="flex flex-col gap-4">
      {patients.map((p) => (
        <Card key={p.id} className="transition-colors hover:border-primary/40">
          <CardContent className="flex cursor-pointer items-center gap-4 p-5" onClick={() => openPatient(p)}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{p.name}</p>
                <Badge variant="muted">
                  <Sparkles className="h-3 w-3" /> AI generated
                </Badge>
                <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.summary}</p>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <Badge variant={riskVariant(p.risk)}>{p.risk}%</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
