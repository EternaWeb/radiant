"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Patient } from "@/lib/data"
import type { ClinicalRole, DepartmentRecord, Organization, Profile } from "@/lib/supabase/types"

export type Stage = "welcome" | "login" | "profile" | "role" | "setup" | "readiness" | "app"
export type Section =
  | "dashboard"
  | "imaging"
  | "pacs"
  | "reports"
  | "alerts"
  | "departments"
  | "analytics"
  | "settings"

export type AuthUser = {
  id: string
  email: string | null
  fullName: string | null
}

export type PendingInvite = {
  token: string
  email: string
  organizationId: string
  organizationName: string
  departmentId: string
  departmentName: string
  clinicalRole: ClinicalRole
}

type AppState = {
  stage: Stage
  setStage: (s: Stage) => void
  section: Section
  setSection: (s: Section) => void
  role: ClinicalRole | null
  setRole: (r: ClinicalRole) => void
  fullName: string
  setFullName: (name: string) => void
  hospital: { name: string; department: string }
  setHospital: (h: { name: string; department: string }) => void
  user: AuthUser | null
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  organization: Organization | null
  setOrganization: (organization: Organization | null) => void
  department: DepartmentRecord | null
  setDepartment: (department: DepartmentRecord | null) => void
  invite: PendingInvite | null
  isAdmin: boolean
  completeAuthState: (state: {
    profile: Profile
    organization: Organization
    department: DepartmentRecord
  }) => void
  resetAuthState: () => void
  selectedPatient: Patient | null
  setSelectedPatient: (p: Patient | null) => void
  openPatient: (p: Patient) => void
}

const Ctx = createContext<AppState | null>(null)

type AppProviderProps = {
  children: ReactNode
  initialUser?: AuthUser | null
  initialProfile?: Profile | null
  initialOrganization?: Organization | null
  initialDepartment?: DepartmentRecord | null
  initialInvite?: PendingInvite | null
}

function getInitialStage(user: AuthUser | null, profile: Profile | null): Stage {
  if (!user) return "welcome"
  if (profile?.onboarding_complete) return "app"
  return "profile"
}

export function AppProvider({
  children,
  initialUser = null,
  initialProfile = null,
  initialOrganization = null,
  initialDepartment = null,
  initialInvite = null,
}: AppProviderProps) {
  const [stage, setStage] = useState<Stage>(() => getInitialStage(initialUser, initialProfile))
  const [section, setSection] = useState<Section>("dashboard")
  const [role, setRole] = useState<ClinicalRole | null>(
    initialProfile?.clinical_role ?? initialInvite?.clinicalRole ?? null,
  )
  const [fullName, setFullName] = useState(initialProfile?.full_name ?? initialUser?.fullName ?? "")
  const [hospital, setHospital] = useState({
    name: initialOrganization?.name ?? initialInvite?.organizationName ?? "St. Vincent Medical Center",
    department: initialDepartment?.name ?? initialInvite?.departmentName ?? "Radiology",
  })
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization)
  const [department, setDepartment] = useState<DepartmentRecord | null>(initialDepartment)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  function openPatient(p: Patient) {
    setSelectedPatient(p)
    setSection("imaging")
  }

  function completeAuthState(state: { profile: Profile; organization: Organization; department: DepartmentRecord }) {
    setProfile(state.profile)
    setOrganization(state.organization)
    setDepartment(state.department)
    setRole(state.profile.clinical_role)
    setHospital({ name: state.organization.name, department: state.department.name })
    setStage("readiness")
  }

  function resetAuthState() {
    setStage("welcome")
    setSection("dashboard")
    setRole(null)
    setFullName("")
    setProfile(null)
    setOrganization(null)
    setDepartment(null)
    setSelectedPatient(null)
    setHospital({ name: "St. Vincent Medical Center", department: "Radiology" })
  }

  return (
    <Ctx.Provider
      value={{
        stage,
        setStage,
        section,
        setSection,
        role,
        setRole,
        fullName,
        setFullName,
        hospital,
        setHospital,
        user: initialUser,
        profile,
        setProfile,
        organization,
        setOrganization,
        department,
        setDepartment,
        invite: initialInvite,
        isAdmin: profile?.is_admin ?? false,
        completeAuthState,
        resetAuthState,
        selectedPatient,
        setSelectedPatient,
        openPatient,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
