import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to upload a logo." }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.organization_id || !profile.is_admin) {
    return NextResponse.json({ error: "Only workspace admins can upload a hospital logo." }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Logo file is required." }, { status: 400 })
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPEG, WebP, or SVG image." }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo must be 2 MB or smaller." }, { status: 400 })
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
          ? "svg"
          : "jpg"
  const storagePath = `${profile.organization_id}/logo.${extension}`

  const { error: uploadError } = await service.storage.from("org-assets").upload(storagePath, file, {
    upsert: true,
    contentType: file.type,
  })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicUrl } = service.storage.from("org-assets").getPublicUrl(storagePath)
  const logoUrl = `${publicUrl.publicUrl}?t=${Date.now()}`

  const { data: organization, error: organizationError } = await service
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", profile.organization_id)
    .select("*")
    .single()

  if (organizationError || !organization) {
    return NextResponse.json({ error: organizationError?.message ?? "Could not save logo." }, { status: 500 })
  }

  return NextResponse.json({ organization, logoUrl })
}
