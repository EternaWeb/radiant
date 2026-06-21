import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessRecord } from "@/lib/case-access"
import { mapRecordRowWithUrls } from "@/lib/case-mappers"
import { recordSelect } from "@/lib/case-queries"

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

  const { data, error } = await (auth.service.from("case_records") as any)
    .select(recordSelect)
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Record not found." }, { status: 404 })
  }

  return NextResponse.json({ record: await mapRecordRowWithUrls(auth.service, data) })
}
