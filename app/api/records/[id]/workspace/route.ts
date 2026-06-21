import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessRecord } from "@/lib/case-access"
import { mapCaseRows, mapRecordRowWithUrls } from "@/lib/case-mappers"
import { caseSelect, recordSelect } from "@/lib/case-queries"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  if (!(await canAccessRecord(auth, id))) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 })
  }

  const { data: recordRow, error: recordError } = await (auth.service.from("case_records") as any)
    .select(recordSelect)
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .single()

  if (recordError || !recordRow) {
    return NextResponse.json({ error: recordError?.message ?? "Record not found." }, { status: 404 })
  }

  const { data: caseRows, error: caseError } = await (auth.service.from("cases") as any)
    .select(caseSelect)
    .eq("id", recordRow.case_id)
    .eq("organization_id", auth.profile.organization_id!)

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 })
  }

  const [record, mappedCases] = await Promise.all([
    mapRecordRowWithUrls(auth.service, recordRow),
    mapCaseRows(auth.service, caseRows ?? []),
  ])
  const caseView = mappedCases[0] ?? null

  if (!caseView) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 })
  }

  return NextResponse.json({ record, case: caseView })
}
