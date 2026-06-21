"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { CaseAlertView, CaseView } from "@/lib/cases"

const CASES_POLL_MS = 30_000
const ALERTS_POLL_MS = 30_000

type DashboardDataContextValue = {
  cases: CaseView[]
  casesLoading: boolean
  casesError: string | null
  refreshCases: (options?: { silent?: boolean }) => Promise<void>
  patchCase: (caseView: CaseView) => void
  removeCase: (caseId: string) => void
  prependCase: (caseView: CaseView) => void
  alerts: CaseAlertView[]
  alertsLoading: boolean
  alertsError: string | null
  refreshAlerts: (options?: { silent?: boolean }) => Promise<void>
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null)

function useVisibilityPolling(intervalMs: number, tick: () => void) {
  useEffect(() => {
    tick()

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") tick()
    }, intervalMs)

    function onVisible() {
      if (document.visibilityState === "visible") tick()
    }

    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [intervalMs, tick])
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<CaseView[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [casesError, setCasesError] = useState<string | null>(null)

  const [alerts, setAlerts] = useState<CaseAlertView[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertsError, setAlertsError] = useState<string | null>(null)

  const casesInflight = useRef<Promise<void> | null>(null)
  const alertsInflight = useRef<Promise<void> | null>(null)

  const refreshCases = useCallback(async (options?: { silent?: boolean }) => {
    if (casesInflight.current) return casesInflight.current

    const run = async () => {
      if (!options?.silent) setCasesLoading(true)
      setCasesError(null)

      try {
        const response = await fetch("/api/cases")
        const payload = (await response.json()) as { cases?: CaseView[]; error?: string }

        if (!response.ok) {
          setCasesError(payload.error ?? "Could not load cases.")
          setCasesLoading(false)
          return
        }

        setCases(payload.cases ?? [])
        setCasesLoading(false)
      } catch (error) {
        setCasesError(error instanceof Error ? error.message : "Could not load cases.")
        setCasesLoading(false)
      }
    }

    casesInflight.current = run().finally(() => {
      casesInflight.current = null
    })

    return casesInflight.current
  }, [])

  const refreshAlerts = useCallback(async (options?: { silent?: boolean }) => {
    if (alertsInflight.current) return alertsInflight.current

    const run = async () => {
      if (!options?.silent) setAlertsLoading(true)
      setAlertsError(null)

      try {
        const response = await fetch("/api/alerts")
        const payload = (await response.json()) as { alerts?: CaseAlertView[]; error?: string }

        if (!response.ok) {
          setAlertsError(payload.error ?? "Could not load alerts.")
          setAlertsLoading(false)
          return
        }

        setAlerts(payload.alerts ?? [])
        setAlertsLoading(false)
      } catch (error) {
        setAlertsError(error instanceof Error ? error.message : "Could not load alerts.")
        setAlertsLoading(false)
      }
    }

    alertsInflight.current = run().finally(() => {
      alertsInflight.current = null
    })

    return alertsInflight.current
  }, [])

  const patchCase = useCallback((caseView: CaseView) => {
    setCases((current) => {
      const index = current.findIndex((item) => item.id === caseView.id)
      if (index === -1) return [caseView, ...current]
      const next = current.slice()
      next[index] = caseView
      return next
    })
  }, [])

  const removeCase = useCallback((caseId: string) => {
    setCases((current) => current.filter((item) => item.id !== caseId))
  }, [])

  const prependCase = useCallback((caseView: CaseView) => {
    setCases((current) => [caseView, ...current.filter((item) => item.id !== caseView.id)])
  }, [])

  const silentRefreshCases = useCallback(() => {
    void refreshCases({ silent: true })
  }, [refreshCases])

  const silentRefreshAlerts = useCallback(() => {
    void refreshAlerts({ silent: true })
  }, [refreshAlerts])

  useVisibilityPolling(CASES_POLL_MS, silentRefreshCases)
  useVisibilityPolling(ALERTS_POLL_MS, silentRefreshAlerts)

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      cases,
      casesLoading,
      casesError,
      refreshCases,
      patchCase,
      removeCase,
      prependCase,
      alerts,
      alertsLoading,
      alertsError,
      refreshAlerts,
    }),
    [
      alerts,
      alertsError,
      alertsLoading,
      cases,
      casesError,
      casesLoading,
      patchCase,
      prependCase,
      refreshAlerts,
      refreshCases,
      removeCase,
    ],
  )

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
}

export function useDashboardData() {
  return useContext(DashboardDataContext)
}

export function filterCasesByQuery(cases: CaseView[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return cases

  return cases.filter((caseView) =>
    [caseView.title, caseView.client.name, caseView.client.clientCode, caseView.records.at(-1)?.summary ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  )
}
