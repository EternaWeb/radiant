"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

type Box = {
  top: number
  left: number
  width: number
  height: number
  label: string
  confidence: number
  tone: "danger" | "warning"
}

export function HeatmapViewer({
  image,
  boxes,
}: {
  image: string
  boxes: Box[]
}) {
  const [showOverlay, setShowOverlay] = useState(true)

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black">
      <img src={image || "/placeholder.svg"} alt="Medical scan with AI analysis overlay" className="w-full" />

      {showOverlay &&
        boxes.map((b, i) => {
          const ring = b.tone === "danger" ? "border-destructive" : "border-warning"
          const chip = b.tone === "danger" ? "bg-destructive text-white" : "bg-warning text-warning-foreground"
          const glow =
            b.tone === "danger" ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.3)"
          return (
            <div
              key={i}
              className="absolute"
              style={{
                top: `${b.top}%`,
                left: `${b.left}%`,
                width: `${b.width}%`,
                height: `${b.height}%`,
              }}
            >
              <div
                className={`h-full w-full rounded-md border-2 ${ring}`}
                style={{ boxShadow: `0 0 0 9999px transparent, inset 0 0 40px ${glow}`, background: glow }}
              />
              <span
                className={`absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${chip}`}
              >
                {b.label} {b.confidence}%
              </span>
            </div>
          )
        })}

      {/* DICOM-style corner overlays */}
      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-tight text-white/70">
        <p>MedVision AI</p>
        <p>SERIES 1 / IM 1</p>
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
