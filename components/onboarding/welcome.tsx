"use client"

import { LandingPage } from "@/components/landing/landing-page"
import { useApp } from "@/lib/app-context"

export function Welcome() {
  const { setStage } = useApp()

  return (
    <LandingPage
      onSignIn={() => setStage("login")}
      onRequestAccess={() => setStage("login")}
    />
  )
}
