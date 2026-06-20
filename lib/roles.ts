import type { ClinicalRole } from "@/lib/supabase/types"

export const clinicalRoleLabels: Record<ClinicalRole, string> = {
  radiologist: "Radiologist",
  emergency_doctor: "Emergency Doctor",
  department_doctor: "Department Doctor",
  administrator: "Administrator",
}

export function formatClinicalRole(role: ClinicalRole | null | undefined) {
  return role ? clinicalRoleLabels[role] : "Radiologist"
}

export function parseClinicalRole(value: string): ClinicalRole {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_")
  if (normalized === "radiologist") return "radiologist"
  if (normalized === "emergency_doctor") return "emergency_doctor"
  if (normalized === "department_doctor" || normalized === "department_physician") return "department_doctor"
  if (normalized === "administrator") return "administrator"
  return "radiologist"
}
