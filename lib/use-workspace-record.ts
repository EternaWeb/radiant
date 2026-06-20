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
      const recordResponse = await fetch(`/api/records/${recordId}`)
      const recordPayload = (await recordResponse.json()) as { record?: CaseRecordView; error?: string }

      if (!recordResponse.ok || !recordPayload.record) {
        setError(recordPayload.error ?? "Record not found.")
        setCaseView(null)
        setRecord(null)
        setLoading(false)
        return
      }

      const caseResponse = await fetch(`/api/cases/${recordPayload.record.caseId}`)
      const casePayload = (await caseResponse.json()) as { case?: CaseView; error?: string }

      if (!caseResponse.ok || !casePayload.case) {
        setError(casePayload.error ?? "Case not found.")
        setCaseView(null)
        setRecord(null)
        setLoading(false)
        return
      }

      const matchedRecord = casePayload.case.records.find((item) => item.id === recordId) ?? recordPayload.record
      setCaseView(casePayload.case)
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
