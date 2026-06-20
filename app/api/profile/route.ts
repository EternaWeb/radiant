import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

type Payload = {
  fullName?: string
  phone?: string
  avatarUrl?: string | null
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to update your profile." }, { status: 401 })
  }

  const body = (await request.json()) as Payload
  const updates: Payload = {}

  if (typeof body.fullName === "string") {
    const fullName = body.fullName.trim()
    if (fullName.length < 2) {
      return NextResponse.json({ error: "Full name is too short." }, { status: 400 })
    }
    updates.fullName = fullName
  }

  if (typeof body.phone === "string") {
    updates.phone = body.phone.trim() || ""
  }

  if (body.avatarUrl === null || typeof body.avatarUrl === "string") {
    updates.avatarUrl = body.avatarUrl
  }

  const dbUpdates: { full_name?: string; phone?: string | null; avatar_url?: string | null } = {}
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ error: "No profile updates were provided." }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile, error } = await service
    .from("profiles")
    .update(dbUpdates)
    .eq("id", user.id)
    .select("*")
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "Could not update profile." }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
