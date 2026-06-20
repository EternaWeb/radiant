"use client"

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW"

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 80) return "HIGH"
  if (confidence >= 60) return "MEDIUM"
  return "LOW"
}

export function confidenceLabel(confidence: number) {
  return `${confidenceTier(confidence)} CONFIDENCE`
}

export function findingKey(label: string, zone: string, index: number) {
  return `${label}-${zone}-${index}`
}

export type ViewerControlsState = {
  zoom: number
  panX: number
  panY: number
  brightness: number
  contrast: number
  showAiFindings: boolean
  showHeatmap: boolean
  showPreviousStudy: boolean
}

const defaultControls: ViewerControlsState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  brightness: 1,
  contrast: 1,
  showAiFindings: true,
  showHeatmap: true,
  showPreviousStudy: false,
}

export function useViewerControls(initial?: Partial<ViewerControlsState>) {
  const [controls, setControls] = useState<ViewerControlsState>({ ...defaultControls, ...initial })
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const setZoom = useCallback((zoom: number) => {
    setControls((current) => ({ ...current, zoom: Math.min(Math.max(zoom, 0.5), 4) }))
  }, [])

  const zoomIn = useCallback(() => {
    setControls((current) => ({ ...current, zoom: Math.min(current.zoom + 0.25, 4) }))
  }, [])

  const zoomOut = useCallback(() => {
    setControls((current) => ({ ...current, zoom: Math.max(current.zoom - 0.25, 0.5) }))
  }, [])

  const resetZoom = useCallback(() => {
    setControls((current) => ({ ...current, zoom: 1, panX: 0, panY: 0 }))
  }, [])

  const fitZoom = useCallback(() => {
    setControls((current) => ({ ...current, zoom: 1, panX: 0, panY: 0 }))
  }, [])

  const patch = useCallback((partial: Partial<ViewerControlsState>) => {
    setControls((current) => ({ ...current, ...partial }))
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (controls.zoom <= 1) return
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        panX: controls.panX,
        panY: controls.panY,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [controls.panX, controls.panY, controls.zoom],
  )

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return
    const deltaX = event.clientX - panStart.current.x
    const deltaY = event.clientY - panStart.current.y
    setControls((current) => ({
      ...current,
      panX: panStart.current!.panX + deltaX,
      panY: panStart.current!.panY + deltaY,
    }))
  }, [])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    panStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  return {
    controls,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitZoom,
    patch,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}

export function priorRecordImage(records: { recordNumber: number; images: { image: string }[] }[], currentRecordNumber: number) {
  const prior = records
    .filter((record) => record.recordNumber < currentRecordNumber)
    .sort((a, b) => b.recordNumber - a.recordNumber)[0]
  return prior?.images[0]?.image ?? null
}
