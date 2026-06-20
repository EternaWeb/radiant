"use client"

import { riskLevel } from "@/lib/data"

export function RiskGauge({ score, size = 160 }: { score: number; size?: number }) {
  const level = riskLevel(score)
  const stroke = size * 0.08
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c

  const color =
    level === "high" ? "var(--color-destructive)" : level === "medium" ? "var(--color-warning)" : "var(--color-success)"
  const label = level === "high" ? "HIGH" : level === "medium" ? "MODERATE" : "LOW"

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-xs font-semibold tracking-wide" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  )
}
