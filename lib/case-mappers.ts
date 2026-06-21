import type { SupabaseClient } from "@supabase/supabase-js"
import {
  clientDisplayName,
  computeAge,
  formatDate,
  formatTimeAgo,
  normalizeClinicalChecks,
  topImage,
  type CaseAlertView,
  type CaseAssignmentView,
  type CaseImageView,
  type CaseRecordView,
  type CaseView,
  type ClientView,
} from "@/lib/cases"
import type { GptVisionAnalysis } from "@/lib/gpt-vision"
import { modalityLabel, statusLabel } from "@/lib/studies"
import type {
  CaseAssignment,
  CaseImageRecord,
  CaseRecord,
  CaseRecordFinding,
  CaseRecordReport,
  CaseTimelineRecord,
  ClientRecord,
  Database,
  DepartmentRecord,
  Profile,
  StudyRecord,
} from "@/lib/supabase/types"

type ClientRow = ClientRecord & {
  cases?: CaseRow[] | null
}

type CaseRow = CaseRecord & {
  clients?: ClientRecord | null
  case_records?: RecordRow[] | null
  case_assignments?: AssignmentRow[] | null
}

type RecordRow = CaseTimelineRecord & {
  case_images?: CaseImageRecord[] | null
  case_record_findings?: CaseRecordFinding[] | null
  case_record_reports?: CaseRecordReport[] | CaseRecordReport | null
}

type AssignmentRow = CaseAssignment & {
  profiles?:
    | (Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "clinical_role" | "department_id"> & {
        departments?: Pick<DepartmentRecord, "id" | "name"> | null
      })
    | null
}

type AlertRow = {
  id: string
  study_id: string | null
  case_record_id: string | null
  title: string
  risk_score: number
  notified_departments: string[]
  created_at: string
  studies?:
    | (StudyRecord & {
        patients?: { external_id: string } | null
      })
    | null
  case_records?:
    | (RecordRow & {
        cases?:
          | (CaseRecord & {
              clients?: ClientRecord | null
            })
          | null
      })
    | null
}

function first<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type SignedUrlMap = Map<string, string>

async function buildSignedUrlMap(service: SupabaseClient<Database>, paths: string[]): Promise<SignedUrlMap> {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const { data } = await service.storage.from("studies").createSignedUrls(unique, 60 * 60)
  const map: SignedUrlMap = new Map()

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      map.set(item.path, item.signedUrl)
    }
  }

  return map
}

function collectImagePaths(rows: CaseRow[]): string[] {
  const paths: string[] = []

  for (const caseRow of rows) {
    for (const record of caseRow.case_records ?? []) {
      for (const image of record.case_images ?? []) {
        if (image.storage_path) paths.push(image.storage_path)
      }
    }
  }

  return paths
}

function collectRecordImagePaths(record: RecordRow): string[] {
  return (record.case_images ?? []).map((image) => image.storage_path).filter(Boolean) as string[]
}

function resolveSignedUrl(urlMap: SignedUrlMap | undefined, path: string | null | undefined) {
  if (!path) return null
  return urlMap?.get(path) ?? null
}

export function mapClientRow(client: ClientRecord): ClientView {
  const name = clientDisplayName(client)

  return {
    id: client.id,
    clientCode: client.client_code,
    firstName: client.first_name,
    lastName: client.last_name,
    name: name || "Unnamed client",
    dateOfBirth: client.date_of_birth,
    age: computeAge(client.date_of_birth),
    previousHospitals: client.previous_hospitals ?? [],
    traumaHistory: client.trauma_history,
    notes: client.notes,
    firstVisitDate: client.first_visit_date,
    createdAt: client.created_at,
  }
}

export function mapClientRows(rows: ClientRow[]): ClientView[] {
  return rows.map(mapClientRow)
}

function mapImage(image: CaseImageRecord, urlMap?: SignedUrlMap): CaseImageView {
  return {
    id: image.id,
    label: image.label,
    labelNote: image.label_note,
    storagePath: image.storage_path,
    image: resolveSignedUrl(urlMap, image.storage_path) ?? "/placeholder.svg",
    mimeType: image.image_mime_type,
    sortOrder: image.sort_order,
  }
}

