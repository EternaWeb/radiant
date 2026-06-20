"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Patient } from "@/lib/data"

export type Stage = "welcome" | "login" | "role" | "setup" | "readiness" | "app"
export type Section =
  | "dashboard"
  | "imaging"
  | "pacs"
  | "reports"
  | "alerts"
  | "departments"
  | "analytics"
  | "settings"

type AppState = {
  stage: Stage
  setStage: (s: Stage) => void
  section: Section
  setSection: (s: Section) => void
  role: string | null
  setRole: (r: string) => void
  hospital: { name: string; department: string }
  setHospital: (h: { name: string; department: string }) => void
  selectedPatient: Patient | null
  setSelectedPatient: (p: Patient | null) => void
  openPatient: (p: Patient) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("welcome")
  const [section, setSection] = useState<Section>("dashboard")
  const [role, setRole] = useState<string | null>(null)
  const [hospital, setHospital] = useState({ name: "St. Vincent Medical Center", department: "Radiology" })
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  function openPatient(p: Patient) {
    setSelectedPatient(p)
    setSection("imaging")
  }

  return (
    <Ctx.Provider
      value={{
        stage,
        setStage,
        section,
        setSection,
        role,
        setRole,
        hospital,
        setHospital,
        selectedPatient,
        setSelectedPatient,
        openPatient,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
