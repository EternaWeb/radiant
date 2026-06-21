"use client"

import { useCallback, useEffect, useState } from "react"
import type { CaseAlertView } from "@/lib/cases"
import type { StudyView } from "@/lib/studies"
import { useDashboardData } from "@/lib/dashboard-data"

type StudiesState = {
  studies: StudyView[]
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

export function useStudies(query = ""): StudiesState {
  const [studies, setStudies] = useState<StudyView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (query.trim()) params.set("query", query.trim())

    try {
      const response = await fetch(`/api/studies${params.size ? `?${params}` : ""}`)
      const payload = (await response.json()) as { studies?: StudyView[]; error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Could not load studies.")
        setLoading(false)
        return
      }

      setStudies(payload.studies ?? [])
      setLoading(false)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load studies.")
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh({ silent: true })
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [refresh])

  return { studies, loading, error, refresh }
}

type AlertsState = {
  alerts: CaseAlertView[]
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

function useLocalAlerts(): AlertsState {
  const [alerts, setAlerts] = useState<CaseAlertView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/alerts")
      const payload = (await response.json()) as { alerts?: CaseAlertView[]; error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Could not load alerts.")
        setLoading(false)
        return
      }

      setAlerts(payload.alerts ?? [])
      setLoading(false)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load alerts.")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh({ silent: true })
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [refresh])

  return { alerts, loading, error, refresh }
}

export function useAlerts(): AlertsState {
  const dashboard = useDashboardData()
  const local = useLocalAlerts()

  if (!dashboard) {
    return local
  }

  return {
    alerts: dashboard.alerts,
    loading: dashboard.alertsLoading,
    error: dashboard.alertsError,
    refresh: dashboard.refreshAlerts,
  }
}
