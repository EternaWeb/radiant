import type { CaseFindingView, CaseRecordView } from "@/lib/cases"
import type { GptVisionFinding } from "@/lib/gpt-vision"
import type { FindingZone } from "@/lib/supabase/types"
import type { StudyFindingView, StudyView } from "@/lib/studies"

export type OverlayFinding = {
  label: string
  zone: FindingZone
  confidence: number
}

export const DEMO_OVERLAY_FINDINGS: OverlayFinding[] = [
  { label: "lung_opacity", zone: "left_lower", confidence: 91 },
  { label: "pleural_effusion", zone: "right_lower", confidence: 67 },
]

const VALID_ZONES = new Set<FindingZone>(["left_upper", "left_lower", "right_upper", "right_lower", "center"])

function isNonNormalFinding(finding: OverlayFinding) {
  return finding.label !== "normal"
}

function normalizeFinding(value: unknown): OverlayFinding | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const label = typeof row.label === "string" ? row.label : null
  const zone = typeof row.zone === "string" ? row.zone : null
  const confidenceRaw = row.confidence

  if (!label || !zone || !VALID_ZONES.has(zone as FindingZone)) return null

  const confidence =
    typeof confidenceRaw === "number"
      ? confidenceRaw <= 1
        ? Math.round(confidenceRaw * 100)
        : Math.round(confidenceRaw)
      : 0

  return {
    label,
    zone: zone as FindingZone,
    confidence: Math.min(Math.max(confidence, 0), 100),
  }
}

function parseRawFindings(raw: CaseRecordView["rawFindings"]): OverlayFinding[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
  const payload = raw as { findings?: unknown }
  if (!Array.isArray(payload.findings)) return []

  return payload.findings
    .map(normalizeFinding)
    .filter((finding): finding is OverlayFinding => finding !== null)
    .filter(isNonNormalFinding)
}

function fromRows(findings: Array<Pick<CaseFindingView | StudyFindingView, "label" | "zone" | "confidence">>) {
  return findings.filter(isNonNormalFinding)
}

export function resolveOverlayFindings(record: Pick<CaseRecordView, "findings" | "rawFindings" | "image" | "images">) {
  const fromDb = fromRows(record.findings)
  if (fromDb.length > 0) {
    return { findings: fromDb, isDemo: false }
  }

  const fromRaw = parseRawFindings(record.rawFindings)
  if (fromRaw.length > 0) {
    return { findings: fromRaw, isDemo: false }
  }

  const hasImage = Boolean(record.image && record.image !== "/placeholder.svg") || record.images.length > 0
  if (hasImage) {
    return { findings: DEMO_OVERLAY_FINDINGS, isDemo: true }
  }

  return { findings: [], isDemo: false }
}

export function resolveStudyOverlayFindings(study: Pick<StudyView, "findings" | "image">) {
  const fromDb = fromRows(study.findings)
  if (fromDb.length > 0) {
    return { findings: fromDb, isDemo: false }
  }

  const hasImage = Boolean(study.image && study.image !== "/placeholder.svg")
  if (hasImage) {
    return { findings: DEMO_OVERLAY_FINDINGS, isDemo: true }
  }

  return { findings: [], isDemo: false }
}

export function rawFindingsFromJson(value: unknown): GptVisionFinding[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const payload = value as { findings?: unknown }
  if (!Array.isArray(payload.findings)) return null

  return payload.findings
    .map(normalizeFinding)
    .filter((finding): finding is OverlayFinding => finding !== null) as GptVisionFinding[]
}
