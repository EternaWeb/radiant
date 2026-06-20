import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessCase } from "@/lib/case-access"

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

  if (!(await canAccessCase(auth, id))) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  const [{ data: caseRow }, { data: department }] = await Promise.all([
    auth.service
      .from("cases")
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

  if (!caseRow || !department) {
    return NextResponse.json({ error: "Case or department not found." }, { status: 404 })
  }

  const canShare =
    auth.profile.is_admin || caseRow.department_id === auth.profile.department_id || caseRow.department_id === null

  if (!canShare) {
    return NextResponse.json({ error: "You cannot share this case." }, { status: 403 })
  }

  const { error } = await auth.service.from("case_shares").upsert(
    {
      case_id: caseRow.id,
      department_id: department.id,
      shared_by: auth.userId,
    },
    { onConflict: "case_id,department_id" },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
