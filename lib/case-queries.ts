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
    profiles!case_assignments_profile_id_fkey(
      id,
      full_name,
      email,
      avatar_url,
      clinical_role,
      department_id,
      departments(id, name)
    )
  )
`

export const recordSelect = `
  *,
  case_images(*),
  case_record_findings(*),
  case_record_reports(*)
`
