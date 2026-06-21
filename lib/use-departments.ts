"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchCached, invalidateCached } from "@/lib/client-cache"

const DEPARTMENTS_TTL_MS = 5 * 60_000

type DepartmentsPayload = {
  departments?: Array<{ id: string; name: string }>
  error?: string
}

export function useDepartments(enabled = true) {
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = false) => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      if (force) invalidateCached("/api/departments")

      const payload = await fetchCached<DepartmentsPayload>("/api/departments", DEPARTMENTS_TTL_MS)
      if (payload.error) {
        setError(payload.error)
        setDepartments([])
      } else {
        setDepartments(payload.departments ?? [])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load departments.")
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { departments, loading, error, refresh }
}

export async function loadDepartmentsCached(force = false) {
  if (force) invalidateCached("/api/departments")
  return fetchCached<DepartmentsPayload>("/api/departments", DEPARTMENTS_TTL_MS)
}
