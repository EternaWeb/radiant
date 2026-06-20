import type {
  CaseAssignmentRole,
  CaseImageLabel,
  CaseStatus,
  ClinicalRole,
  FindingZone,
  RiskLevel,
  StudyModality,
  StudyStatus,
} from "@/lib/supabase/types"
import { modalityLabel, statusLabel } from "@/lib/studies"

export type ClinicalChecks = {
  spo2?: number | null
  fever?: boolean
  cough?: boolean
  shortnessOfBreath?: boolean
  chestPain?: boolean
  additionalSymptoms?: string
}

export type ClientView = {
  id: string
  clientCode: string
  firstName: string
  lastName: string
  name: string
  dateOfBirth: string
  age: number
  previousHospitals: string[]
  traumaHistory: string | null
  notes: string | null
  firstVisitDate: string | null
  createdAt: string
}

export type CaseImageView = {
  id: string
  label: CaseImageLabel
  labelNote: string | null
  storagePath: string
  image: string
  mimeType: string
  sortOrder: number
}

export type CaseFindingView = {
  label: string
  zone: FindingZone
  confidence: number
}

export type CaseRecordView = {
  id: string
  caseId: string
  recordNumber: number
  modality: "X-Ray" | "CT" | "MRI" | "Ultrasound"
  modalityKey: StudyModality
  bodyPart: string
  risk: number
  riskLevel: RiskLevel | null
  date: string
  status: "Pending" | "Reviewed" | "Critical"
  rawStatus: StudyStatus
  notes: string | null
  clinicalChecks: ClinicalChecks
  images: CaseImageView[]
  image: string
  heatmapImage: string | null
  findings: CaseFindingView[]
  summary: string
  comparison: string
  recommendation: string
  disclaimer: string
}

export type CaseAssignmentView = {
  id: string
  profileId: string
  name: string
  email: string
  clinicalRole: ClinicalRole
  assignmentRole: CaseAssignmentRole
}

export type CaseView = {
  id: string
  title: string
  status: CaseStatus
  departmentId: string | null
  client: ClientView
  records: CaseRecordView[]
  assignments: CaseAssignmentView[]
  createdAt: string
  updatedAt: string
}

export type CaseAlertView = {
  id: string
  recordId: string | null
  caseId: string | null
  title: string
  risk: number
  patientId: string
  clientName: string
  caseTitle: string
  recordNumber: number | null
  modality: string
  time: string
  departments: { id: string; name: string }[]
  notifiedDepartments: string[]
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function formatTimeAgo(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(Math.round(deltaMs / 60000), 0)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.round(hours / 24)}d ago`
}

export function computeAge(dateOfBirth: string) {
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return Math.max(age, 0)
}

export function normalizeClinicalChecks(value: unknown): ClinicalChecks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const checks = value as Record<string, unknown>
  return {
    spo2: typeof checks.spo2 === "number" ? checks.spo2 : null,
    fever: checks.fever === true,
    cough: checks.cough === true,
    shortnessOfBreath: checks.shortnessOfBreath === true || checks.shortness_of_breath === true,
    chestPain: checks.chestPain === true || checks.chest_pain === true,
    additionalSymptoms:
      typeof checks.additionalSymptoms === "string"
        ? checks.additionalSymptoms
        : typeof checks.additional_symptoms === "string"
          ? checks.additional_symptoms
          : "",
  }
}

export function clientDisplayName(client: { first_name: string; last_name: string }) {
  return `${client.first_name} ${client.last_name}`.trim()
}

export function topImage(images: CaseImageView[]) {
  return images[0]?.image ?? "/placeholder.svg"
}
