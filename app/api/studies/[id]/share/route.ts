import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"

type Context = {
  params: Promise<{ id: string }>
}

type Payload = {
  departmentId?: string
}

export async function POST(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  const body = (await request.json()) as Payload

  if (!body.departmentId) {
    return NextResponse.json({ error: "departmentId is required." }, { status: 400 })
  }

  const [{ data: study }, { data: department }] = await Promise.all([
    auth.service
      .from("studies")
      .select("id, organization_id, department_id")
      .eq("id", id)
      .eq("organization_id", auth.profile.organization_id!)
      .single(),
    auth.service
      .from("departments")
      .select("id")
      .eq("id", body.departmentId)
      .eq("organization_id", auth.profile.organization_id!)
      .single(),
  ])

  if (!study || !department) {
    return NextResponse.json({ error: "Study or department not found." }, { status: 404 })
  }

  const canShare =
    auth.profile.is_admin || study.department_id === auth.profile.department_id || study.department_id === null

  if (!canShare) {
    return NextResponse.json({ error: "You cannot share this study." }, { status: 403 })
  }

  const { error } = await auth.service.from("study_shares").upsert(
    {
      study_id: study.id,
      department_id: department.id,
      shared_by: auth.userId,
    },
    { onConflict: "study_id,department_id" },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
