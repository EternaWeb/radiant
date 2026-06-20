import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  AlertRecord,
  Database,
  DepartmentRecord,
  PatientRecord,
  ReportRecord,
  StudyClinicalContext,
  StudyFinding,
  StudyRecord,
} from "@/lib/supabase/types"
import { modalityLabel, statusLabel, type AlertView, type StudyView } from "@/lib/studies"

type StudyRow = StudyRecord & {
  patients?: Pick<PatientRecord, "external_id" | "display_name"> | null
  study_findings?: StudyFinding[] | null
  reports?: ReportRecord[] | ReportRecord | null
  study_clinical_context?: StudyClinicalContext[] | StudyClinicalContext | null
}

type AlertRow = AlertRecord & {
  studies?:
    | (StudyRecord & {
        patients?: Pick<PatientRecord, "external_id"> | null
      })
    | null
}

function first<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatTimeAgo(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(Math.round(deltaMs / 60000), 0)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.round(hours / 24)}d ago`
}

async function signedUrl(service: SupabaseClient<Database>, path: string | null | undefined) {
  if (!path) return null

  const { data } = await service.storage.from("studies").createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

export async function mapStudyRows(service: SupabaseClient<Database>, rows: StudyRow[]): Promise<StudyView[]> {
  return Promise.all(
    rows.map(async (study) => {
      const report = first(study.reports)
      const context = first(study.study_clinical_context)
      const findings = study.study_findings ?? []

      return {
        id: study.id,
        name: study.patients?.display_name ?? "Unnamed patient",
        patientId: study.patients?.external_id ?? "Unknown",
        modality: modalityLabel(study.modality),
        modalityKey: study.modality,
        bodyPart: study.body_part,
        risk: study.risk_score ?? 0,
        riskLevel: study.risk_level,
        date: formatDate(study.created_at),
        status: statusLabel(study.status, study.risk_score),
        rawStatus: study.status,
        image: (await signedUrl(service, study.storage_path)) ?? "/placeholder.svg",
        heatmapImage: await signedUrl(service, study.heatmap_storage_path),
        findings: findings
          .slice()
          .sort((a, b) => b.confidence - a.confidence)
          .map((finding) => ({ label: finding.label, zone: finding.zone, confidence: finding.confidence })),
        summary: study.summary ?? report?.summary ?? "Upload complete. Analysis has not generated a report yet.",
        comparison: report?.comparison ?? "No prior study on file.",
        recommendation: report?.recommendation ?? "Run AI analysis to generate a recommendation draft.",
        disclaimer: report?.disclaimer ?? "AI-assisted draft. Not a clinical diagnosis; radiologist review is required.",
        clinicalContext: context
          ? {
              spo2: context.spo2,
              fever: context.fever,
              symptoms: context.symptoms,
            }
          : null,
      }
    }),
  )
}

export function mapAlerts(
  rows: AlertRow[],
  departments: Pick<DepartmentRecord, "id" | "name">[],
): AlertView[] {
  return rows.map((alert) => ({
    id: alert.id,
    studyId: alert.study_id,
    title: alert.title,
    risk: alert.risk_score,
    patientId: alert.studies?.patients?.external_id ?? "Unknown",
    modality: alert.studies ? modalityLabel(alert.studies.modality) : "X-Ray",
    time: formatTimeAgo(alert.created_at),
    departments,
    notifiedDepartments: alert.notified_departments,
  }))
}
