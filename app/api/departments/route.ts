import { NextResponse } from "next/server"
import { iconForDepartmentName } from "@/lib/departments"
import { formatClinicalRole } from "@/lib/roles"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { DepartmentRecord, Profile } from "@/lib/supabase/types"

type CreateDepartmentPayload = {
  name?: string
  icon?: string
  location?: string
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to view departments." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No workspace profile found." }, { status: 403 })
  }

  const [{ data: organization }, { data: departments }, { data: profiles }] = await Promise.all([
    service.from("organizations").select("*").eq("id", profile.organization_id).single(),
    service.from("departments").select("*").eq("organization_id", profile.organization_id).order("name"),
    service
      .from("profiles")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("onboarding_complete", true)
      .order("full_name"),
  ])

  const staff = (profiles ?? []) as Profile[]
  const hospitalName = organization?.name ?? "Workspace"
  const rows = ((departments ?? []) as DepartmentRecord[]).map((department) => {
    const departmentStaff = staff.filter((member) => member.department_id === department.id)
    const lead = departmentStaff.find((member) => member.is_admin) ?? departmentStaff[0]

    return {
      ...department,
      hospital: hospitalName,
      lead: lead?.full_name ?? "Unassigned",
      memberCount: departmentStaff.length,
      staff: departmentStaff.map((member) => ({
        id: member.id,
        name: member.full_name,
        avatarUrl: member.avatar_url,
        role: formatClinicalRole(member.clinical_role),
        clinicalRole: member.clinical_role,
        email: member.email,
        phone: member.phone ?? "Not added",
        shift: member.is_admin ? "Workspace admin" : "Participant",
        status: "Online" as const,
        isAdmin: member.is_admin,
        workspaceRole: member.workspace_role,
        department: department.name,
        hospital: hospitalName,
      })),
    }
  })

  return NextResponse.json(
    {
      organization: {
        id: organization?.id ?? profile.organization_id,
        name: hospitalName,
        logoUrl: organization?.logo_url ?? null,
      },
      departments: rows,
      isAdmin: profile.is_admin,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to create departments." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.organization_id || !profile.is_admin) {
    return NextResponse.json({ error: "Only workspace admins can create departments." }, { status: 403 })
  }

  const body = (await request.json()) as CreateDepartmentPayload
  const name = body.name?.trim()
  const icon = body.icon?.trim() || (name ? iconForDepartmentName(name) : "scan")
  const location = body.location?.trim() || "Main campus"

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Department name is required." }, { status: 400 })
  }

  const { data: department, error } = await service
    .from("departments")
    .insert({
      organization_id: profile.organization_id,
      name,
      icon,
      location,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A department with that name already exists." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ department })
}
