export type RiskLevel = "low" | "medium" | "high"

export type Patient = {
  id: string
  name: string
  patientId: string
  modality: "X-Ray" | "CT" | "MRI" | "Ultrasound"
  bodyPart: string
  risk: number
  date: string
  status: "Pending" | "Reviewed" | "Critical"
  image: string
  findings: { label: string; confidence: number }[]
  summary: string
  comparison: string
  recommendation: string
}

export function riskLevel(risk: number): RiskLevel {
  if (risk >= 70) return "high"
  if (risk >= 40) return "medium"
  return "low"
}

export const kpis = [
  { label: "Images Processed Today", value: "1,284", delta: "+18%", trend: "up" as const, accent: "primary" as const },
  { label: "High Risk Cases", value: "37", delta: "+4 today", trend: "up" as const, accent: "danger" as const },
  { label: "Average Detection Time", value: "12s", delta: "-2s", trend: "down" as const, accent: "success" as const },
  { label: "Departments Connected", value: "12", delta: "Live", trend: "flat" as const, accent: "primary" as const },
]

export const patients: Patient[] = [
  {
    id: "p1",
    name: "Patient A — M. Carter",
    patientId: "PT-10293",
    modality: "X-Ray",
    bodyPart: "Chest",
    risk: 12,
    date: "Jun 20, 2026",
    status: "Reviewed",
    image: "/scans/chest-xray.png",
    findings: [
      { label: "No acute abnormality", confidence: 96 },
      { label: "Clear lung fields", confidence: 91 },
    ],
    summary: "No significant findings. Lung fields are clear with no signs of consolidation or effusion.",
    comparison: "Stable compared to prior study from May 2.",
    recommendation: "Routine follow-up. No immediate action required.",
  },
  {
    id: "p2",
    name: "Patient B — S. Nguyen",
    patientId: "PT-10294",
    modality: "CT",
    bodyPart: "Abdomen",
    risk: 78,
    date: "Jun 20, 2026",
    status: "Pending",
    image: "/scans/ct-abdomen.png",
    findings: [
      { label: "Hepatic lesion detected", confidence: 84 },
      { label: "Mild splenomegaly", confidence: 71 },
    ],
    summary: "Suspicious hepatic lesion identified in the right lobe measuring approximately 2.4 cm.",
    comparison: "New finding not present on prior imaging.",
    recommendation: "Recommend contrast-enhanced MRI and specialist referral.",
  },
  {
    id: "p3",
    name: "Patient C — D. Okafor",
    patientId: "PT-10295",
    modality: "MRI",
    bodyPart: "Brain",
    risk: 91,
    date: "Jun 20, 2026",
    status: "Critical",
    image: "/scans/mri-brain.png",
    findings: [
      { label: "Acute ischemic changes", confidence: 92 },
      { label: "Possible vessel occlusion", confidence: 88 },
    ],
    summary: "Findings consistent with acute ischemic stroke in the left middle cerebral artery territory.",
    comparison: "Rapid progression vs. baseline 6 hours ago.",
    recommendation: "Immediate neurology and stroke team activation.",
  },
  {
    id: "p4",
    name: "Patient D — L. Schmidt",
    patientId: "PT-10296",
    modality: "X-Ray",
    bodyPart: "Chest",
    risk: 92,
    date: "Jun 20, 2026",
    status: "Critical",
    image: "/scans/chest-xray.png",
    findings: [
      { label: "Possible Pneumonia", confidence: 92 },
      { label: "Lung Opacity Detected", confidence: 87 },
    ],
    summary: "Signs consistent with left lower lobe pneumonia. Focal airspace opacity noted.",
    comparison: "Previous image from Jan 4: +12% increase in opacity.",
    recommendation: "Immediate radiologist review and clinical correlation advised.",
  },
  {
    id: "p5",
    name: "Patient E — R. Alvarez",
    patientId: "PT-10297",
    modality: "Ultrasound",
    bodyPart: "Thyroid",
    risk: 34,
    date: "Jun 19, 2026",
    status: "Reviewed",
    image: "/scans/ct-abdomen.png",
    findings: [
      { label: "Benign-appearing nodule", confidence: 79 },
      { label: "Normal vascularity", confidence: 83 },
    ],
    summary: "Small thyroid nodule with benign sonographic features.",
    comparison: "Unchanged from prior ultrasound.",
    recommendation: "Routine surveillance in 12 months.",
  },
  {
    id: "p6",
    name: "Patient F — K. Bauer",
    patientId: "PT-10298",
    modality: "CT",
    bodyPart: "Chest",
    risk: 58,
    date: "Jun 19, 2026",
    status: "Pending",
    image: "/scans/ct-abdomen.png",
    findings: [
      { label: "Indeterminate pulmonary nodule", confidence: 66 },
      { label: "No lymphadenopathy", confidence: 81 },
    ],
    summary: "8mm indeterminate pulmonary nodule in the right upper lobe.",
    comparison: "Not clearly seen on prior exam.",
    recommendation: "Short-interval follow-up CT in 3 months.",
  },
]

