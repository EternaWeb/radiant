import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { filterAccessibleCases } from "@/lib/case-access"
import { mapCaseRows } from "@/lib/case-mappers"
import { caseSelect } from "@/lib/case-queries"

export async function GET(request: Request) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const url = new URL(request.url)
  const query = url.searchParams.get("query")?.trim().toLowerCase()

  const { data, error } = await (auth.service.from("cases") as any)
    .select(caseSelect)
    .eq("organization_id", auth.profile.organization_id!)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const accessible = await filterAccessibleCases(auth, (data ?? []) as any[])
  const cases = await mapCaseRows(auth.service, accessible)
  const filtered = query
    ? cases.filter((caseView) =>
        [
          caseView.title,
          caseView.client.name,
          caseView.client.clientCode,
          caseView.records.at(-1)?.summary ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : cases

  return NextResponse.json({ cases: filtered })
}
