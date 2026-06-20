"use client"

import { useCallback, useEffect, useState } from "react"
import type { CaseView } from "@/lib/cases"

type CasesState = {
  cases: CaseView[]
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

type CaseState = {
  caseView: CaseView | null
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

export function useCases(query = ""): CasesState {
  const [cases, setCases] = useState<CaseView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (query.trim()) params.set("query", query.trim())

    try {
      const response = await fetch(`/api/cases${params.size ? `?${params}` : ""}`)
      const payload = (await response.json()) as { cases?: CaseView[]; error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Could not load cases.")
        setLoading(false)
        return
      }

      setCases(payload.cases ?? [])
      setLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load cases.")
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

  return { cases, loading, error, refresh }
}

export function useCase(caseId: string | null): CaseState {
  const [caseView, setCaseView] = useState<CaseView | null>(null)
  const [loading, setLoading] = useState(Boolean(caseId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!caseId) {
      setCaseView(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!options?.silent) setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cases/${caseId}`)
      const payload = (await response.json()) as { case?: CaseView; error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Could not load case.")
        setLoading(false)
        return
      }

      setCaseView(payload.case ?? null)
      setLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load case.")
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void refresh()
    if (!caseId) return

    const interval = window.setInterval(() => {
      void refresh({ silent: true })
    }, 10000)

    return () => window.clearInterval(interval)
  }, [caseId, refresh])

  return { caseView, loading, error, refresh }
}
