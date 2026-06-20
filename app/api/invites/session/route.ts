import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

type Payload = {
  token?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as Payload
  const token = body.token?.trim()

  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 })
  }

  const service = createServiceClient()
  const { data } = await service
    .from("invites")
    .select("id")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: "Invite not found or expired." }, { status: 404 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set("radiant_invite_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
