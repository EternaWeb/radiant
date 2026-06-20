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
    profiles(id, full_name, email, clinical_role)
  )
`

export const recordSelect = `
  *,
  case_images(*),
  case_record_findings(*),
  case_record_reports(*)
`
