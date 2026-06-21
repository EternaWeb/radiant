"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { AiImageOverlay } from "@/components/imaging/ai-image-overlay"
import type { GradientLayer, HeatmapBox } from "@/lib/lung-zones"

export function HeatmapViewer({
  image,
  heatmapImage,
  boxes = [],
  gradients = [],
  isDemo = false,
  showToggle = true,
  defaultShowOverlay = true,
  imageClassName,
  className,
}: {
  image: string
  heatmapImage?: string | null
  boxes?: HeatmapBox[]
  gradients?: GradientLayer[]
  isDemo?: boolean
  showToggle?: boolean
  defaultShowOverlay?: boolean
  imageClassName?: string
  className?: string
}) {
  const [showOverlay, setShowOverlay] = useState(defaultShowOverlay)

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-black shadow-2xl shadow-black/10 ${className ?? ""}`}>
      <div className="flex justify-center p-1">
        <AiImageOverlay
          image={image}
          heatmapImage={heatmapImage}
          boxes={boxes}
          gradients={gradients}
          showAiFindings={showOverlay}
          showHeatmap={showOverlay}
          isDemo={isDemo}
          imageClassName={imageClassName ?? "block w-full select-none"}
        />
      </div>

      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-tight text-white/70">
        <p>Radiant PACS</p>
        <p>AI DECISION SUPPORT</p>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 text-right font-mono text-[11px] leading-tight text-white/70">
        <p>W 2048 / L 1024</p>
        <p>AI OVERLAY {showOverlay ? "ON" : "OFF"}</p>
      </div>

      {showToggle && (
        <button
          onClick={() => setShowOverlay((value) => !value)}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/70"
        >
          {showOverlay ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          AI Overlay
        </button>
      )}
    </div>
  )
}
