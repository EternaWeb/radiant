import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapAlerts } from "@/lib/study-mappers"

export async function GET() {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const [{ data: alerts, error: alertsError }, { data: departments, error: departmentsError }] = await Promise.all([
    auth.service
      .from("alerts")
      .select("*, studies(*, patients(external_id))")
      .eq("organization_id", auth.profile.organization_id!)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false }),
    auth.service
      .from("departments")
      .select("id, name")
      .eq("organization_id", auth.profile.organization_id!)
      .order("name", { ascending: true }),
  ])

  if (alertsError || departmentsError) {
    return NextResponse.json({ error: alertsError?.message ?? departmentsError?.message }, { status: 500 })
  }

  return NextResponse.json({ alerts: mapAlerts(alerts ?? [], departments ?? []) })
}
