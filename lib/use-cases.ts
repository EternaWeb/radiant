"use client"

import { useCallback, useEffect, useState } from "react"
import type { CaseView } from "@/lib/cases"
import { filterCasesByQuery, useDashboardData } from "@/lib/dashboard-data"

type CasesState = {
  cases: CaseView[]
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
  patchCase: (caseView: CaseView) => void
  removeCase: (caseId: string) => void
  prependCase: (caseView: CaseView) => void
}

type CaseState = {
  caseView: CaseView | null
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

function useLocalCases(query: string): CasesState {
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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load cases.")
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    cases,
    loading,
    error,
    refresh,
    patchCase: (caseView) => {
      setCases((current) => {
        const index = current.findIndex((item) => item.id === caseView.id)
        if (index === -1) return [caseView, ...current]
        const next = current.slice()
        next[index] = caseView
        return next
      })
    },
    removeCase: (caseId) => {
      setCases((current) => current.filter((item) => item.id !== caseId))
    },
    prependCase: (caseView) => {
      setCases((current) => [caseView, ...current.filter((item) => item.id !== caseView.id)])
    },
  }
}

export function useCases(query = ""): CasesState {
  const dashboard = useDashboardData()
  const local = useLocalCases(dashboard ? "" : query)

  if (!dashboard) {
    return local
  }

  return {
    cases: filterCasesByQuery(dashboard.cases, query),
    loading: dashboard.casesLoading,
    error: dashboard.casesError,
    refresh: dashboard.refreshCases,
    patchCase: dashboard.patchCase,
    removeCase: dashboard.removeCase,
    prependCase: dashboard.prependCase,
  }
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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load case.")
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void refresh()
    if (!caseId) return

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh({ silent: true })
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [caseId, refresh])

  return { caseView, loading, error, refresh }
}
