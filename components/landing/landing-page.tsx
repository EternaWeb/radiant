"use client"

import { ArrowRight, Brain, ShieldAlert, Users } from "lucide-react"
import { RadiantLogo } from "@/components/radiant-logo"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Brain,
    title: "AI analysis",
    description: "Automated findings on CT, MRI, and X-ray studies.",
  },
  {
    icon: ShieldAlert,
    title: "Risk detection",
    description: "Surface critical cases before they reach the queue.",
  },
  {
    icon: Users,
    title: "Team workspace",
    description: "Share cases across radiology, ER, and departments.",
  },
]

type LandingPageProps = {
  onSignIn?: () => void
  onRequestAccess?: () => void
}

export function LandingPage({ onSignIn, onRequestAccess }: LandingPageProps) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent-blue/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-chart-5/10 blur-[100px]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <RadiantLogo className="h-8 rounded-md" />
        <Button variant="ghost" size="lg" onClick={onSignIn}>
          Login
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 pb-16 pt-8 md:px-12">
        <div className="max-w-2xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 [animation:pulse-ring_2s_ease-out_infinite]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Medical imaging platform
          </span>

          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Faster reads. Clearer decisions.
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground md:text-xl">
            Radiant helps clinical teams analyze imaging studies with AI-assisted findings,
            risk alerts, and a shared workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="accent"
              size="lg"
              className="h-11 px-6 text-base"
              onClick={onSignIn}
              data-icon="inline-end"
            >
              Get started <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 text-base"
              onClick={onRequestAccess ?? onSignIn}
            >
              Request access
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur"
            >
              <Icon className="h-5 w-5 text-accent-blue" />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border px-6 py-5 md:px-12">
        <p className="text-center text-xs text-muted-foreground">
          Radiant — AI-powered medical imaging analysis for clinical teams.
        </p>
      </footer>
    </div>
  )
}
