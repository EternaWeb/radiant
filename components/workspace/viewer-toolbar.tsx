"use client"

import Link from "next/link"
import { ArrowLeft, Download, Minus, Plus, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CaseRecordView, CaseView } from "@/lib/cases"
import type { ViewerControlsState } from "@/lib/viewer-utils"

type ViewerToolbarProps = {
  caseView: CaseView
  record: CaseRecordView
  controls: ViewerControlsState
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFitZoom: () => void
  onPatch: (partial: Partial<ViewerControlsState>) => void
  onDownloadReport: () => void
  onShareClick: () => void
  isDemoOverlay?: boolean
}

export function ViewerToolbar({
  caseView,
  record,
  controls,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitZoom,
  onPatch,
  onDownloadReport,
  onShareClick,
  isDemoOverlay = false,
}: ViewerToolbarProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/workspace/${record.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Workspace
          </Link>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{caseView.client.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {record.modality} · {record.bodyPart} · Record #{record.recordNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDownloadReport} data-icon="inline-start">
            <Download data-icon="inline-start" />
            Report
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onShareClick} data-icon="inline-start">
            <Share2 data-icon="inline-start" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border px-4 py-2.5 text-sm sm:px-5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Zoom</span>
          <Button type="button" variant="outline" size="icon-sm" onClick={onZoomOut} aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <button type="button" className="min-w-14 font-mono text-xs tabular-nums" onClick={onResetZoom}>
            {Math.round(controls.zoom * 100)}%
          </button>
          <Button type="button" variant="outline" size="icon-sm" onClick={onZoomIn} aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onFitZoom}>
            Fit
          </Button>
        </div>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={controls.showAiFindings}
            onChange={(event) => onPatch({ showAiFindings: event.target.checked })}
            className="rounded border-border"
          />
          <span className="text-xs">AI Findings</span>
          {isDemoOverlay && <span className="text-[10px] uppercase tracking-wide text-amber-600">Demo</span>}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={controls.showHeatmap}
            onChange={(event) => onPatch({ showHeatmap: event.target.checked })}
            className="rounded border-border"
          />
          <span className="text-xs">Heatmap</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={controls.showPreviousStudy}
            onChange={(event) => onPatch({ showPreviousStudy: event.target.checked })}
            className="rounded border-border"
          />
          <span className="text-xs">Previous Study</span>
        </label>

        <label className="flex min-w-40 flex-1 items-center gap-2">
          <span className="text-xs text-muted-foreground">Brightness</span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={controls.brightness}
            onChange={(event) => onPatch({ brightness: Number(event.target.value) })}
            className="flex-1"
          />
        </label>
        <label className="flex min-w-40 flex-1 items-center gap-2">
          <span className="text-xs text-muted-foreground">Contrast</span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={controls.contrast}
            onChange={(event) => onPatch({ contrast: Number(event.target.value) })}
            className="flex-1"
          />
        </label>
      </div>
    </div>
  )
}
