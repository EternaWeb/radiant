"use client"

import { useState } from "react"
import { Activity, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/app-context"
import { createClient } from "@/lib/supabase/client"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.45 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  )
}

export function Login() {
  const { setStage } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setLoading(true)
    setError(null)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/`,
      },
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <button
        onClick={() => setStage("welcome")}
        className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to MedVision AI</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your organization Google account to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <button
            onClick={signIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Google is the only supported sign-in method for this environment.
            By continuing you agree to the platform terms and HIPAA data handling policy.
          </p>
          {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  )
}
