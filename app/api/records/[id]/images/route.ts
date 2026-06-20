import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessRecord } from "@/lib/case-access"
import { mapRecordRow } from "@/lib/case-mappers"
import { recordSelect } from "@/lib/case-queries"
import type { CaseImageLabel } from "@/lib/supabase/types"

type Context = {
  params: Promise<{ id: string }>
}

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"]
const allowedLabels: CaseImageLabel[] = ["front", "left", "right", "posterior", "lateral", "other"]

function extFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "image/webp") return "webp"
  return "png"
}

function parseStringArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const { id } = await context.params
  if (!(await canAccessRecord(auth, id))) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 })
  }

  const { data: record } = await auth.service
    .from("case_records")
    .select("id, case_id")
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .maybeSingle()

  if (!record) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 })
  }

  const formData = await request.formData()
  const files = formData.getAll("images").filter((value): value is File => value instanceof File)
  const labels = parseStringArray(formData.get("labels"))
  const labelNotes = parseStringArray(formData.get("labelNotes"))

  if (files.length === 0) {
    return NextResponse.json({ error: "Upload at least one image." }, { status: 400 })
  }

  const existingCount = await auth.service.from("case_images").select("id", { count: "exact", head: true }).eq("record_id", id)
  const startOrder = existingCount.count ?? 0
  const rows = []

  for (const [index, file] of files.entries()) {
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are supported." }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 })
    }

    const label = allowedLabels.includes(labels[index] as CaseImageLabel)
      ? (labels[index] as CaseImageLabel)
      : index === 0
        ? "front"
        : "other"
    const sortOrder = startOrder + index
    const storagePath = `${auth.profile.organization_id}/${record.case_id}/${id}/${sortOrder}-${label}.${extFromMimeType(file.type)}`
    const { error: storageError } = await auth.service.storage.from("studies").upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    })

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    rows.push({
      record_id: id,
      label,
      label_note: labelNotes[index]?.trim() || null,
      storage_path: storagePath,
      image_mime_type: file.type,
      sort_order: sortOrder,
    })
  }

  const { error: insertError } = await auth.service.from("case_images").insert(rows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: reloaded, error: reloadError } = await (auth.service.from("case_records") as any)
    .select(recordSelect)
    .eq("id", id)
    .single()

  if (reloadError || !reloaded) {
    return NextResponse.json({ error: reloadError?.message ?? "Could not reload record." }, { status: 500 })
  }

  return NextResponse.json({ record: await mapRecordRow(auth.service, reloaded) })
}
