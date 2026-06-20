"use client"

import { useApp } from "@/lib/app-context"
import { Welcome } from "@/components/onboarding/welcome"
import { Login } from "@/components/onboarding/login"
import { ProfileSetup } from "@/components/onboarding/profile-setup"
import { RoleSelect } from "@/components/onboarding/role-select"
import { HospitalSetup } from "@/components/onboarding/hospital-setup"
import { AiReadiness } from "@/components/onboarding/ai-readiness"
import { Shell } from "@/components/dashboard/shell"

export function AppRouter() {
  const { stage } = useApp()

  switch (stage) {
    case "welcome":
      return <Welcome />
    case "login":
      return <Login />
    case "profile":
      return <ProfileSetup />
    case "role":
      return <RoleSelect />
    case "setup":
      return <HospitalSetup />
    case "readiness":
      return <AiReadiness />
    case "app":
      return <Shell />
    default:
      return <Welcome />
  }
}
