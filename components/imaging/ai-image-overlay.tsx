"use client"

import type { GradientLayer, HeatmapBox } from "@/lib/lung-zones"

type AiImageOverlayProps = {
  image: string
  boxes?: HeatmapBox[]
  gradients?: GradientLayer[]
  heatmapImage?: string | null
  showAiFindings?: boolean
  showHeatmap?: boolean
  brightness?: number
  contrast?: number
  highlightedFindingId?: string | null
  onFindingClick?: (findingId: string) => void
  isDemo?: boolean
  imageClassName?: string
  className?: string
}

export function AiImageOverlay({
  image,
  boxes = [],
  gradients = [],
  heatmapImage = null,
  showAiFindings = true,
  showHeatmap = true,
  brightness = 1,
  contrast = 1,
  highlightedFindingId = null,
  onFindingClick,
  isDemo = false,
  imageClassName = "block max-h-[min(72vh,820px)] w-auto max-w-full select-none",
  className = "",
}: AiImageOverlayProps) {
  const filterStyle = `brightness(${brightness}) contrast(${contrast})`
  const hasZoneBoxes = boxes.length > 0

  return (
    <div className={`relative w-fit max-w-full ${className}`}>
      <img
        src={image || "/placeholder.svg"}
        alt="Medical scan with AI analysis overlay"
        className={imageClassName}
        style={{ filter: filterStyle }}
        draggable={false}
      />

      {showHeatmap && !hasZoneBoxes && heatmapImage && (
        <img
          src={heatmapImage}
          alt="Grad-CAM model attention overlay"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-multiply"
        />
      )}

      <div className="pointer-events-none absolute inset-0">
        {showHeatmap &&
          gradients.map((layer) => (
            <div
              key={layer.id}
              className="absolute rounded-full"
              style={{
                top: `${layer.top}%`,
                left: `${layer.left}%`,
                width: `${layer.size}%`,
                height: `${layer.size}%`,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, rgba(239,68,68,${layer.opacity}) 0%, rgba(239,68,68,0) 72%)`,
              }}
            />
          ))}

        {showAiFindings &&
          boxes.map((box, index) => {
            const highlighted = highlightedFindingId === box.id
            const inset = index * 1.2
            const fillOpacity = highlighted ? Math.min(box.opacity + 0.15, 0.6) : Math.min(box.opacity + 0.05, 0.5)
            const fill = `rgba(239, 68, 68, ${fillOpacity})`
            const boxStyle = {
              top: `calc(${box.top}% + ${inset}px)`,
              left: `calc(${box.left}% + ${inset}px)`,
              width: `calc(${box.width}% - ${inset * 2}px)`,
              height: `calc(${box.height}% - ${inset * 2}px)`,
            }

            const inner = (
              <>
                <div
                  className={`h-full w-full rounded-lg border-2 transition-transform duration-200 ${
                    highlighted ? "animate-pulse border-red-300 ring-2 ring-red-400/90" : "border-red-400/95 group-hover:scale-[1.015]"
                  }`}
                  style={{
                    background: fill,
                    boxShadow: highlighted
                      ? "0 0 24px rgba(239, 68, 68, 0.55), inset 0 0 20px rgba(239, 68, 68, 0.25)"
                      : "0 0 16px rgba(239, 68, 68, 0.35), inset 0 0 14px rgba(239, 68, 68, 0.2)",
                  }}
                />
                <div
                  className={`pointer-events-none absolute left-2 top-2 max-w-48 rounded-lg border border-white/15 bg-black/85 px-2.5 py-2 text-xs text-white shadow-xl backdrop-blur ${
                    highlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  } transition-opacity`}
                >
                  <p className="font-semibold">{box.label}</p>
                  <p className="mt-0.5 text-white/70">{box.zoneLabel}</p>
                  <p className="mt-1 font-mono text-[11px] text-red-200">{box.confidence}% confidence</p>
                </div>
              </>
            )

            if (onFindingClick) {
              return (
                <button
                  key={box.id}
                  type="button"
                  className="group pointer-events-auto absolute"
                  style={boxStyle}
                  onClick={(event) => {
                    event.stopPropagation()
                    onFindingClick(box.id)
                  }}
                >
                  {inner}
                </button>
              )
            }

            return (
              <div key={box.id} className="group absolute" style={boxStyle}>
                {inner}
              </div>
            )
          })}
      </div>

      {isDemo && showAiFindings && hasZoneBoxes && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-amber-400/35 bg-black/70 px-2.5 py-1.5 text-[11px] font-medium text-amber-100 backdrop-blur">
          Demo overlay · illustrative zones
        </div>
      )}

      {showAiFindings && hasZoneBoxes && !isDemo && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-red-400/25 bg-black/55 px-2.5 py-1.5 text-[11px] font-medium text-red-100 backdrop-blur">
          GPT lung-zone overlay · {boxes.length} finding{boxes.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  )
}
