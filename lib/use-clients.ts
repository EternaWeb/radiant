"use client"

import { useCallback, useEffect, useState } from "react"
import type { ClientView } from "@/lib/cases"

type ClientsState = {
  clients: ClientView[]
  loading: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

export function useClients(query = ""): ClientsState {
  const [clients, setClients] = useState<ClientView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (query.trim()) params.set("query", query.trim())

    try {
      const response = await fetch(`/api/clients${params.size ? `?${params}` : ""}`)
      const payload = (await response.json()) as { clients?: ClientView[]; error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Could not load clients.")
        setLoading(false)
        return
      }

      setClients(payload.clients ?? [])
      setLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load clients.")
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

  return { clients, loading, error, refresh }
}
