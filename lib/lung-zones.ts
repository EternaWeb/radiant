import type { CaseFindingView } from "@/lib/cases"
import type { StudyFindingView } from "@/lib/studies"
import type { FindingZone } from "@/lib/supabase/types"

type FindingInput = Pick<StudyFindingView | CaseFindingView, "label" | "zone" | "confidence">

type LungZoneBox = {
  x: number
  y: number
  w: number
  h: number
}

export type HeatmapBox = {
  id: string
  top: number
  left: number
  width: number
  height: number
  label: string
  zone: FindingZone
  zoneLabel: string
  confidence: number
  opacity: number
}

export type GradientLayer = {
  id: string
  top: number
  left: number
  size: number
  opacity: number
  label: string
}

export const lungZones: Record<FindingZone, LungZoneBox> = {
  left_upper: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 },
  left_lower: { x: 0.1, y: 0.5, w: 0.4, h: 0.4 },
  right_upper: { x: 0.5, y: 0.1, w: 0.4, h: 0.4 },
  right_lower: { x: 0.5, y: 0.5, w: 0.4, h: 0.4 },
  center: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 },
}

export function formatFindingLabel(label: string) {
  return label
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatFindingZone(zone: FindingZone) {
  return zone
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function findingsToHeatmapBoxes(findings: FindingInput[]): HeatmapBox[] {
  return findings
    .filter((finding) => finding.label !== "normal")
    .map((finding, index) => {
      const zone = lungZones[finding.zone]
      const confidence = clamp(finding.confidence, 0, 100)

      return {
        id: `${finding.label}-${finding.zone}-${index}`,
        top: zone.y * 100,
        left: zone.x * 100,
        width: zone.w * 100,
        height: zone.h * 100,
        label: formatFindingLabel(finding.label),
        zone: finding.zone,
        zoneLabel: formatFindingZone(finding.zone),
        confidence,
        opacity: clamp(confidence / 100, 0.3, 0.8),
      }
    })
}

export function findingsToGradientLayers(findings: FindingInput[]): GradientLayer[] {
  return findings
    .filter((finding) => finding.label !== "normal")
    .map((finding, index) => {
      const zone = lungZones[finding.zone]
      const confidence = clamp(finding.confidence, 0, 100)
      const centerX = (zone.x + zone.w / 2) * 100
      const centerY = (zone.y + zone.h / 2) * 100
      const size = Math.max(zone.w, zone.h) * 100 * 1.35

      return {
        id: `gradient-${finding.label}-${finding.zone}-${index}`,
        top: centerY,
        left: centerX,
        size,
        opacity: clamp(confidence / 100, 0.25, 0.75),
        label: formatFindingLabel(finding.label),
      }
    })
}
