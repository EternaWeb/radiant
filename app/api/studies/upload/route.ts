import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapStudyRows } from "@/lib/study-mappers"
import type { StudyModality } from "@/lib/supabase/types"

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"]
const allowedModalities: StudyModality[] = ["xray", "ct", "mri", "ultrasound"]

type DebugStep = {
  step: string
  ok: boolean
  at: string
  details?: Record<string, unknown>
}

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

  const debugSteps: DebugStep[] = []
  const addStep = (step: string, ok: boolean, details?: Record<string, unknown>) => {
    debugSteps.push({
      step,
      ok,
      at: new Date().toISOString(),
      details,
    })
  }
  const debugPayload = (extra?: Record<string, unknown>) => ({
    route: "POST /api/studies/upload",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    steps: debugSteps,
    ...extra,
  })

  addStep("auth.profile", true, {
    userId: auth.userId,
    organizationId: auth.profile.organization_id,
    departmentId: auth.profile.department_id,
    isAdmin: auth.profile.is_admin,
  })

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
    addStep("request.validate_file", false, { reason: "Missing image file." })
    return NextResponse.json({ error: "Upload an image file.", debug: debugPayload() }, { status: 400 })
  }
  addStep("request.read_form", true, {
    patientId: externalPatientId,
    patientName,
    modality,
    bodyPart,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  })

  if (!allowedMimeTypes.includes(file.type)) {
    addStep("request.validate_file", false, { reason: "Unsupported MIME type.", mimeType: file.type })
    return NextResponse.json(
      { error: "Only PNG, JPEG, and WebP images are supported for v1.", debug: debugPayload() },
      { status: 400 },
    )
  }

  if (file.size > 10 * 1024 * 1024) {
    addStep("request.validate_file", false, { reason: "File too large.", size: file.size })
    return NextResponse.json({ error: "Images must be 10 MB or smaller.", debug: debugPayload() }, { status: 400 })
  }

  if (!externalPatientId || !patientName) {
    addStep("request.validate_patient", false, {
      hasPatientId: Boolean(externalPatientId),
      hasPatientName: Boolean(patientName),
    })
    return NextResponse.json(
      { error: "Patient ID and patient name are required.", debug: debugPayload() },
      { status: 400 },
    )
  }

  if (!allowedModalities.includes(modality)) {
    addStep("request.validate_modality", false, { modality })
    return NextResponse.json({ error: "Unsupported modality.", debug: debugPayload() }, { status: 400 })
  }
  addStep("request.validate", true)

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
    addStep("database.upsert_patient", false, { message: patientError?.message })
    return NextResponse.json(
      { error: patientError?.message ?? "Could not archive patient.", debug: debugPayload() },
      { status: 500 },
    )
  }
  addStep("database.upsert_patient", true, { patientId: patient.id, externalPatientId })

  const studyId = crypto.randomUUID()
  const storagePath = `${auth.profile.organization_id}/${studyId}/original.${extFromMimeType(file.type)}`
  const { error: storageError } = await auth.service.storage.from("studies").upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  })

  if (storageError) {
    addStep("storage.upload_original", false, { message: storageError.message, storagePath })
    return NextResponse.json({ error: storageError.message, debug: debugPayload() }, { status: 500 })
  }
  addStep("storage.upload_original", true, { storagePath })

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
    addStep("database.insert_study", false, { message: studyError?.message })
    return NextResponse.json(
      { error: studyError?.message ?? "Could not archive study.", debug: debugPayload() },
      { status: 500 },
    )
  }
  addStep("database.insert_study", true, { studyId: study.id })

  if (spo2 !== null || fever || symptoms) {
    const { error: contextError } = await auth.service.from("study_clinical_context").upsert({
      study_id: study.id,
      spo2,
      fever,
      symptoms: symptoms || null,
    })

    if (contextError) {
      addStep("database.upsert_clinical_context", false, { message: contextError.message })
      return NextResponse.json({ error: contextError.message, debug: debugPayload() }, { status: 500 })
    }
    addStep("database.upsert_clinical_context", true, { spo2, fever, hasSymptoms: Boolean(symptoms) })
  } else {
    addStep("database.upsert_clinical_context", true, { skipped: true })
  }

  const { data: rows, error: viewError } = await (auth.service.from("studies") as any)
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
    addStep("database.reload_view", false, { message: viewError.message })
    return NextResponse.json({ error: viewError.message, debug: debugPayload() }, { status: 500 })
  }
  addStep("database.reload_view", true)

  const [view] = await mapStudyRows(auth.service, rows ?? [])

  return NextResponse.json({ study: view, debug: debugPayload({ studyId: study.id }) })
}
