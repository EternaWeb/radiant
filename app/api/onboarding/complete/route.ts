import { NextResponse } from "next/server"
import { DEFAULT_DEPARTMENTS, iconForDepartmentName } from "@/lib/departments"
import { getAuthAvatarUrl } from "@/lib/avatars"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { ClinicalRole, DepartmentRecord } from "@/lib/supabase/types"

const clinicalRoles: ClinicalRole[] = ["radiologist", "emergency_doctor", "department_doctor", "administrator"]

type Payload = {
  fullName?: string
  clinicalRole?: ClinicalRole
  hospitalName?: string
  departmentName?: string
}

function buildDepartmentRows(organizationId: string, homeDepartmentName: string) {
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

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to complete onboarding." }, { status: 401 })
  }

  const body = (await request.json()) as Payload
  const fullName = body.fullName?.trim()
  const hospitalName = body.hospitalName?.trim()
  const departmentName = body.departmentName?.trim()
  const clinicalRole = body.clinicalRole

  if (!fullName || !hospitalName || !departmentName || !clinicalRole || !clinicalRoles.includes(clinicalRole)) {
    return NextResponse.json({ error: "Missing required onboarding details." }, { status: 400 })
  }

  const service = createServiceClient()
  const avatarUrl = getAuthAvatarUrl(user.user_metadata)

  const { data: existingProfile } = await service
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfile?.onboarding_complete) {
    const [organizationResult, departmentResult] = await Promise.all([
      existingProfile.organization_id
        ? service.from("organizations").select("*").eq("id", existingProfile.organization_id).single()
        : null,
      existingProfile.department_id
        ? service.from("departments").select("*").eq("id", existingProfile.department_id).single()
        : null,
    ])

    return NextResponse.json({
      profile: existingProfile,
      organization: organizationResult?.data ?? null,
      department: departmentResult?.data ?? null,
    })
  }

  const { count, error: countError } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("onboarding_complete", true)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "This workspace already has an admin. Ask an admin to send you an invite." },
      { status: 403 },
    )
  }

  const email = user.email ?? ""

  const { data: organization, error: organizationError } = await service
    .from("organizations")
    .insert({ name: hospitalName, created_by: user.id })
    .select("*")
    .single()

  if (organizationError || !organization) {
    return NextResponse.json({ error: organizationError?.message ?? "Could not create workspace." }, { status: 500 })
  }

  const departmentRows = buildDepartmentRows(organization.id, departmentName)
  const { data: createdDepartments, error: departmentsError } = await service
    .from("departments")
    .insert(departmentRows)
    .select("*")

  if (departmentsError || !createdDepartments?.length) {
    return NextResponse.json({ error: departmentsError?.message ?? "Could not create departments." }, { status: 500 })
  }

  const department =
    (createdDepartments as DepartmentRecord[]).find(
      (dept) => dept.name.toLowerCase() === departmentName.toLowerCase(),
    ) ?? createdDepartments[0]

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: fullName,
      email,
      phone: null,
      avatar_url: avatarUrl,
      clinical_role: clinicalRole,
      workspace_role: "admin",
      is_admin: true,
      organization_id: organization.id,
      department_id: department.id,
      onboarding_complete: true,
    })
    .select("*")
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Could not create profile." }, { status: 500 })
  }

  return NextResponse.json({ profile, organization, department })
}
