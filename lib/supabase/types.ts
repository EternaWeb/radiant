export type ClinicalRole = "radiologist" | "emergency_doctor" | "department_doctor" | "administrator"
export type WorkspaceRole = "admin" | "participant"
export type StudyModality = "xray" | "ct" | "mri" | "ultrasound"
export type StudyStatus = "uploaded" | "analyzing" | "analyzed" | "reviewed" | "critical" | "failed"
export type RiskLevel = "low" | "medium" | "high"

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
  study_id: string
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

export type Database = {
  public: {
    CompositeTypes: Record<string, never>
    Enums: {
      clinical_role: ClinicalRole
      workspace_role: WorkspaceRole
      study_modality: StudyModality
      study_status: StudyStatus
      risk_level: RiskLevel
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
        Insert: Partial<AlertRecord> & Pick<AlertRecord, "organization_id" | "study_id" | "title" | "risk_score">
        Update: Partial<Omit<AlertRecord, "id" | "organization_id" | "study_id" | "created_at" | "updated_at">>
        Relationships: []
      }
      study_shares: {
        Row: StudyShare
        Insert: Partial<StudyShare> & Pick<StudyShare, "study_id" | "department_id">
        Update: Partial<Omit<StudyShare, "id" | "study_id" | "department_id" | "created_at">>
        Relationships: []
      }
    }
    Views: Record<string, never>
  }
}
