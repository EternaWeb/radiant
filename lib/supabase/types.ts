export type ClinicalRole = "radiologist" | "emergency_doctor" | "department_doctor" | "administrator"
export type WorkspaceRole = "admin" | "participant"

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

export type Database = {
  public: {
    CompositeTypes: Record<string, never>
    Enums: {
      clinical_role: ClinicalRole
      workspace_role: WorkspaceRole
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
    }
    Views: Record<string, never>
  }
}
