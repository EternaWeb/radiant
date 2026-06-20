import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapStudyRows } from "@/lib/study-mappers"
import type { StudyModality } from "@/lib/supabase/types"

const modalities: StudyModality[] = ["xray", "ct", "mri", "ultrasound"]

export async function GET(request: Request) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const url = new URL(request.url)
  const modality = url.searchParams.get("modality") as StudyModality | null
  const query = url.searchParams.get("query")?.trim().toLowerCase()

  let requestBuilder = (auth.service.from("studies") as any)
    .select(
      `
      *,
      patients(external_id, display_name),
      study_findings(*),
      reports(*),
      study_clinical_context(*)
    `,
    )
    .eq("organization_id", auth.profile.organization_id!)
    .order("created_at", { ascending: false })

  if (modality && modalities.includes(modality)) {
    requestBuilder = requestBuilder.eq("modality", modality)
  }

  const { data, error } = await requestBuilder

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let rows = (data ?? []) as any[]

  if (!auth.profile.is_admin) {
    const { data: shares } = auth.profile.department_id
      ? await auth.service.from("study_shares").select("study_id").eq("department_id", auth.profile.department_id)
      : { data: [] }
    const sharedIds = new Set((shares ?? []).map((share) => share.study_id))

    rows = rows.filter((study) => study.department_id === auth.profile.department_id || sharedIds.has(study.id))
  }

  const studies = await mapStudyRows(auth.service, rows)
  const filtered = query
    ? studies.filter(
        (study) =>
          study.name.toLowerCase().includes(query) ||
          study.patientId.toLowerCase().includes(query) ||
          study.bodyPart.toLowerCase().includes(query),
      )
    : studies

  return NextResponse.json({ studies: filtered })
}
