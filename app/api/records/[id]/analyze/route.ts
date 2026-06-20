import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { canAccessRecord } from "@/lib/case-access"
import { mapRecordRow } from "@/lib/case-mappers"
import { recordSelect } from "@/lib/case-queries"
import { analyzeCaseRecordWithGptVision, GptVisionAnalysisError } from "@/lib/gpt-vision"
import { sendHighRiskAlertEmail } from "@/lib/resend"
import { computeAge } from "@/lib/cases"

type Context = {
  params: Promise<{ id: string }>
}

type DebugStep = {
  step: string
  ok: boolean
  at: string
  details?: Record<string, unknown>
}

function aiEnvStatus() {
  return {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || "gpt-4o",
    OPENAI_VISION_TIMEOUT_MS: process.env.OPENAI_VISION_TIMEOUT_MS || "60000",
    OPENAI_VISION_MAX_TOKENS: process.env.OPENAI_VISION_MAX_TOKENS || "1200",
    RISK_HIGH_THRESHOLD: process.env.RISK_HIGH_THRESHOLD || "70",
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
  }
}

function errorDebug(error: unknown) {
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    status: error instanceof GptVisionAnalysisError ? error.status : undefined,
    details: error instanceof GptVisionAnalysisError ? error.details : undefined,
  }
}

