"use client"

import { useState } from "react"
import { TriangleAlert, Bell, Check, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAlerts } from "@/lib/use-studies"
import { RiskGauge } from "../risk-gauge"

export function AlertsCenter() {
  const [notified, setNotified] = useState<Record<string, string[]>>({})
  const { alerts, loading, error, refresh } = useAlerts()

  async function notify(alertId: string, departmentId: string, departmentName: string) {
    const response = await fetch(`/api/alerts/${alertId}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ departmentId }),
    })

    if (response.ok) {
      setNotified((prev) => {
        const current = prev[alertId] ?? []
        if (current.includes(departmentName)) return prev
        return { ...prev, [alertId]: [...current, departmentName] }
      })
      await refresh()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 items-center gap-1.5 rounded-full bg-destructive/15 px-3 text-xs font-semibold text-destructive">
          <TriangleAlert className="h-3.5 w-3.5" /> {alerts.length} active critical alerts
        </span>
      </div>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-4">
        {alerts.map((alert) => {
          const sent = notified[alert.id] ?? []
          return (
            <Card key={alert.id} className="overflow-hidden border-destructive/30">
              <div className="h-1 w-full bg-destructive" />
              <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
                <div className="flex shrink-0 items-center gap-4">
                  <RiskGauge score={alert.risk} size={110} />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="danger">
                      <TriangleAlert className="h-3 w-3" /> HIGH RISK
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {alert.time}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{alert.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Patient {alert.patientId} · {alert.modality}
                  </p>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Notify departments
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {alert.departments.map((dept) => {
                        const done = sent.includes(dept.name) || alert.notifiedDepartments.includes(dept.name)
                        return (
                          <Button
                            key={dept.id}
                            size="sm"
                            variant={done ? "secondary" : "outline"}
                            className="h-8 px-3"
                            onClick={() => notify(alert.id, dept.id, dept.name)}
                            data-icon="inline-start"
                          >
                            {done ? <Check data-icon="inline-start" /> : <Bell data-icon="inline-start" />}
                            {done ? `${dept.name} notified` : dept.name}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {alerts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading alerts..." : "No active critical alerts."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
