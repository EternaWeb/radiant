import { NextResponse } from "next/server"
import { formatClinicalRole } from "@/lib/roles"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { DepartmentRecord, Profile } from "@/lib/supabase/types"

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
  const rows = ((departments ?? []) as DepartmentRecord[]).map((department) => {
    const departmentStaff = staff.filter((member) => member.department_id === department.id)
    const lead = departmentStaff.find((member) => member.is_admin) ?? departmentStaff[0]

    return {
      ...department,
      hospital: organization?.name ?? "Workspace",
      lead: lead?.full_name ?? "Unassigned",
      staff: departmentStaff.map((member) => ({
        id: member.id,
        name: member.full_name,
        role: formatClinicalRole(member.clinical_role),
        clinicalRole: member.clinical_role,
        email: member.email,
        phone: member.phone ?? "Not added",
        shift: member.is_admin ? "Workspace admin" : "Participant",
        status: "Online",
        isAdmin: member.is_admin,
        workspaceRole: member.workspace_role,
        department: department.name,
        hospital: organization?.name ?? "Workspace",
      })),
    }
  })

  return NextResponse.json({ departments: rows, isAdmin: profile.is_admin })
}