function labelForDisplay(label: string) {
  return label
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function highRiskThreshold() {
  const configured = Number(process.env.RISK_HIGH_THRESHOLD ?? "70")
  return Number.isFinite(configured) ? configured : 70
}

function recommendationForRisk(riskScore: number) {
  if (riskScore >= highRiskThreshold()) {
    return "Prioritize radiologist review and notify the emergency care team for expedited clinical correlation."
  }

  if (riskScore >= 40) {
    return "Route for standard radiologist review with attention to the highlighted lung zones and timeline changes."
  }

  return "Continue routine workflow review. The AI summary should be interpreted by a qualified clinician."
}

async function sendAlertEmails(
  recipients: { email: string }[],
  payload: {
    patientId: string
    studyUrl: string
    riskScore: number
    topFinding: string
    organizationName: string
  },
) {
  await Promise.allSettled(
    recipients
      .filter((recipient, index, all) => recipient.email && all.findIndex((item) => item.email === recipient.email) === index)
      .map(async (recipient) => {
        try {
          await sendHighRiskAlertEmail({ to: recipient.email, ...payload })
        } catch {
          // Email delivery should not fail the analysis transaction.
        }
      }),
  )
}

export async function POST(_request: Request, context: Context) {
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
    route: "POST /api/records/[id]/analyze",
    env: aiEnvStatus(),
    steps: debugSteps,
    ...extra,
  })

  const { id } = await context.params
  if (!(await canAccessRecord(auth, id))) {
    addStep("access.record", false, { recordId: id })
    return NextResponse.json({ error: "Record not found.", debug: debugPayload() }, { status: 404 })
  }
  addStep("access.record", true, { recordId: id })

  const { data: rawRecord, error: recordError } = await (auth.service.from("case_records") as any)
    .select(
      `
      *,
      case_images(*),
      case_record_findings(*),
      case_record_reports(*),
      cases(*, clients(*))
    `,
    )
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .single()

  if (recordError || !rawRecord) {
    addStep("database.load_record", false, { message: recordError?.message })
    return NextResponse.json({ error: recordError?.message ?? "Record not found.", debug: debugPayload() }, { status: 404 })
  }

  const record = rawRecord as any
  const images = record.case_images ?? []
  const caseRow = record.cases
  const client = caseRow?.clients

  if (!caseRow || !client) {
    addStep("database.load_context", false, { reason: "Missing case or client join." })
    return NextResponse.json({ error: "Record context is incomplete.", debug: debugPayload() }, { status: 500 })
  }

  if (images.length === 0) {
    addStep("request.validate_images", false, { reason: "No labeled images uploaded." })
    return NextResponse.json({ error: "Upload at least one labeled image before analysis.", debug: debugPayload() }, { status: 400 })
  }

  const { data: priorRows } = await (auth.service.from("case_records") as any)
    .select("id, record_number, created_at, summary, risk_score, case_record_findings(label)")
    .eq("case_id", record.case_id)
    .lt("record_number", record.record_number)
    .order("record_number", { ascending: true })

  const priorRecords = ((priorRows ?? []) as any[]).map((prior) => ({
    recordNumber: prior.record_number,
    date: prior.created_at,
    summary: prior.summary ?? "No summary recorded.",
    riskScore: prior.risk_score ?? 0,
    topFindings: (prior.case_record_findings ?? []).slice(0, 3).map((finding: { label: string }) => finding.label),
  }))

  await auth.service.from("case_records").update({ status: "analyzing", analysis_error: null }).eq("id", record.id)
  addStep("database.mark_analyzing", true)

  const startedAt = Date.now()

  try {
    const imageInputs = await Promise.all(
      images
        .slice()
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map(async (image: any) => {
          const { data: imageBlob, error: downloadError } = await auth.service.storage
            .from("studies")
            .download(image.storage_path)

          if (downloadError || !imageBlob) {
            throw new Error(downloadError?.message ?? `Could not read ${image.label} image.`)
          }

          return {
            label: image.label_note ? `${image.label}: ${image.label_note}` : image.label,
            buffer: Buffer.from(await imageBlob.arrayBuffer()),
            mimeType: image.image_mime_type,
          }
        }),
    )
    addStep("storage.download_images", true, { count: imageInputs.length })

    const analysis = await analyzeCaseRecordWithGptVision({
      images: imageInputs,
      clinicalChecks: record.clinical_checks ?? {},
      recordNotes: record.notes,
      clientContext: {
        clientCode: client.client_code,
        age: computeAge(client.date_of_birth),
        previousHospitals: client.previous_hospitals ?? [],
        traumaHistory: client.trauma_history,
        clientNotes: client.notes,
      },
      priorRecords,
    })
    addStep("ai.gpt4o_vision_response", true, {
      responseId: analysis.responseId,
      modelId: analysis.modelId,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      findings: analysis.findings,
    })

    await auth.service.from("case_record_findings").delete().eq("record_id", record.id)
    const findings = analysis.findings
      .map((finding) => ({
        record_id: record.id,
        label: finding.label,
        zone: finding.zone,
        confidence: Math.round(finding.confidence * 100),
        raw_probability: Number(finding.confidence.toFixed(5)),
      }))
      .sort((a, b) => b.confidence - a.confidence)

    if (findings.length > 0) {
      const { error: findingsError } = await auth.service.from("case_record_findings").insert(findings)
      if (findingsError) throw new Error(findingsError.message)
    }
    addStep("database.insert_findings", true, { count: findings.length })

    const { error: reportError } = await auth.service.from("case_record_reports").upsert(
      {
        record_id: record.id,
        summary: analysis.summary,
        comparison: analysis.comparison,
        recommendation: recommendationForRisk(analysis.riskScore),
        disclaimer: "AI-assisted draft. Not a clinical diagnosis; radiologist review is required.",
        raw_llm_response: JSON.stringify(analysis.raw),
        model_used: analysis.modelId,
      },
      { onConflict: "record_id" },
    )

    if (reportError) throw new Error(reportError.message)
    addStep("database.upsert_report", true)

    const nextStatus = analysis.riskScore >= highRiskThreshold() ? "critical" : "analyzed"
    const { error: updateError } = await auth.service
      .from("case_records")
      .update({
        status: nextStatus,
        risk_score: analysis.riskScore,
        risk_level: analysis.riskLevel,
        summary: analysis.summary,
        raw_findings: analysis.raw as any,
        model_id: analysis.modelId,
        report_model_id: analysis.modelId,
        analysis_duration_ms: Date.now() - startedAt,
        analysis_error: null,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", record.id)

    if (updateError) throw new Error(updateError.message)
    addStep("database.update_record_result", true, { status: nextStatus, riskScore: analysis.riskScore })

    if (analysis.riskScore >= highRiskThreshold()) {
      const topFinding = findings[0]?.label ? labelForDisplay(findings[0].label) : "High-risk pattern"
      const { data: existingAlert } = await auth.service
        .from("alerts")
        .select("id")
        .eq("case_record_id", record.id)
        .maybeSingle()

      if (existingAlert) {
        await auth.service
          .from("alerts")
          .update({ title: `High-risk ${topFinding} pattern`, risk_score: analysis.riskScore })
          .eq("id", existingAlert.id)
      } else {
        await auth.service.from("alerts").insert({
          organization_id: auth.profile.organization_id!,
          study_id: null,
          case_record_id: record.id,
          title: `High-risk ${topFinding} pattern`,
          risk_score: analysis.riskScore,
        })
      }
      addStep("alerts.upsert", true, { threshold: highRiskThreshold(), riskScore: analysis.riskScore })

      const [{ data: emergencyDoctors }, { data: admins }, { data: organization }] = await Promise.all([
        auth.service
          .from("profiles")
          .select("id, email")
          .eq("organization_id", auth.profile.organization_id!)
          .eq("clinical_role", "emergency_doctor"),
        auth.service
          .from("profiles")
          .select("id, email")
          .eq("organization_id", auth.profile.organization_id!)
          .eq("is_admin", true),
        auth.service.from("organizations").select("name").eq("id", auth.profile.organization_id!).single(),
      ])

      const assignments = (emergencyDoctors ?? []).map((doctor) => ({
        case_id: record.case_id,
        profile_id: doctor.id,
        role: "emergency" as const,
        assigned_by: auth.userId,
      }))

      if (assignments.length > 0) {
        await auth.service.from("case_assignments").upsert(assignments, { onConflict: "case_id,profile_id,role" })
      }
      addStep("alerts.assign_emergency", true, { assigned: assignments.length })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://radiant.trymindcore.com"
      await sendAlertEmails([...(emergencyDoctors ?? []), ...(admins ?? [])], {
        patientId: client.client_code,
        studyUrl: `${appUrl}/`,
        riskScore: analysis.riskScore,
        topFinding,
        organizationName: organization?.name ?? "Radiant",
      })
      addStep("alerts.email_emergency_and_admins", true, {
        attempted: (emergencyDoctors?.length ?? 0) + (admins?.length ?? 0),
      })
    } else {
      addStep("alerts.skip", true, { threshold: highRiskThreshold(), riskScore: analysis.riskScore })
    }

    const { data: reloaded, error: reloadError } = await (auth.service.from("case_records") as any)
      .select(recordSelect)
      .eq("id", record.id)
      .single()

    if (reloadError || !reloaded) throw new Error(reloadError?.message ?? "Could not reload record.")

    return NextResponse.json({
      record: await mapRecordRow(auth.service, reloaded),
      debug: debugPayload({ durationMs: Date.now() - startedAt }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed."
    addStep("analysis.failed", false, errorDebug(error))
    await auth.service
      .from("case_records")
      .update({ status: "failed", analysis_error: message, analysis_duration_ms: Date.now() - startedAt })
      .eq("id", record.id)

    return NextResponse.json(
      {
        error: message,
        debug: debugPayload({
          durationMs: Date.now() - startedAt,
          error: errorDebug(error),
        }),
      },
      { status: 502 },
    )
  }
}
