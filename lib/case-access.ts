import type { ApiAuthContext } from "@/lib/api-auth"

export async function canAccessCase(auth: ApiAuthContext, caseId: string) {
  const { data: caseRow } = await auth.service
    .from("cases")
    .select("id, organization_id, department_id")
    .eq("id", caseId)
    .eq("organization_id", auth.profile.organization_id!)
    .maybeSingle()

  if (!caseRow) return false
  if (auth.profile.is_admin) return true
  if (!caseRow.department_id || caseRow.department_id === auth.profile.department_id) return true

  const [{ data: assignment }, { data: share }] = await Promise.all([
    auth.service
      .from("case_assignments")
      .select("id")
      .eq("case_id", caseId)
      .eq("profile_id", auth.userId)
      .maybeSingle(),
    auth.profile.department_id
      ? auth.service
          .from("case_shares")
          .select("id")
          .eq("case_id", caseId)
          .eq("department_id", auth.profile.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return Boolean(assignment || share)
}

export async function filterAccessibleCases<T extends { id: string; department_id: string | null }>(
  auth: ApiAuthContext,
  cases: T[],
) {
  if (auth.profile.is_admin) return cases

  const [{ data: shares }, { data: assignments }] = await Promise.all([
    auth.profile.department_id
      ? auth.service.from("case_shares").select("case_id").eq("department_id", auth.profile.department_id)
      : Promise.resolve({ data: [] }),
    auth.service.from("case_assignments").select("case_id").eq("profile_id", auth.userId),
  ])

  const sharedIds = new Set((shares ?? []).map((share) => share.case_id))
  const assignedIds = new Set((assignments ?? []).map((assignment) => assignment.case_id))

  return cases.filter(
    (caseRow) =>
      !caseRow.department_id ||
      caseRow.department_id === auth.profile.department_id ||
      sharedIds.has(caseRow.id) ||
      assignedIds.has(caseRow.id),
  )
}

export async function canAccessRecord(auth: ApiAuthContext, recordId: string) {
  const { data: record } = await auth.service
    .from("case_records")
    .select("id, case_id")
    .eq("id", recordId)
    .eq("organization_id", auth.profile.organization_id!)
    .maybeSingle()

  if (!record) return false
  return canAccessCase(auth, record.case_id)
}
