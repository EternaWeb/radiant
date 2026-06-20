export type ClinicalRole = "radiologist" | "emergency_doctor" | "department_doctor" | "administrator"
export type WorkspaceRole = "admin" | "participant"
export type StudyModality = "xray" | "ct" | "mri" | "ultrasound"
export type StudyStatus = "uploaded" | "analyzing" | "analyzed" | "reviewed" | "critical" | "failed"
export type RiskLevel = "low" | "medium" | "high"
export type FindingZone = "left_upper" | "left_lower" | "right_upper" | "right_lower" | "center"
export type CaseStatus = "open" | "closed"
export type CaseImageLabel = "front" | "left" | "right" | "posterior" | "lateral" | "other"
export type CaseAssignmentRole = "primary" | "emergency"
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Organization = {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export type DepartmentRecord = {
  id: string
  organization_id: string
  name: string
  icon: string
  location: string
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  clinical_role: ClinicalRole
  workspace_role: WorkspaceRole
  is_admin: boolean
  organization_id: string | null
  department_id: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export type Invite = {
  id: string
  token: string
  email: string
  organization_id: string
  department_id: string
  clinical_role: ClinicalRole
  workspace_role: WorkspaceRole
  invited_by: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  created_at: string
  updated_at: string
}

export type InviteDetails = Invite & {
  organizations: Pick<Organization, "id" | "name"> | null
  departments: Pick<DepartmentRecord, "id" | "name"> | null
}

export type PatientRecord = {
  id: string
  organization_id: string
  external_id: string
  display_name: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type StudyRecord = {
  id: string
  organization_id: string
  department_id: string | null
  patient_id: string
  modality: StudyModality
  body_part: string
  storage_path: string
  heatmap_storage_path: string | null
  image_mime_type: string
  status: StudyStatus
  risk_score: number | null
  risk_level: RiskLevel | null
  summary: string | null
  raw_findings: Json | null
  model_id: string | null
  report_model_id: string | null
  analysis_duration_ms: number | null
  analysis_error: string | null
  uploaded_by: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export type StudyClinicalContext = {
  study_id: string
  spo2: number | null
  fever: boolean
  symptoms: string | null
  created_at: string
  updated_at: string
}

export type StudyFinding = {
  id: string
  study_id: string
  label: string
  zone: FindingZone
  confidence: number
  raw_probability: number
  created_at: string
}

export type ReportRecord = {
  id: string
  study_id: string
  summary: string
  comparison: string
  recommendation: string
  disclaimer: string
  raw_llm_response: string | null
  model_used: string | null
  created_at: string
  updated_at: string
}

export type AlertRecord = {
  id: string
  organization_id: string
  study_id: string | null
  case_record_id: string | null
  title: string
  risk_score: number
  notified_departments: string[]
  acknowledged_at: string | null
  acknowledged_by: string | null
  created_at: string
  updated_at: string
}

export type StudyShare = {
  id: string
  study_id: string
  department_id: string
  shared_by: string | null
  created_at: string
}

export type ClientRecord = {
  id: string
  organization_id: string
  client_code: string
  first_name: string
  last_name: string
  date_of_birth: string
  previous_hospitals: string[]
  trauma_history: string | null
  notes: string | null
  first_visit_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CaseRecord = {
  id: string
  organization_id: string
  client_id: string
  department_id: string | null
  title: string
  status: CaseStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CaseTimelineRecord = {
  id: string
  organization_id: string
  case_id: string
  record_number: number
  modality: StudyModality
  body_part: string
  notes: string | null
  clinical_checks: Json
  status: StudyStatus
  risk_score: number | null
  risk_level: RiskLevel | null
  summary: string | null
  raw_findings: Json | null
  model_id: string | null
  report_model_id: string | null
  analysis_duration_ms: number | null
  analysis_error: string | null
  created_by: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export type CaseImageRecord = {
  id: string
  record_id: string
  label: CaseImageLabel
  label_note: string | null
  storage_path: string
  image_mime_type: string
  sort_order: number
  created_at: string
}

export type CaseRecordFinding = {
  id: string
  record_id: string
  label: string
  zone: FindingZone
  confidence: number
  raw_probability: number
  created_at: string
}

export type CaseRecordReport = {
  id: string
  record_id: string
  summary: string
  comparison: string
  recommendation: string
  disclaimer: string
  raw_llm_response: string | null
  model_used: string | null
  created_at: string
  updated_at: string
}

export type CaseAssignment = {
  id: string
  case_id: string
  profile_id: string
  role: CaseAssignmentRole
  assigned_by: string | null
  assigned_at: string
}

export type CaseShare = {
  id: string
  case_id: string
  department_id: string
  shared_by: string | null
  created_at: string
}

export type Database = {
  public: {
    CompositeTypes: Record<string, never>
    Enums: {
      clinical_role: ClinicalRole
      workspace_role: WorkspaceRole
      study_modality: StudyModality
      study_status: StudyStatus
      risk_level: RiskLevel
      case_status: CaseStatus
      case_image_label: CaseImageLabel
      case_assignment_role: CaseAssignmentRole
    }
    Functions: Record<string, never>
    Tables: {
      organizations: {
        Row: Organization
        Insert: Partial<Organization> & Pick<Organization, "name" | "created_by">
        Update: Partial<Omit<Organization, "id" | "created_at" | "updated_at">>
        Relationships: []
      }
      departments: {
        Row: DepartmentRecord
        Insert: Partial<DepartmentRecord> & Pick<DepartmentRecord, "organization_id" | "name">
        Update: Partial<Omit<DepartmentRecord, "id" | "created_at" | "updated_at">>
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, "id" | "full_name" | "email" | "clinical_role">
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>
        Relationships: []
      }
      invites: {
        Row: Invite
        Insert: Partial<Invite> & Pick<Invite, "email" | "organization_id" | "department_id" | "clinical_role" | "invited_by"> & {
          token?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Update: Partial<Omit<Invite, "id" | "token" | "created_at" | "updated_at">>
        Relationships: []
      }
      patients: {
        Row: PatientRecord
        Insert: Partial<PatientRecord> & Pick<PatientRecord, "organization_id" | "external_id" | "display_name">
        Update: Partial<Omit<PatientRecord, "id" | "created_at" | "updated_at">>
        Relationships: []
      }
      studies: {
        Row: StudyRecord
        Insert: Partial<StudyRecord> &
          Pick<StudyRecord, "organization_id" | "patient_id" | "storage_path" | "image_mime_type">
        Update: Partial<Omit<StudyRecord, "id" | "created_at" | "updated_at">>
        Relationships: []
      }
      study_clinical_context: {
        Row: StudyClinicalContext
        Insert: Partial<StudyClinicalContext> & Pick<StudyClinicalContext, "study_id">
        Update: Partial<Omit<StudyClinicalContext, "study_id" | "created_at" | "updated_at">>
        Relationships: []
      }
      study_findings: {
        Row: StudyFinding
        Insert: Partial<StudyFinding> & Pick<StudyFinding, "study_id" | "label" | "confidence" | "raw_probability">
        Update: Partial<Omit<StudyFinding, "id" | "created_at">>
        Relationships: []
      }
      reports: {
        Row: ReportRecord
        Insert: Partial<ReportRecord> & Pick<ReportRecord, "study_id" | "summary" | "recommendation">
        Update: Partial<Omit<ReportRecord, "id" | "study_id" | "created_at" | "updated_at">>
        Relationships: []
      }
      alerts: {
        Row: AlertRecord
        Insert: Partial<AlertRecord> & Pick<AlertRecord, "organization_id" | "title" | "risk_score">
        Update: Partial<Omit<AlertRecord, "id" | "organization_id" | "created_at" | "updated_at">>
        Relationships: []
      }
      study_shares: {
        Row: StudyShare
        Insert: Partial<StudyShare> & Pick<StudyShare, "study_id" | "department_id">
        Update: Partial<Omit<StudyShare, "id" | "study_id" | "department_id" | "created_at">>
        Relationships: []
      }
      clients: {
        Row: ClientRecord
        Insert: Partial<ClientRecord> & Pick<ClientRecord, "organization_id" | "first_name" | "last_name" | "date_of_birth">
        Update: Partial<Omit<ClientRecord, "id" | "organization_id" | "client_code" | "created_at" | "updated_at">>
        Relationships: []
      }
      cases: {
        Row: CaseRecord
        Insert: Partial<CaseRecord> & Pick<CaseRecord, "organization_id" | "client_id">
        Update: Partial<Omit<CaseRecord, "id" | "organization_id" | "client_id" | "created_at" | "updated_at">>
        Relationships: []
      }
      case_records: {
        Row: CaseTimelineRecord
        Insert: Partial<CaseTimelineRecord> & Pick<CaseTimelineRecord, "organization_id" | "case_id">
        Update: Partial<Omit<CaseTimelineRecord, "id" | "organization_id" | "case_id" | "record_number" | "created_at" | "updated_at">>
        Relationships: []
      }
      case_images: {
        Row: CaseImageRecord
        Insert: Partial<CaseImageRecord> & Pick<CaseImageRecord, "record_id" | "label" | "storage_path" | "image_mime_type">
        Update: Partial<Omit<CaseImageRecord, "id" | "record_id" | "created_at">>
        Relationships: []
      }
      case_record_findings: {
        Row: CaseRecordFinding
        Insert: Partial<CaseRecordFinding> & Pick<CaseRecordFinding, "record_id" | "label" | "zone" | "confidence" | "raw_probability">
        Update: Partial<Omit<CaseRecordFinding, "id" | "record_id" | "created_at">>
        Relationships: []
      }
      case_record_reports: {
        Row: CaseRecordReport
        Insert: Partial<CaseRecordReport> & Pick<CaseRecordReport, "record_id" | "summary" | "recommendation">
        Update: Partial<Omit<CaseRecordReport, "id" | "record_id" | "created_at" | "updated_at">>
        Relationships: []
      }
      case_assignments: {
        Row: CaseAssignment
        Insert: Partial<CaseAssignment> & Pick<CaseAssignment, "case_id" | "profile_id">
        Update: Partial<Omit<CaseAssignment, "id" | "case_id" | "profile_id" | "assigned_at">>
        Relationships: []
      }
      case_shares: {
        Row: CaseShare
        Insert: Partial<CaseShare> & Pick<CaseShare, "case_id" | "department_id">
        Update: Partial<Omit<CaseShare, "id" | "case_id" | "department_id" | "created_at">>
        Relationships: []
      }
    }
    Views: Record<string, never>
  }
}
