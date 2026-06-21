import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessRecord } from "@/lib/case-access"
import { mapRecordRowWithUrls } from "@/lib/case-mappers"
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

  let uploadRows

  try {
    uploadRows = await Promise.all(
      files.map(async (file, index) => {
        if (!allowedMimeTypes.includes(file.type)) {
          throw new Error("Only PNG, JPEG, and WebP images are supported.")
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Images must be 10 MB or smaller.")
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
          throw new Error(storageError.message)
        }

        return {
          record_id: id,
          label,
          label_note: labelNotes[index]?.trim() || null,
          storage_path: storagePath,
          image_mime_type: file.type,
          sort_order: sortOrder,
        }
      }),
    )
  } catch (uploadError) {
    return NextResponse.json(
      { error: uploadError instanceof Error ? uploadError.message : "Could not upload images." },
      { status: 400 },
    )
  }

  const { error: insertError } = await auth.service.from("case_images").insert(uploadRows)
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

  return NextResponse.json({ record: await mapRecordRowWithUrls(auth.service, reloaded) })
}
