import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessCase } from "@/lib/case-access"
import { mapCaseRows, mapRecordRowWithUrls } from "@/lib/case-mappers"
import { caseSelect, recordSelect } from "@/lib/case-queries"
import type { StudyModality } from "@/lib/supabase/types"

type Context = {
  params: Promise<{ id: string }>
}

type RecordPayload = {
  notes?: string
  clinicalChecks?: Record<string, unknown>
  modality?: StudyModality
  bodyPart?: string
}

const allowedModalities: StudyModality[] = ["xray", "ct", "mri", "ultrasound"]

export async function POST(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  if (!(await canAccessCase(auth, id))) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  const body = (await request.json()) as RecordPayload
  const modality = body.modality && allowedModalities.includes(body.modality) ? body.modality : "xray"

  const { data: record, error } = await auth.service
    .from("case_records")
    .insert({
      organization_id: auth.profile.organization_id!,
      case_id: id,
      modality,
      body_part: body.bodyPart?.trim() || "Chest",
      notes: body.notes?.trim() || null,
      clinical_checks: (body.clinicalChecks ?? {}) as any,
      status: "uploaded",
      created_by: auth.userId,
    })
    .select(recordSelect)
    .single()

  if (error || !record) {
    return NextResponse.json({ error: error?.message ?? "Could not create record." }, { status: 500 })
  }

  const [{ data: caseRows }, recordView] = await Promise.all([
    (auth.service.from("cases") as any).select(caseSelect).eq("id", id),
    mapRecordRowWithUrls(auth.service, record as any),
  ])
  const [caseView] = await mapCaseRows(auth.service, caseRows ?? [])

  return NextResponse.json({ record: recordView, case: caseView })
}
