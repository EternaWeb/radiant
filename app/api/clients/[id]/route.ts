import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapCaseRows, mapClientRows } from "@/lib/case-mappers"
import { filterAccessibleCases } from "@/lib/case-access"
import { caseSelect } from "@/lib/case-queries"

type Context = {
  params: Promise<{ id: string }>
}

type ClientPayload = {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  previousHospitals?: string[]
  traumaHistory?: string
  notes?: string
  firstVisitDate?: string
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return value.slice(0, 10)
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  const [{ data: client, error: clientError }, { data: cases, error: casesError }] = await Promise.all([
    auth.service
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.profile.organization_id!)
      .single(),
    (auth.service.from("cases") as any)
      .select(caseSelect)
      .eq("client_id", id)
      .eq("organization_id", auth.profile.organization_id!)
      .order("created_at", { ascending: false }),
  ])

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 })
  }

  if (casesError) {
    return NextResponse.json({ error: casesError.message }, { status: 500 })
  }

  const accessible = await filterAccessibleCases(auth, (cases ?? []) as any[])
  return NextResponse.json({
    client: mapClientRows([client])[0],
    cases: await mapCaseRows(auth.service, accessible),
  })
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  const body = (await request.json()) as ClientPayload
  const patch: Record<string, unknown> = {}

  if (body.firstName !== undefined) patch.first_name = body.firstName.trim()
  if (body.lastName !== undefined) patch.last_name = body.lastName.trim()
  if (body.dateOfBirth !== undefined) patch.date_of_birth = normalizeDate(body.dateOfBirth)
  if (body.previousHospitals !== undefined) patch.previous_hospitals = body.previousHospitals.filter(Boolean)
  if (body.traumaHistory !== undefined) patch.trauma_history = body.traumaHistory.trim() || null
  if (body.notes !== undefined) patch.notes = body.notes.trim() || null
  if (body.firstVisitDate !== undefined) patch.first_visit_date = normalizeDate(body.firstVisitDate) ?? null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No client fields were provided." }, { status: 400 })
  }

  const { data, error } = await auth.service
    .from("clients")
    .update(patch as any)
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .select("*")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Client not found." }, { status: 404 })
  }

  return NextResponse.json({ client: mapClientRows([data])[0] })
}
