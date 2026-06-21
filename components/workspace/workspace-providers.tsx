"use client"

import type { ReactNode } from "react"
import { DashboardDataProvider } from "@/lib/dashboard-data"

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>
}
