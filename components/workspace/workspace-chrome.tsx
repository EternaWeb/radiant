"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CaseRecordView, CaseView } from "@/lib/cases"

export function WorkspaceChrome({
  caseView,
  record,
  backHref = "/",
  backLabel = "Back to dashboard",
  primaryAction,
}: {
  caseView: CaseView
  record: CaseRecordView
  backHref?: string
  backLabel?: string
  primaryAction?: { href: string; label: string }
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="hidden h-5 w-px bg-border sm:block" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{caseView.client.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {record.modality} · {record.bodyPart} · Record #{record.recordNumber}
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          {caseView.title}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:inline">
          Radiant Clinical Workspace
        </span>
        {primaryAction && (
          <Button asChild variant="accent" size="sm" data-icon="inline-start">
            <Link href={primaryAction.href}>
              <ExternalLink data-icon="inline-start" />
              {primaryAction.label}
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
