import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { mapStudyRows } from "@/lib/study-mappers"

const defaultSamples = [
  "https://storage.googleapis.com/gcs-public-data--healthcare-nih-chest-xray/png/00000001_000.png",
  "https://storage.googleapis.com/gcs-public-data--healthcare-nih-chest-xray/png/00000001_001.png",
  "https://storage.googleapis.com/gcs-public-data--healthcare-nih-chest-xray/png/00000003_000.png",
]

function sampleUrls() {
  const configured = process.env.SEED_CHEST_XRAY_URLS?.split(",")
    .map((url) => url.trim())
    .filter(Boolean)

  return configured?.length ? configured : defaultSamples
}

export async function POST() {
  const auth = await requireCompletedProfile()
  if (isApiError(auth)) return auth

  if (!auth.profile.is_admin) {
    return NextResponse.json({ error: "Only workspace admins can seed demo studies." }, { status: 403 })
  }

  const createdStudyIds: string[] = []

  for (const [index, url] of sampleUrls().entries()) {
    const response = await fetch(url)
    if (!response.ok) continue

    const image = Buffer.from(await response.arrayBuffer())
    const studyId = crypto.randomUUID()
    const externalId = `DEMO-${String(index + 1).padStart(3, "0")}`
    const { data: patient, error: patientError } = await auth.service
      .from("patients")
      .upsert(
        {
          organization_id: auth.profile.organization_id!,
          external_id: externalId,
          display_name: `Demo Patient ${index + 1}`,
          created_by: auth.userId,
        },
        { onConflict: "organization_id,external_id" },
      )
      .select("*")
      .single()

    if (patientError || !patient) continue

    const storagePath = `${auth.profile.organization_id}/${studyId}/original.png`
    const { error: storageError } = await auth.service.storage.from("studies").upload(storagePath, image, {
      contentType: response.headers.get("content-type") ?? "image/png",
      upsert: true,
    })

    if (storageError) continue

    const { data: study, error: studyError } = await auth.service
      .from("studies")
      .insert({
        id: studyId,
        organization_id: auth.profile.organization_id!,
        department_id: auth.profile.department_id,
        patient_id: patient.id,
        modality: "xray",
        body_part: "Chest",
        storage_path: storagePath,
        image_mime_type: response.headers.get("content-type") ?? "image/png",
        status: "uploaded",
        uploaded_by: auth.userId,
      })
      .select("id")
      .single()

    if (!studyError && study) {
      createdStudyIds.push(study.id)
    }
  }

  if (createdStudyIds.length === 0) {
    return NextResponse.json({ error: "No sample studies could be seeded." }, { status: 502 })
  }

  const { data: rows, error } = await auth.service
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
    .in("id", createdStudyIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ studies: await mapStudyRows(auth.service, rows ?? []) })
}
