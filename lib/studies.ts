import type { FindingZone, RiskLevel, StudyModality, StudyStatus } from "@/lib/supabase/types"

export type StudyFindingView = {
  label: string
  zone: FindingZone
  confidence: number
}

export type StudyClinicalContextView = {
  spo2: number | null
  fever: boolean
  symptoms: string | null
}

export type StudyView = {
  id: string
  name: string
  patientId: string
  modality: "X-Ray" | "CT" | "MRI" | "Ultrasound"
  modalityKey: StudyModality
  bodyPart: string
  risk: number
  riskLevel: RiskLevel | null
  date: string
  status: "Pending" | "Reviewed" | "Critical"
  rawStatus: StudyStatus
  image: string
  heatmapImage: string | null
  findings: StudyFindingView[]
  summary: string
  comparison: string
  recommendation: string
  disclaimer: string
  clinicalContext: StudyClinicalContextView | null
}

export type AlertView = {
  id: string
  studyId: string | null
  title: string
  risk: number
  patientId: string
  modality: string
  time: string
  departments: { id: string; name: string }[]
  notifiedDepartments: string[]
}

export function modalityLabel(modality: StudyModality): StudyView["modality"] {
  if (modality === "ct") return "CT"
  if (modality === "mri") return "MRI"
  if (modality === "ultrasound") return "Ultrasound"
  return "X-Ray"
}

export function statusLabel(status: StudyStatus, riskScore: number | null): StudyView["status"] {
  if (status === "critical" || (riskScore ?? 0) >= 70) return "Critical"
  if (status === "reviewed" || status === "analyzed") return "Reviewed"
  return "Pending"
}
