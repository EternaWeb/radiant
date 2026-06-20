"use client"

import {
  LayoutDashboard,
  ScanLine,
  FolderArchive,
  FileText,
  TriangleAlert,
  Users,
  BarChart3,
  Settings,
  Activity,
  Search,
  Bell,
  type LucideIcon,
} from "lucide-react"
import { useApp, type Section } from "@/lib/app-context"
import { formatClinicalRole } from "@/lib/roles"
import { useAlerts } from "@/lib/use-studies"
import { DashboardHome } from "./sections/home"
import { PatientAnalysis } from "./sections/patient-analysis"
import { PacsArchive } from "./sections/pacs-archive"
import { AlertsCenter } from "./sections/alerts-center"
import { Departments } from "./sections/departments"
import { Analytics } from "./sections/analytics"
import { Reports } from "./sections/reports"
import { SettingsView } from "./sections/settings"

const nav: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "imaging", label: "Imaging", icon: ScanLine },
  { id: "pacs", label: "PACS", icon: FolderArchive },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "alerts", label: "Alerts", icon: TriangleAlert },
  { id: "departments", label: "Departments", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

const titles: Record<Section, string> = {
  dashboard: "Dashboard",
  imaging: "Imaging & Analysis",
  pacs: "PACS Archive",
  reports: "Diagnostic Reports",
  alerts: "Alerts Center",
  departments: "Departments",
  analytics: "Analytics",
  settings: "Settings",
}

export function Shell() {
  const { section, setSection, profile } = useApp()
  const { alerts } = useAlerts()
  const displayName = profile?.full_name ?? "Radiant user"
  const displayRole = formatClinicalRole(profile?.clinical_role)

  return (
    <div className="flex min-h-svh bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-svh w-16 flex-col items-center border-r border-border bg-sidebar py-4 lg:w-60 lg:items-stretch lg:px-3">
        <div className="mb-6 flex items-center gap-2 lg:px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden text-base font-semibold tracking-tight lg:block">MedVision AI</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ id, label, icon: Icon }) => {
            const active = section === id
            const showBadge = id === "alerts"
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                title={label}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:block">{label}</span>
                {showBadge && (
                  <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white lg:static lg:ml-auto">
                    {alerts.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-4 hidden items-center gap-2 rounded-lg bg-sidebar-accent p-2 lg:flex">
          <img
            src="/avatar-doctor.png"
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{displayRole}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/80 px-5 py-3 backdrop-blur">
          <h1 className="text-lg font-semibold tracking-tight">{titles[section]}</h1>
          <div className="ml-auto hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 sm:flex">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search patients, studies…"
              className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 lg:w-56"
            />
          </div>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <img src="/avatar-doctor.png" alt={displayName} className="h-9 w-9 rounded-full object-cover" />
        </header>

        <main className="flex-1 p-5 md:p-6">
          {section === "dashboard" && <DashboardHome />}
          {section === "imaging" && <PatientAnalysis />}
          {section === "pacs" && <PacsArchive />}
          {section === "reports" && <Reports />}
          {section === "alerts" && <AlertsCenter />}
          {section === "departments" && <Departments />}
          {section === "analytics" && <Analytics />}
          {section === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  )
}
