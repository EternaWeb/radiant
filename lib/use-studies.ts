"use client"

import { useCallback, useEffect, useState } from "react"
import type { CaseAlertView } from "@/lib/cases"
import type { StudyView } from "@/lib/studies"

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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load studies.")
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      void refresh({ silent: true })
    }, 15000)

    return () => window.clearInterval(interval)
  }, [refresh])

  return { studies, loading, error, refresh }
}

export function useAlerts() {
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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load alerts.")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      void refresh({ silent: true })
    }, 10000)

    return () => window.clearInterval(interval)
  }, [refresh])

  return { alerts, loading, error, refresh }
}