export const alerts = [
  {
    id: "a1",
    title: "Possible Stroke Detected",
    patientId: "#2841",
    risk: 96,
    modality: "MRI — Brain",
    time: "2 min ago",
    departments: ["Neurology", "Emergency", "ICU"],
  },
  {
    id: "a2",
    title: "Acute Pneumonia — Bilateral",
    patientId: "#2839",
    risk: 88,
    modality: "X-Ray — Chest",
    time: "14 min ago",
    departments: ["Pulmonology", "Emergency"],
  },
  {
    id: "a3",
    title: "Hepatic Lesion — Suspicious",
    patientId: "#2835",
    risk: 81,
    modality: "CT — Abdomen",
    time: "38 min ago",
    departments: ["Oncology", "General Surgery"],
  },
]

export type StaffMember = {
  id: string
  name: string
  role: string
  email: string
  phone: string
  shift: string
  status: "Online" | "On call" | "Off duty"
}

export type Department = {
  id: string
  name: string
  icon: string
  lead: string
  location: string
  staff: StaffMember[]
}

export const departmentRoles = [
  "Radiologist",
  "Emergency Doctor",
  "Department Doctor",
  "Administrator",
]

export const orgDepartments: Department[] = [
  {
    id: "d1",
    name: "Radiology",
    icon: "scan",
    lead: "Dr. Alex Smith",
    location: "Building A · Floor 3",
    staff: [
      { id: "s1", name: "Dr. Alex Smith", role: "Radiologist", email: "a.smith@medvision.io", phone: "+1 (415) 555-0112", shift: "Day · 7a–4p", status: "Online" },
      { id: "s2", name: "Dr. Maya Patel", role: "Radiologist", email: "m.patel@medvision.io", phone: "+1 (415) 555-0134", shift: "Day · 8a–5p", status: "Online" },
      { id: "s3", name: "James Lee", role: "Technologist", email: "j.lee@medvision.io", phone: "+1 (415) 555-0188", shift: "Swing · 2p–10p", status: "On call" },
      { id: "s4", name: "Nora Davis", role: "Resident", email: "n.davis@medvision.io", phone: "+1 (415) 555-0190", shift: "Night · 10p–7a", status: "Off duty" },
    ],
  },
  {
    id: "d2",
    name: "Neurology",
    icon: "brain",
    lead: "Dr. D. Okafor",
    location: "Building B · Floor 2",
    staff: [
      { id: "s5", name: "Dr. Daniel Okafor", role: "Department Physician", email: "d.okafor@medvision.io", phone: "+1 (415) 555-0210", shift: "Day · 7a–4p", status: "On call" },
      { id: "s6", name: "Dr. Lena Vogel", role: "Radiologist", email: "l.vogel@medvision.io", phone: "+1 (415) 555-0233", shift: "Day · 9a–6p", status: "Online" },
      { id: "s7", name: "Priya Shah", role: "Nurse", email: "p.shah@medvision.io", phone: "+1 (415) 555-0241", shift: "Swing · 2p–10p", status: "Off duty" },
    ],
  },
  {
    id: "d3",
    name: "Emergency",
    icon: "ambulance",
    lead: "Dr. R. Alvarez",
    location: "Building A · Ground Floor",
    staff: [
      { id: "s8", name: "Dr. Rosa Alvarez", role: "Department Physician", email: "r.alvarez@medvision.io", phone: "+1 (415) 555-0301", shift: "Day · 7a–7p", status: "Online" },
      { id: "s9", name: "Tom Becker", role: "Nurse", email: "t.becker@medvision.io", phone: "+1 (415) 555-0322", shift: "Night · 7p–7a", status: "On call" },
      { id: "s10", name: "Aisha Khan", role: "Technologist", email: "a.khan@medvision.io", phone: "+1 (415) 555-0345", shift: "Day · 8a–5p", status: "Online" },
      { id: "s11", name: "Marco Rossi", role: "Resident", email: "m.rossi@medvision.io", phone: "+1 (415) 555-0367", shift: "Swing · 2p–10p", status: "Off duty" },
    ],
  },
  {
    id: "d4",
    name: "Cardiology",
    icon: "heart",
    lead: "Dr. K. Bauer",
    location: "Building C · Floor 1",
    staff: [
      { id: "s12", name: "Dr. Karl Bauer", role: "Department Physician", email: "k.bauer@medvision.io", phone: "+1 (415) 555-0410", shift: "Day · 8a–5p", status: "Online" },
      { id: "s13", name: "Emma Wright", role: "Nurse", email: "e.wright@medvision.io", phone: "+1 (415) 555-0432", shift: "Day · 7a–4p", status: "On call" },
    ],
  },
]

