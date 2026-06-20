import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessCase } from "@/lib/case-access"
import { mapCaseRows } from "@/lib/case-mappers"
import { caseSelect } from "@/lib/case-queries"
import type { CaseStatus } from "@/lib/supabase/types"

type Context = {
  params: Promise<{ id: string }>
}

type CasePayload = {
  title?: string
  status?: CaseStatus
}

const allowedStatuses: CaseStatus[] = ["open", "closed"]

export async function GET(_request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  if (!(await canAccessCase(auth, id))) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  const { data, error } = await (auth.service.from("cases") as any)
    .select(caseSelect)
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const [caseView] = await mapCaseRows(auth.service, data ?? [])
  if (!caseView) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  return NextResponse.json({ case: caseView })
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  if (!(await canAccessCase(auth, id))) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  const body = (await request.json()) as CasePayload
  const patch: Record<string, unknown> = {}

  if (body.title !== undefined) patch.title = body.title.trim() || "Untitled case"
  if (body.status !== undefined && allowedStatuses.includes(body.status)) patch.status = body.status

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No case fields were provided." }, { status: 400 })
  }

  const { error } = await auth.service
    .from("cases")
    .update(patch as any)
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: rows, error: reloadError } = await (auth.service.from("cases") as any)
    .select(caseSelect)
    .eq("id", id)

  if (reloadError) {
    return NextResponse.json({ error: reloadError.message }, { status: 500 })
  }

  const [caseView] = await mapCaseRows(auth.service, rows ?? [])
  return NextResponse.json({ case: caseView })
}
