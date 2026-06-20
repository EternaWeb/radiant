"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, ArrowRight, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"

const steps = ["PACS Connected", "Dataset Loaded", "AI Model Ready", "Notification Service Ready"]

export function AiReadiness() {
  const { setStage } = useApp()
  const [done, setDone] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepTimers = steps.map((_, i) => setTimeout(() => setDone(i + 1), 700 * (i + 1)))
    const target = 95
    const interval = setInterval(() => {
      setProgress((p) => (p < target ? Math.min(target, p + 2) : p))
    }, 60)
    return () => {
      stepTimers.forEach(clearTimeout)
      clearInterval(interval)
    }
  }, [])

  const ready = done >= steps.length

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/15">
            <Cpu className="h-8 w-8 text-accent-blue" />
            <span className="absolute inset-0 rounded-2xl border border-accent-blue/40 [animation:pulse-ring_2.4s_ease-out_infinite]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Preparing your environment</h1>
          <p className="mt-2 text-muted-foreground">Initializing the Radiant AI engine for your facility.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-end justify-between">
            <span className="text-sm text-muted-foreground">System readiness</span>
            <span className="text-3xl font-bold tabular-nums text-accent-blue">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent-blue transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="mt-6 flex flex-col gap-3">
            {steps.map((label, i) => {
              const complete = i < done
              const loading = i === done
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      complete ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {complete ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className={`text-sm ${complete ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <Button
          variant="accent"
          size="lg"
          className="mt-6 h-11 w-full text-base transition-opacity"
          disabled={!ready}
          onClick={() => setStage("app")}
          data-icon="inline-end"
        >
          Enter Dashboard <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
