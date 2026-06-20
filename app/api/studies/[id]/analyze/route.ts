import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { generateHeatmap } from "@/lib/gradcam"
import { classifyChestXray, HuggingFaceInferenceError } from "@/lib/huggingface"
import { computeRisk } from "@/lib/risk"
import { generateReport } from "@/lib/reports"
import { sendHighRiskAlertEmail } from "@/lib/resend"
import { mapStudyRows } from "@/lib/study-mappers"

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
    HUGGINGFACE_API_KEY: Boolean(process.env.HUGGINGFACE_API_KEY),
    HUGGINGFACE_MODEL_ID: process.env.HUGGINGFACE_MODEL_ID || "google/cxr-foundation",
    HUGGINGFACE_INFERENCE_URL: Boolean(process.env.HUGGINGFACE_INFERENCE_URL),
    HUGGINGFACE_TIMEOUT_MS: process.env.HUGGINGFACE_TIMEOUT_MS || "45000",
    GRADCAM_API_URL: Boolean(process.env.GRADCAM_API_URL),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    OPENAI_REPORT_MODEL: process.env.OPENAI_REPORT_MODEL || "gpt-4o-mini",
    HUGGINGFACE_TEXT_MODEL_ID: process.env.HUGGINGFACE_TEXT_MODEL_ID || null,
    RISK_HIGH_THRESHOLD: process.env.RISK_HIGH_THRESHOLD || "70",
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
  }
}

