import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { sendHighRiskAlertEmail } from "@/lib/resend"

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

  const [{ data: alert, error: alertError }, { data: department, error: departmentError }] = await Promise.all([
    (auth.service.from("alerts") as any)
      .select("*, studies(*, patients(external_id))")
      .eq("id", id)
      .eq("organization_id", auth.profile.organization_id!)
      .single(),
    auth.service
      .from("departments")
      .select("*")
      .eq("id", body.departmentId)
      .eq("organization_id", auth.profile.organization_id!)
      .single(),
  ])

  if (alertError || !alert || departmentError || !department) {
    return NextResponse.json({ error: "Alert or department not found." }, { status: 404 })
  }

  const alertRow = alert as any

  const { error: shareError } = await auth.service.from("study_shares").upsert(
    {
      study_id: alertRow.study_id,
      department_id: department.id,
      shared_by: auth.userId,
    },
    { onConflict: "study_id,department_id" },
  )

  if (shareError) {
    return NextResponse.json({ error: shareError.message }, { status: 500 })
  }

  const notifiedDepartments = Array.from(new Set([...(alertRow.notified_departments ?? []), department.name]))
  const { error: updateError } = await auth.service
    .from("alerts")
    .update({ notified_departments: notifiedDepartments })
    .eq("id", alertRow.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const [{ data: members }, { data: organization }] = await Promise.all([
    auth.service.from("profiles").select("email").eq("department_id", department.id),
    auth.service.from("organizations").select("name").eq("id", auth.profile.organization_id!).single(),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://radiant.trymindcore.com"
  const patientId = alertRow.studies?.patients?.external_id ?? "Unknown"

  await Promise.allSettled(
    (members ?? []).map((member) =>
      sendHighRiskAlertEmail({
        to: member.email,
        patientId,
        studyUrl: `${appUrl}/`,
        riskScore: alertRow.risk_score,
        topFinding: alertRow.title,
        organizationName: organization?.name ?? "Radiant",
      }),
    ),
  )

  return NextResponse.json({ notifiedDepartments })
}
