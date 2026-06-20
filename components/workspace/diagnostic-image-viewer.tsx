"use client"

import type { GradientLayer, HeatmapBox } from "@/lib/lung-zones"
import type { ViewerControlsState } from "@/lib/viewer-utils"

type DiagnosticImageViewerProps = {
  image: string
  previousStudyImage?: string | null
  boxes: HeatmapBox[]
  gradients: GradientLayer[]
  controls: ViewerControlsState
  highlightedFindingId: string | null
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onFindingClick,
}: DiagnosticImageViewerProps) {
  const filterStyle = `brightness(${controls.brightness}) contrast(${controls.contrast})`
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
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75 will-change-transform"
          style={{ transform: transformStyle }}
        >
          <div className="relative inline-block max-h-full max-w-full" style={{ filter: filterStyle }}>
            <img src={image || "/placeholder.svg"} alt="Diagnostic scan" className="max-h-[min(72vh,820px)] w-auto max-w-full select-none object-contain" draggable={false} />

            {controls.showPreviousStudy && previousStudyImage && (
              <img
                src={previousStudyImage}
                alt="Previous study overlay"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-35 mix-blend-screen"
              />
            )}

            {controls.showHeatmap &&
              gradients.map((layer) => (
                <div
                  key={layer.id}
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    top: `${layer.top}%`,
                    left: `${layer.left}%`,
                    width: `${layer.size}%`,
                    height: `${layer.size}%`,
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle, rgba(239,68,68,${layer.opacity}) 0%, rgba(239,68,68,0) 70%)`,
                    mixBlendMode: "screen",
                  }}
                />
              ))}

            {controls.showAiFindings &&
              boxes.map((box, index) => {
                const highlighted = highlightedFindingId === box.id
                const inset = index * 1.2
                const fill = `rgba(239, 68, 68, ${highlighted ? Math.min(box.opacity + 0.2, 0.95) : box.opacity})`
                const glow = `rgba(239, 68, 68, ${Math.min(box.opacity + 0.15, 0.9)})`

                return (
                  <button
                    key={box.id}
                    type="button"
                    className="group absolute"
                    style={{
                      top: `calc(${box.top}% + ${inset}px)`,
                      left: `calc(${box.left}% + ${inset}px)`,
                      width: `calc(${box.width}% - ${inset * 2}px)`,
                      height: `calc(${box.height}% - ${inset * 2}px)`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      onFindingClick?.(box.id)
                    }}
                  >
                    <div
                      className={`h-full w-full rounded-lg border-2 transition-transform duration-200 ${highlighted ? "animate-pulse border-red-300 ring-2 ring-red-400/80" : "border-red-400/95 group-hover:scale-[1.015]"}`}
                      style={{
                        background: fill,
                        boxShadow: `0 0 ${highlighted ? 36 : 28}px ${glow}, inset 0 0 46px ${glow}`,
                        mixBlendMode: "screen",
                      }}
                    />
                    <div
                      className={`pointer-events-none absolute left-2 top-2 max-w-48 rounded-lg border border-white/15 bg-black/80 px-2.5 py-2 text-xs text-white shadow-xl backdrop-blur ${highlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
                    >
                      <p className="font-semibold">{box.label}</p>
                      <p className="mt-0.5 text-white/70">{box.zoneLabel}</p>
                      <p className="mt-1 font-mono text-[11px] text-red-200">{box.confidence}% confidence</p>
                    </div>
                  </button>
                )
              })}
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
        <p>AI {controls.showAiFindings ? "ON" : "OFF"} · Heatmap {controls.showHeatmap ? "ON" : "OFF"}</p>
      </div>
    </div>
  )
}
