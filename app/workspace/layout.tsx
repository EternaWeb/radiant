import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", user.id).maybeSingle()

  if (!profile?.onboarding_complete) {
    redirect("/")
  }

  return <div className="min-h-svh bg-background text-foreground">{children}</div>
}
