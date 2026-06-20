"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import type { HeatmapBox } from "@/lib/lung-zones"

export function HeatmapViewer({
  image,
  heatmapImage,
  boxes = [],
}: {
  image: string
  heatmapImage?: string | null
  boxes?: HeatmapBox[]
}) {
  const [showOverlay, setShowOverlay] = useState(true)
  const hasZoneBoxes = boxes.length > 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black shadow-2xl shadow-black/10">
      <img src={image || "/placeholder.svg"} alt="Medical scan with AI analysis overlay" className="w-full select-none" />

      {showOverlay && !hasZoneBoxes && heatmapImage && (
        <img
          src={heatmapImage}
          alt="Grad-CAM model attention overlay"
          className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-screen"
        />
      )}

      {showOverlay &&
        hasZoneBoxes &&
        boxes.map((b, i) => {
          const inset = i * 1.5
          const fill = `rgba(239, 68, 68, ${b.opacity})`
          const glow = `rgba(239, 68, 68, ${Math.min(b.opacity + 0.12, 0.9)})`
          return (
            <div
              key={b.id}
              className="group absolute"
              style={{
                top: `calc(${b.top}% + ${inset}px)`,
                left: `calc(${b.left}% + ${inset}px)`,
                width: `calc(${b.width}% - ${inset * 2}px)`,
                height: `calc(${b.height}% - ${inset * 2}px)`,
              }}
            >
              <div
                className="h-full w-full rounded-lg border-2 border-red-400/95 transition-transform duration-200 group-hover:scale-[1.015]"
                style={{
                  background: fill,
                  boxShadow: `0 0 28px ${glow}, inset 0 0 46px ${glow}`,
                  mixBlendMode: "screen",
                }}
              />
              <div className="pointer-events-none absolute left-2 top-2 max-w-48 rounded-lg border border-white/15 bg-black/80 px-2.5 py-2 text-xs text-white opacity-0 shadow-xl backdrop-blur transition-opacity group-hover:opacity-100">
                <p className="font-semibold">{b.label}</p>
                <p className="mt-0.5 text-white/70">{b.zoneLabel}</p>
                <p className="mt-1 font-mono text-[11px] text-red-200">{b.confidence}% confidence</p>
              </div>
            </div>
          )
        })}

      {showOverlay && hasZoneBoxes && (
        <div className="absolute bottom-3 left-3 rounded-lg border border-red-400/25 bg-black/55 px-2.5 py-1.5 text-[11px] font-medium text-red-100 backdrop-blur">
          GPT lung-zone overlay · {boxes.length} finding{boxes.length === 1 ? "" : "s"}
        </div>
      )}

      {/* DICOM-style corner overlays */}
      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-tight text-white/70">
        <p>Radiant PACS</p>
        <p>AI DECISION SUPPORT</p>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 text-right font-mono text-[11px] leading-tight text-white/70">
        <p>W 2048 / L 1024</p>
        <p>AI OVERLAY {showOverlay ? "ON" : "OFF"}</p>
      </div>

      <button
        onClick={() => setShowOverlay((s) => !s)}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/70"
      >
        {showOverlay ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        AI Overlay
      </button>
    </div>
  )
}
