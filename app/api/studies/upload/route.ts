import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapStudyRows } from "@/lib/study-mappers"
import type { StudyModality } from "@/lib/supabase/types"

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"]
const allowedModalities: StudyModality[] = ["xray", "ct", "mri", "ultrasound"]

function extFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "image/webp") return "webp"
  return "png"
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  const formData = await request.formData()
  const file = formData.get("image")
  const externalPatientId = typeof formData.get("patientId") === "string" ? String(formData.get("patientId")).trim() : ""
  const patientName = typeof formData.get("patientName") === "string" ? String(formData.get("patientName")).trim() : ""
  const bodyPart = typeof formData.get("bodyPart") === "string" ? String(formData.get("bodyPart")).trim() : "Chest"
  const modality = typeof formData.get("modality") === "string" ? (String(formData.get("modality")) as StudyModality) : "xray"
  const spo2 = optionalNumber(formData.get("spo2"))
  const fever = formData.get("fever") === "true"
  const symptoms = typeof formData.get("symptoms") === "string" ? String(formData.get("symptoms")).trim() : ""

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload an image file." }, { status: 400 })
  }

  if (!allowedMimeTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are supported for v1." }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 })
  }

  if (!externalPatientId || !patientName) {
    return NextResponse.json({ error: "Patient ID and patient name are required." }, { status: 400 })
  }

  if (!allowedModalities.includes(modality)) {
    return NextResponse.json({ error: "Unsupported modality." }, { status: 400 })
  }

  const { data: patient, error: patientError } = await auth.service
    .from("patients")
    .upsert(
      {
        organization_id: auth.profile.organization_id!,
        external_id: externalPatientId,
        display_name: patientName,
        created_by: auth.userId,
      },
      { onConflict: "organization_id,external_id" },
    )
    .select("*")
    .single()

  if (patientError || !patient) {
    return NextResponse.json({ error: patientError?.message ?? "Could not archive patient." }, { status: 500 })
  }

  const studyId = crypto.randomUUID()
  const storagePath = `${auth.profile.organization_id}/${studyId}/original.${extFromMimeType(file.type)}`
  const { error: storageError } = await auth.service.storage.from("studies").upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: study, error: studyError } = await auth.service
    .from("studies")
    .insert({
      id: studyId,
      organization_id: auth.profile.organization_id!,
      department_id: auth.profile.department_id,
      patient_id: patient.id,
      modality,
      body_part: bodyPart || "Chest",
      storage_path: storagePath,
      image_mime_type: file.type,
      status: "uploaded",
      uploaded_by: auth.userId,
    })
    .select("*")
    .single()

  if (studyError || !study) {
    return NextResponse.json({ error: studyError?.message ?? "Could not archive study." }, { status: 500 })
  }

  if (spo2 !== null || fever || symptoms) {
    const { error: contextError } = await auth.service.from("study_clinical_context").upsert({
      study_id: study.id,
      spo2,
      fever,
      symptoms: symptoms || null,
    })

    if (contextError) {
      return NextResponse.json({ error: contextError.message }, { status: 500 })
    }
  }

  const { data: rows, error: viewError } = await auth.service
    .from("studies")
    .select(
      `
      *,
      patients(external_id, display_name),
      study_findings(*),
      reports(*),
      study_clinical_context(*)
    `,
    )
    .eq("id", study.id)

  if (viewError) {
    return NextResponse.json({ error: viewError.message }, { status: 500 })
  }

  const [view] = await mapStudyRows(auth.service, rows ?? [])

  return NextResponse.json({ study: view })
}
