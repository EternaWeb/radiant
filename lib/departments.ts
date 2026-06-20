export type DefaultDepartment = {
  name: string
  icon: string
  location: string
}

export const DEFAULT_DEPARTMENTS: DefaultDepartment[] = [
  { name: "Radiology", icon: "scan", location: "Main campus" },
  { name: "Neurology", icon: "brain", location: "Main campus" },
  { name: "Emergency", icon: "ambulance", location: "Main campus" },
  { name: "Cardiology", icon: "heart", location: "Main campus" },
]

export const DEPARTMENT_ICONS = ["scan", "brain", "ambulance", "heart"] as const

export function iconForDepartmentName(name: string): string {
  const match = DEFAULT_DEPARTMENTS.find((dept) => dept.name.toLowerCase() === name.trim().toLowerCase())
  return match?.icon ?? "scan"
}
