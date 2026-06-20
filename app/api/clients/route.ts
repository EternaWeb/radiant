import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapClientRows } from "@/lib/case-mappers"

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
  if (typeof value !== "string" || !value.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return value.slice(0, 10)
}

export async function GET(request: Request) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const url = new URL(request.url)
  const query = url.searchParams.get("query")?.trim().toLowerCase()

  const { data, error } = await auth.service
    .from("clients")
    .select("*")
    .eq("organization_id", auth.profile.organization_id!)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const filtered = query
    ? rows.filter((client) =>
        [client.client_code, client.first_name, client.last_name]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : rows

  return NextResponse.json({ clients: mapClientRows(filtered) })
}

export async function POST(request: Request) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const body = (await request.json()) as ClientPayload
  const firstName = body.firstName?.trim()
  const lastName = body.lastName?.trim()
  const dateOfBirth = normalizeDate(body.dateOfBirth)
  const firstVisitDate = normalizeDate(body.firstVisitDate)

  if (!firstName || !lastName || !dateOfBirth) {
    return NextResponse.json({ error: "First name, last name, and date of birth are required." }, { status: 400 })
  }

  const { data, error } = await auth.service
    .from("clients")
    .insert({
      organization_id: auth.profile.organization_id!,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      previous_hospitals: Array.isArray(body.previousHospitals) ? body.previousHospitals.filter(Boolean) : [],
      trauma_history: body.traumaHistory?.trim() || null,
      notes: body.notes?.trim() || null,
      first_visit_date: firstVisitDate,
      created_by: auth.userId,
    })
    .select("*")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create client." }, { status: 500 })
  }

  return NextResponse.json({ client: mapClientRows([data])[0] })
}
