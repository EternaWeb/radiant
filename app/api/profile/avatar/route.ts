import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to upload an avatar." }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Avatar file is required." }, { status: 400 })
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPEG, or WebP image." }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Avatar must be 2 MB or smaller." }, { status: 400 })
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const storagePath = `${user.id}/avatar.${extension}`
  const service = createServiceClient()

  const { error: uploadError } = await service.storage.from("avatars").upload(storagePath, file, {
    upsert: true,
    contentType: file.type,
  })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicUrl } = service.storage.from("avatars").getPublicUrl(storagePath)
  const avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("*")
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Could not save avatar." }, { status: 500 })
  }

  return NextResponse.json({ profile, avatarUrl })
}
