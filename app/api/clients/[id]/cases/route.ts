import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapCaseRows } from "@/lib/case-mappers"
import { caseSelect } from "@/lib/case-queries"

type Context = {
  params: Promise<{ id: string }>
}

type CasePayload = {
  title?: string
}

export async function POST(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  const body = (await request.json()) as CasePayload

  const { data: client } = await auth.service
    .from("clients")
    .select("id, first_name, last_name")
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 })
  }

  const title = body.title?.trim() || `${client.first_name} ${client.last_name} case`
  const { data: caseRow, error } = await auth.service
    .from("cases")
    .insert({
      organization_id: auth.profile.organization_id!,
      client_id: id,
      department_id: auth.profile.department_id,
      title,
      created_by: auth.userId,
    })
    .select("id")
    .single()

  if (error || !caseRow) {
    return NextResponse.json({ error: error?.message ?? "Could not create case." }, { status: 500 })
  }

  const { data: rows, error: reloadError } = await (auth.service.from("cases") as any)
    .select(caseSelect)
    .eq("id", caseRow.id)

  if (reloadError) {
    return NextResponse.json({ error: reloadError.message }, { status: 500 })
  }

  const [caseView] = await mapCaseRows(auth.service, rows ?? [])
  return NextResponse.json({ case: caseView })
}
