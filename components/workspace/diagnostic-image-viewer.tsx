"use client"

import { AiImageOverlay } from "@/components/imaging/ai-image-overlay"
import type { GradientLayer, HeatmapBox } from "@/lib/lung-zones"
import type { ViewerControlsState } from "@/lib/viewer-utils"

type DiagnosticImageViewerProps = {
  image: string
  previousStudyImage?: string | null
  boxes: HeatmapBox[]
  gradients: GradientLayer[]
  controls: ViewerControlsState
  highlightedFindingId: string | null
  isDemo?: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onFindingClick?: (findingId: string) => void
}

export function DiagnosticImageViewer({
  image,
  previousStudyImage,
  boxes,
  gradients,
  controls,
  highlightedFindingId,
  isDemo = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onFindingClick,
}: DiagnosticImageViewerProps) {
  const transformStyle = `translate(${controls.panX}px, ${controls.panY}px) scale(${controls.zoom})`

  return (
    <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
      <div
        className={`relative h-full w-full touch-none ${controls.zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transition-transform duration-75 will-change-transform" style={{ transform: transformStyle }}>
            <div className="relative">
              <AiImageOverlay
                image={image}
                boxes={boxes}
                gradients={gradients}
                showAiFindings={controls.showAiFindings}
                showHeatmap={controls.showHeatmap}
                brightness={controls.brightness}
                contrast={controls.contrast}
                highlightedFindingId={highlightedFindingId}
                onFindingClick={onFindingClick}
                isDemo={isDemo}
              />

              {controls.showPreviousStudy && previousStudyImage && (
                <img
                  src={previousStudyImage}
                  alt="Previous study overlay"
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-35 mix-blend-screen"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-tight text-white/70">
        <p>Radiant PACS</p>
        <p>AI DECISION SUPPORT</p>
        <p className="mt-1">Zoom {Math.round(controls.zoom * 100)}%</p>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 text-right font-mono text-[11px] leading-tight text-white/70">
        <p>W 2048 / L 1024</p>
        <p>
          AI {controls.showAiFindings ? "ON" : "OFF"} · Heatmap {controls.showHeatmap ? "ON" : "OFF"}
          {isDemo ? " · Demo" : ""}
        </p>
      </div>
    </div>
  )
}