export const sharedDepartments = [
  { name: "Cardiology", icon: "heart", status: "Viewed 2 min ago", active: true },
  { name: "Neurology", icon: "brain", status: "Reviewing now", active: true },
  { name: "Emergency", icon: "ambulance", status: "Notified", active: true },
  { name: "General Surgery", icon: "stethoscope", status: "Pending", active: false },
]

export const modalityData = [
  { name: "X-Ray", value: 642, fill: "var(--color-chart-1)" },
  { name: "CT", value: 384, fill: "var(--color-chart-2)" },
  { name: "MRI", value: 196, fill: "var(--color-chart-3)" },
  { name: "Ultrasound", value: 132, fill: "var(--color-chart-5)" },
]

export const riskTrendData = [
  { day: "Mon", high: 22, medium: 48 },
  { day: "Tue", high: 28, medium: 52 },
  { day: "Wed", high: 19, medium: 44 },
  { day: "Thu", high: 34, medium: 61 },
  { day: "Fri", high: 31, medium: 57 },
  { day: "Sat", high: 26, medium: 49 },
  { day: "Sun", high: 37, medium: 63 },
]

export const departmentUsageData = [
  { dept: "Radiology", scans: 480 },
  { dept: "Emergency", scans: 312 },
  { dept: "Cardiology", scans: 264 },
  { dept: "Neurology", scans: 198 },
  { dept: "Oncology", scans: 156 },
  { dept: "Surgery", scans: 121 },
]

export const roles = [
  {
    id: "radiologist",
    title: "Radiologist",
    icon: "scan",
    description: "Full imaging suite, AI overlays, and diagnostic reporting.",
  },
  {
    id: "department_doctor",
    title: "Department Doctor",
    icon: "hospital",
    description: "Patient-centric views and cross-department collaboration.",
  },
  {
    id: "emergency_doctor",
    title: "Emergency Doctor",
    icon: "ambulance",
    description: "Real-time critical alerts and rapid triage workflows.",
  },
  {
    id: "administrator",
    title: "Administrator",
    icon: "chart",
    description: "Workspace setup, team management, and department oversight.",
  },
]
