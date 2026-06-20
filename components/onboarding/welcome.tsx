"use client"

import { Brain, Database, ShieldAlert, Users, ArrowRight } from "lucide-react"
import { RadiantLogo } from "@/components/radiant-logo"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"

const features = [
  { icon: Brain, label: "AI Analysis" },
  { icon: Database, label: "PACS Storage" },
  { icon: ShieldAlert, label: "Risk Detection" },
  { icon: Users, label: "Real-time Collaboration" },
]

const slices = ["/scans/mri-brain.png", "/scans/chest-xray.png", "/scans/ct-abdomen.png"]

export function Welcome() {
  const { setStage } = useApp()

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent-blue/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-chart-5/10 blur-[100px]" />

      {/* floating scan slices */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
        {slices.map((src, i) => (
          <div
            key={src}
            className="animate-float-slow absolute overflow-hidden rounded-xl border border-border/60 opacity-25 shadow-2xl"
            style={{
              width: 200,
              height: 200,
              top: `${15 + i * 22}%`,
              left: i % 2 === 0 ? `${6 + i * 4}%` : "auto",
              right: i % 2 === 1 ? `${8 + i * 3}%` : "auto",
              animationDelay: `${i * 1.4}s`,
            }}
          >
            <img src={src || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <RadiantLogo className="h-8 rounded-md" />
        </div>
        <Button variant="ghost" size="lg" onClick={() => setStage("login")}>
          Login
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 [animation:pulse-ring_2s_ease-out_infinite]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          AI Engine online
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight md:text-7xl">Radiant</h1>
        <p className="mt-4 text-balance text-lg text-muted-foreground md:text-xl">
          AI-powered Medical Imaging Analysis Platform
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            variant="accent"
            size="lg"
            className="h-11 px-6 text-base"
            onClick={() => setStage("login")}
            data-icon="inline-end"
          >
            Login <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-6 text-base"
            onClick={() => setStage("login")}
          >
            Request Access
          </Button>
        </div>

        <div className="mt-14 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-4 backdrop-blur"
            >
              <Icon className="h-5 w-5 text-accent-blue" />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
