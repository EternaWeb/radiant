import type { SupabaseClient } from "@supabase/supabase-js"
import { DEFAULT_DEPARTMENTS, iconForDepartmentName } from "@/lib/departments"
import type { ClinicalRole, DepartmentRecord, Organization, Profile } from "@/lib/supabase/types"

export function buildDepartmentRows(organizationId: string, homeDepartmentName: string) {
  const normalizedHome = homeDepartmentName.trim()
  const rows = DEFAULT_DEPARTMENTS.map((dept) => ({
    organization_id: organizationId,
    name: dept.name,
    icon: dept.icon,
    location: dept.location,
  }))

  const hasHome = rows.some((dept) => dept.name.toLowerCase() === normalizedHome.toLowerCase())
  if (normalizedHome && !hasHome) {
    rows.push({
      organization_id: organizationId,
      name: normalizedHome,
      icon: iconForDepartmentName(normalizedHome),
      location: "Main campus",
    })
  }

  return rows
}

export type CreateWorkspaceInput = {
  userId: string
  email: string
  fullName: string
  clinicalRole: ClinicalRole
  hospitalName: string
  departmentName: string
  avatarUrl?: string | null
}

export async function createWorkspace(service: SupabaseClient, input: CreateWorkspaceInput) {
  const { data: organization, error: organizationError } = await service
    .from("organizations")
    .insert({ name: input.hospitalName.trim(), created_by: input.userId })
    .select("*")
    .single()

  if (organizationError || !organization) {
    throw new Error(organizationError?.message ?? "Could not create workspace.")
  }

  const departmentRows = buildDepartmentRows(organization.id, input.departmentName)
  const { data: createdDepartments, error: departmentsError } = await service
    .from("departments")
    .insert(departmentRows)
    .select("*")

  if (departmentsError || !createdDepartments?.length) {
    throw new Error(departmentsError?.message ?? "Could not create departments.")
  }

  const department =
    (createdDepartments as DepartmentRecord[]).find(
      (dept) => dept.name.toLowerCase() === input.departmentName.trim().toLowerCase(),
    ) ?? createdDepartments[0]

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .upsert({
      id: input.userId,
      full_name: input.fullName.trim(),
      email: input.email,
      phone: null,
      avatar_url: input.avatarUrl ?? null,
      clinical_role: input.clinicalRole,
      workspace_role: "admin",
      is_admin: true,
      organization_id: organization.id,
      department_id: department.id,
      onboarding_complete: true,
    })
    .select("*")
    .single()

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Could not update profile for workspace.")
  }

  return {
    profile: profile as Profile,
    organization: organization as Organization,
    department: department as DepartmentRecord,
  }
}
