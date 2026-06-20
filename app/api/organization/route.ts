import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No workspace profile found." }, { status: 403 })
  }

  const { data: organization, error } = await service
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single()

  if (error || !organization) {
    return NextResponse.json({ error: error?.message ?? "Organization not found." }, { status: 404 })
  }

  return NextResponse.json({ organization })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.organization_id || !profile.is_admin) {
    return NextResponse.json({ error: "Only workspace admins can update the organization." }, { status: 403 })
  }

  const body = (await request.json()) as { logoUrl?: string | null }
  if (body.logoUrl !== null && typeof body.logoUrl !== "string") {
    return NextResponse.json({ error: "No organization updates were provided." }, { status: 400 })
  }

  const { data: organization, error } = await service
    .from("organizations")
    .update({ logo_url: body.logoUrl ?? null })
    .eq("id", profile.organization_id)
    .select("*")
    .single()

  if (error || !organization) {
    return NextResponse.json({ error: error?.message ?? "Could not update organization." }, { status: 500 })
  }

  return NextResponse.json({ organization })
}