export function mapRecordRow(record: RecordRow, urlMap?: SignedUrlMap): CaseRecordView {
  const report = first(record.case_record_reports)
  const images = (record.case_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => mapImage(image, urlMap))
  const findings = (record.case_record_findings ?? [])
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map((finding) => ({
      label: finding.label,
      zone: finding.zone,
      confidence: finding.confidence,
    }))

  return {
    id: record.id,
    caseId: record.case_id,
    recordNumber: record.record_number,
    modality: modalityLabel(record.modality),
    modalityKey: record.modality,
    bodyPart: record.body_part,
    risk: record.risk_score ?? 0,
    riskLevel: record.risk_level,
    date: formatDate(record.created_at),
    status: statusLabel(record.status, record.risk_score),
    rawStatus: record.status,
    notes: record.notes,
    clinicalChecks: normalizeClinicalChecks(record.clinical_checks),
    images,
    image: topImage(images),
    heatmapImage: null,
    findings,
    rawFindings: (record.raw_findings as GptVisionAnalysis["raw"] | null) ?? null,
    summary:
      record.summary ??
      report?.summary ??
      "This record has been created and is ready for AI-assisted review. Once analysis runs, this section will summarize the visible evidence, risk context, and recommended workflow step without replacing clinician interpretation.",
    comparison: report?.comparison ?? "No prior record on file.",
    recommendation: report?.recommendation ?? "Run AI analysis to generate a recommendation draft.",
    disclaimer: report?.disclaimer ?? "AI-assisted draft. Not a clinical diagnosis; radiologist review is required.",
  }
}

function mapAssignment(row: AssignmentRow): CaseAssignmentView {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.profiles?.full_name ?? "Unassigned clinician",
    email: row.profiles?.email ?? "",
    avatarUrl: row.profiles?.avatar_url ?? null,
    clinicalRole: row.profiles?.clinical_role ?? "department_doctor",
    departmentId: row.profiles?.department_id ?? null,
    departmentName: row.profiles?.departments?.name ?? "Unassigned department",
    assignmentRole: row.role,
  }
}

export async function mapCaseRows(service: SupabaseClient<Database>, rows: CaseRow[]): Promise<CaseView[]> {
  const urlMap = await buildSignedUrlMap(service, collectImagePaths(rows))

  return rows.map((caseRow) => {
    const records = (caseRow.case_records ?? [])
      .slice()
      .sort((a, b) => a.record_number - b.record_number)
      .map((record) => mapRecordRow(record, urlMap))

    return {
      id: caseRow.id,
      title: caseRow.title,
      status: caseRow.status,
      departmentId: caseRow.department_id,
      client: caseRow.clients ? mapClientRow(caseRow.clients) : mapClientRow(fallbackClient(caseRow)),
      records,
      assignments: (caseRow.case_assignments ?? []).map(mapAssignment),
      createdAt: caseRow.created_at,
      updatedAt: caseRow.updated_at,
    }
  })
}

export async function mapRecordRowWithUrls(
  service: SupabaseClient<Database>,
  record: RecordRow,
): Promise<CaseRecordView> {
  const urlMap = await buildSignedUrlMap(service, collectRecordImagePaths(record))
  return mapRecordRow(record, urlMap)
}

function fallbackClient(caseRow: CaseRow): ClientRecord {
  return {
    id: caseRow.client_id,
    organization_id: caseRow.organization_id,
    client_code: "Unknown",
    first_name: "Unknown",
    last_name: "client",
    date_of_birth: new Date().toISOString().slice(0, 10),
    previous_hospitals: [],
    trauma_history: null,
    notes: null,
    first_visit_date: null,
    created_by: null,
    created_at: caseRow.created_at,
    updated_at: caseRow.updated_at,
  }
}

export function mapCaseAlerts(
  rows: AlertRow[],
  departments: Pick<DepartmentRecord, "id" | "name">[],
): CaseAlertView[] {
  return rows.map((alert) => {
    const record = alert.case_records
    const caseRow = record?.cases
    const client = caseRow?.clients

    if (record && caseRow && client) {
      return {
        id: alert.id,
        recordId: record.id,
        caseId: caseRow.id,
        title: alert.title,
        risk: alert.risk_score,
        patientId: client.client_code,
        clientName: clientDisplayName(client),
        caseTitle: caseRow.title,
        recordNumber: record.record_number,
        modality: modalityLabel(record.modality),
        time: formatTimeAgo(alert.created_at),
        departments,
        notifiedDepartments: alert.notified_departments,
      }
    }

    return {
      id: alert.id,
      recordId: null,
      caseId: null,
      title: alert.title,
      risk: alert.risk_score,
      patientId: alert.studies?.patients?.external_id ?? "Unknown",
      clientName: "Legacy patient",
      caseTitle: "Legacy study",
      recordNumber: null,
      modality: alert.studies ? modalityLabel(alert.studies.modality) : "X-Ray",
      time: formatTimeAgo(alert.created_at),
      departments,
      notifiedDepartments: alert.notified_departments,
    }
  })
}
