import { NextResponse } from "next/server"
import { getAuthAvatarUrl } from "@/lib/avatars"
import { createWorkspace } from "@/lib/create-workspace"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { ClinicalRole } from "@/lib/supabase/types"

const clinicalRoles: ClinicalRole[] = ["radiologist", "emergency_doctor", "department_doctor", "administrator"]

type Payload = {
  fullName?: string
  clinicalRole?: ClinicalRole
  hospitalName?: string
  departmentName?: string
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

  const { data: existingProfile } = await service.from("profiles").select("*").eq("id", user.id).maybeSingle()

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

  try {
    const result = await createWorkspace(service, {
      userId: user.id,
      email: user.email ?? "",
      fullName,
      clinicalRole,
      hospitalName,
      departmentName,
      avatarUrl,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create workspace." },
      { status: 500 },
    )
  }
}
