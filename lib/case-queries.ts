export const caseSelect = `
  *,
  clients(*),
  case_records(
    *,
    case_images(*),
    case_record_findings(*),
    case_record_reports(*)
  ),
  case_assignments(
    *,
    profiles!case_assignments_profile_id_fkey(id, full_name, email, clinical_role)
  )
`

export const recordSelect = `
  *,
  case_images(*),
  case_record_findings(*),
  case_record_reports(*)
`
