"use client"

import { useCallback, useEffect, useState } from "react"
import type { CaseRecordView, CaseView } from "@/lib/cases"

type WorkspaceRecordState = {
  caseView: CaseView | null
  record: CaseRecordView | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useWorkspaceRecord(recordId: string): WorkspaceRecordState {
  const [caseView, setCaseView] = useState<CaseView | null>(null)
  const [record, setRecord] = useState<CaseRecordView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/records/${recordId}/workspace`)
      const payload = (await response.json()) as {
        record?: CaseRecordView
        case?: CaseView
        error?: string
      }

      if (!response.ok || !payload.record || !payload.case) {
        setError(payload.error ?? "Record not found.")
        setCaseView(null)
        setRecord(null)
        setLoading(false)
        return
      }

      const matchedRecord = payload.case.records.find((item) => item.id === recordId) ?? payload.record
      setCaseView(payload.case)
      setRecord(matchedRecord)
      setLoading(false)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load workspace.")
      setCaseView(null)
      setRecord(null)
      setLoading(false)
    }
  }, [recordId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { caseView, record, loading, error, refresh }
}
