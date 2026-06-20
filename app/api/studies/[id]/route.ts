import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapStudyRows } from "@/lib/study-mappers"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  const { data, error } = await (auth.service.from("studies") as any)
    .select(
      `
      *,
      patients(external_id, display_name),
      study_findings(*),
      reports(*),
      study_clinical_context(*),
      study_shares(department_id)
    `,
    )
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: "Study not found." }, { status: 404 })
  }

  const study = data as any
  const shares = ((study.study_shares ?? []) as { department_id: string }[]).map((share) => share.department_id)
  const canView =
    auth.profile.is_admin ||
    study.department_id === auth.profile.department_id ||
    (auth.profile.department_id ? shares.includes(auth.profile.department_id) : false)

  if (!canView) {
    return NextResponse.json({ error: "Study not found." }, { status: 404 })
  }

  const [view] = await mapStudyRows(auth.service, [study])

  return NextResponse.json({ study: view })
}