function errorDebug(error: unknown) {
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    status: error instanceof HuggingFaceInferenceError ? error.status : undefined,
    details: error instanceof HuggingFaceInferenceError ? error.details : undefined,
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

async function canAccessStudy(auth: Awaited<ReturnType<typeof requireCompletedProfile>>, studyId: string) {
  if (isApiError(auth)) return false
  if (auth.profile.is_admin) return true

  const { data: study } = await auth.service.from("studies").select("department_id").eq("id", studyId).maybeSingle()
  if (study?.department_id === auth.profile.department_id) return true

  if (!auth.profile.department_id) return false

  const { data: share } = await auth.service
    .from("study_shares")
    .select("id")
    .eq("study_id", studyId)
    .eq("department_id", auth.profile.department_id)
    .maybeSingle()

  return Boolean(share)
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
    route: "POST /api/studies/[id]/analyze",
    env: aiEnvStatus(),
    steps: debugSteps,
    ...extra,
  })

  const { id } = await context.params
  addStep("auth.profile", true, {
    userId: auth.userId,
    organizationId: auth.profile.organization_id,
    departmentId: auth.profile.department_id,
    isAdmin: auth.profile.is_admin,
  })

  const access = await canAccessStudy(auth, id)
  if (!access) {
    addStep("access.study", false, { studyId: id })
    return NextResponse.json({ error: "Study not found.", debug: debugPayload() }, { status: 404 })
  }
  addStep("access.study", true, { studyId: id })

  const { data: rawStudy, error: studyError } = await (auth.service.from("studies") as any)
    .select("*, patients(external_id, display_name), study_clinical_context(*)")
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .single()

  if (studyError || !rawStudy) {
    addStep("database.load_study", false, { message: studyError?.message, studyId: id })
    return NextResponse.json(
      { error: studyError?.message ?? "Study not found.", debug: debugPayload() },
      { status: 404 },
    )
  }

  const study = rawStudy as any
  addStep("database.load_study", true, {
    studyId: study.id,
    storagePath: study.storage_path,
    mimeType: study.image_mime_type,
    status: study.status,
  })

  const { data: imageBlob, error: downloadError } = await auth.service.storage
    .from("studies")
    .download(study.storage_path)

  if (downloadError || !imageBlob) {
    addStep("storage.download_image", false, { message: downloadError?.message, storagePath: study.storage_path })
    return NextResponse.json(
      { error: downloadError?.message ?? "Could not read archived image.", debug: debugPayload() },
      { status: 500 },
    )
  }
  addStep("storage.download_image", true, { size: imageBlob.size, type: imageBlob.type })

  await auth.service.from("studies").update({ status: "analyzing", analysis_error: null }).eq("id", study.id)
  addStep("database.mark_analyzing", true)

  const startedAt = Date.now()
  const image = Buffer.from(await imageBlob.arrayBuffer())
  const contextRow = Array.isArray(study.study_clinical_context)
    ? study.study_clinical_context[0]
    : study.study_clinical_context
  const clinicalContext = {
    spo2: contextRow?.spo2 ?? null,
    fever: contextRow?.fever ?? false,
    symptoms: contextRow?.symptoms ?? null,
  }

  try {
    addStep("ai.parallel_start", true, {
      classification: "huggingface",
      heatmap: process.env.GRADCAM_API_URL ? "gradcam_endpoint" : "skipped_no_url",
    })
    const [classification, heatmap] = await Promise.all([
      classifyChestXray(image, study.image_mime_type),
      generateHeatmap(image, study.image_mime_type),
    ])
    addStep("ai.huggingface_classification", true, {
      modelId: classification.modelId,
      labels: Object.keys(classification.probabilities),
      probabilities: classification.probabilities,
    })
    addStep("ai.gradcam_heatmap", !heatmap.error, {
      skipped: heatmap.skipped,
      hasHeatmap: Boolean(heatmap.heatmap),
      contentType: heatmap.contentType,
      error: heatmap.error,
    })

    const risk = computeRisk(classification.probabilities, clinicalContext)
    addStep("risk.compute", true, risk)

    const report = await generateReport({
      probabilities: classification.probabilities,
      risk,
      clinicalContext,
    })
    addStep("report.generate", true, {
      modelUsed: report.modelUsed,
      fallback: report.modelUsed === "fallback-template",
      rawPresent: Boolean(report.raw),
    })

    let heatmapStoragePath: string | null = null
    if (heatmap.heatmap) {
      heatmapStoragePath = `${auth.profile.organization_id}/${study.id}/heatmap.png`
      const { error: heatmapStorageError } = await auth.service.storage
        .from("studies")
        .upload(heatmapStoragePath, heatmap.heatmap, {
          contentType: heatmap.contentType ?? "image/png",
          upsert: true,
        })

      if (heatmapStorageError) {
        heatmapStoragePath = null
        addStep("storage.upload_heatmap", false, { message: heatmapStorageError.message })
      } else {
        addStep("storage.upload_heatmap", true, { heatmapStoragePath })
      }
    } else {
      addStep("storage.upload_heatmap", true, { skipped: true })
    }

    await auth.service.from("study_findings").delete().eq("study_id", study.id)
    addStep("database.clear_findings", true)

    const findings = Object.entries(classification.probabilities)
      .map(([label, probability]) => ({
        study_id: study.id,
        label: labelForDisplay(label),
        confidence: Math.round((probability ?? 0) * 100),
        raw_probability: probability ?? 0,
      }))
      .sort((a, b) => b.confidence - a.confidence)

    if (findings.length > 0) {
      const { error: findingsError } = await auth.service.from("study_findings").insert(findings)
      if (findingsError) {
        addStep("database.insert_findings", false, { message: findingsError.message })
        throw new Error(findingsError.message)
      }
    }
    addStep("database.insert_findings", true, { count: findings.length })

    const { error: reportError } = await auth.service.from("reports").upsert(
      {
        study_id: study.id,
        summary: report.summary,
        comparison: report.comparison,
        recommendation: report.recommendation,
        disclaimer: report.disclaimer,
        raw_llm_response: report.raw,
        model_used: report.modelUsed,
      },
      { onConflict: "study_id" },
    )

    if (reportError) {
      addStep("database.upsert_report", false, { message: reportError.message })
      throw new Error(reportError.message)
    }
    addStep("database.upsert_report", true)

    const nextStatus = risk.score >= highRiskThreshold() ? "critical" : "analyzed"
    const { error: updateError } = await auth.service
      .from("studies")
      .update({
        heatmap_storage_path: heatmapStoragePath,
        status: nextStatus,
        risk_score: risk.score,
        risk_level: risk.level,
        model_id: classification.modelId,
        report_model_id: report.modelUsed,
        analysis_duration_ms: Date.now() - startedAt,
        analysis_error: heatmap.error ?? null,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", study.id)

    if (updateError) {
      addStep("database.update_study_result", false, { message: updateError.message })
      throw new Error(updateError.message)
    }
    addStep("database.update_study_result", true, {
      status: nextStatus,
      riskScore: risk.score,
      riskLevel: risk.level,
      analysisDurationMs: Date.now() - startedAt,
    })

    if (risk.score >= highRiskThreshold()) {
      const topFinding = findings[0]?.label ?? "High-risk pattern"
      await auth.service.from("alerts").upsert(
        {
          organization_id: auth.profile.organization_id!,
          study_id: study.id,
          title: `High-risk ${topFinding} pattern`,
          risk_score: risk.score,
        },
        { onConflict: "study_id" },
      )
      addStep("alerts.upsert", true, { threshold: highRiskThreshold(), riskScore: risk.score })

      const [{ data: admins }, { data: organization }] = await Promise.all([
        auth.service
          .from("profiles")
          .select("email")
          .eq("organization_id", auth.profile.organization_id!)
          .eq("is_admin", true),
        auth.service.from("organizations").select("name").eq("id", auth.profile.organization_id!).single(),
      ])

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://radiant.trymindcore.com"
      await Promise.allSettled(
        (admins ?? []).map((admin) =>
          sendHighRiskAlertEmail({
            to: admin.email,
            patientId: study.patients?.external_id ?? "Unknown",
            studyUrl: `${appUrl}/`,
            riskScore: risk.score,
            topFinding,
            organizationName: organization?.name ?? "Radiant",
          }),
        ),
      )
      addStep("alerts.email_admins", true, { attempted: admins?.length ?? 0 })
    } else {
      addStep("alerts.skip", true, { threshold: highRiskThreshold(), riskScore: risk.score })
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
      throw new Error(viewError.message)
    }
    addStep("database.reload_view", true)

    const [view] = await mapStudyRows(auth.service, rows ?? [])
    return NextResponse.json({ study: view, debug: debugPayload({ durationMs: Date.now() - startedAt }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed."
    addStep("analysis.failed", false, errorDebug(error))
    await auth.service
      .from("studies")
      .update({ status: "failed", analysis_error: message, analysis_duration_ms: Date.now() - startedAt })
      .eq("id", study.id)

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
