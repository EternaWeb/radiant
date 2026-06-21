import { NextResponse } from "next/server"
import { createWorkspace } from "@/lib/create-workspace"
import { createClient, createServiceClient } from "@/lib/supabase/server"

type Payload = {
  hospitalName?: string
  departmentName?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to create a workspace." }, { status: 401 })
  }

  const body = (await request.json()) as Payload
  const hospitalName = body.hospitalName?.trim()
  const departmentName = body.departmentName?.trim() || "Radiology"

  if (!hospitalName || hospitalName.length < 2) {
    return NextResponse.json({ error: "Hospital name is required." }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).maybeSingle()

  if (!profile?.onboarding_complete) {
    return NextResponse.json({ error: "Complete onboarding before creating additional workspaces." }, { status: 403 })
  }

  try {
    const result = await createWorkspace(service, {
      userId: user.id,
      email: user.email ?? profile.email,
      fullName: profile.full_name,
      clinicalRole: profile.clinical_role,
      hospitalName,
      departmentName,
      avatarUrl: profile.avatar_url,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create workspace." },
      { status: 500 },
    )
  }
}
