import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/supabase/types"

export type ApiAuthContext = {
  userId: string
  profile: Profile
  service: ReturnType<typeof createServiceClient>
}

export async function requireCompletedProfile(): Promise<ApiAuthContext | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile, error } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (error || !profile?.onboarding_complete || !profile.organization_id) {
    return NextResponse.json({ error: "Complete onboarding before using imaging workflows." }, { status: 403 })
  }

  return {
    userId: user.id,
    profile,
    service,
  }
}

export function isApiError(context: ApiAuthContext | NextResponse): context is NextResponse {
  return context instanceof NextResponse
}
