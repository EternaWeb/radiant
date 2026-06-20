"use client"

import { useCallback, useEffect, useState } from "react"
import type { AlertView, StudyView } from "@/lib/studies"

type StudiesState = {
  studies: StudyView[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useStudies(query = ""): StudiesState {
  const [studies, setStudies] = useState<StudyView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (query.trim()) params.set("query", query.trim())

    const response = await fetch(`/api/studies${params.size ? `?${params}` : ""}`)
    const payload = (await response.json()) as { studies?: StudyView[]; error?: string }

    if (!response.ok) {
      setError(payload.error ?? "Could not load studies.")
      setLoading(false)
      return
    }

    setStudies(payload.studies ?? [])
    setLoading(false)
  }, [query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { studies, loading, error, refresh }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const response = await fetch("/api/alerts")
    const payload = (await response.json()) as { alerts?: AlertView[]; error?: string }

    if (!response.ok) {
      setError(payload.error ?? "Could not load alerts.")
      setLoading(false)
      return
    }

    setAlerts(payload.alerts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { alerts, loading, error, refresh }
}
