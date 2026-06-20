import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessCase } from "@/lib/case-access"
import { mapCaseRows } from "@/lib/case-mappers"
import { caseSelect } from "@/lib/case-queries"
import type { CaseAssignmentRole } from "@/lib/supabase/types"

type Context = {
  params: Promise<{ id: string }>
}

type AssignmentPayload = {
  profileId?: string
  role?: CaseAssignmentRole
}

const allowedRoles: CaseAssignmentRole[] = ["primary", "emergency"]

async function reloadCase(auth: Awaited<ReturnType<typeof requireCompletedProfile>>, caseId: string) {
  if (isApiError(auth)) return null

  const { data } = await (auth.service.from("cases") as any).select(caseSelect).eq("id", caseId)
  const [caseView] = await mapCaseRows(auth.service, data ?? [])
  return caseView
}

export async function POST(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  if (!auth.profile.is_admin) {
    return NextResponse.json({ error: "Only admins can assign doctors to cases." }, { status: 403 })
  }

  const { id } = await context.params
  if (!(await canAccessCase(auth, id))) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  const body = (await request.json()) as AssignmentPayload
  const role = body.role && allowedRoles.includes(body.role) ? body.role : "primary"

  if (!body.profileId) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 })
  }

  const { data: profile } = await auth.service
    .from("profiles")
    .select("id")
    .eq("id", body.profileId)
    .eq("organization_id", auth.profile.organization_id!)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 })
  }

  const { error } = await auth.service.from("case_assignments").upsert(
    {
      case_id: id,
      profile_id: body.profileId,
      role,
      assigned_by: auth.userId,
    },
    { onConflict: "case_id,profile_id,role" },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ case: await reloadCase(auth, id) })
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  if (!auth.profile.is_admin) {
    return NextResponse.json({ error: "Only admins can remove case assignments." }, { status: 403 })
  }

  const { id } = await context.params
  const body = (await request.json()) as AssignmentPayload

  if (!body.profileId) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 })
  }

  let deleteBuilder = auth.service.from("case_assignments").delete().eq("case_id", id).eq("profile_id", body.profileId)
  if (body.role && allowedRoles.includes(body.role)) {
    deleteBuilder = deleteBuilder.eq("role", body.role)
  }

  const { error } = await deleteBuilder
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ case: await reloadCase(auth, id) })
}
