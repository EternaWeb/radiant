import { NextResponse } from "next/server"
import { isApiError, requireCompletedProfile } from "@/lib/api-auth"
import { generateHeatmap } from "@/lib/gradcam"
import { classifyChestXray } from "@/lib/huggingface"
import { computeRisk } from "@/lib/risk"
import { generateReport } from "@/lib/reports"
import { sendHighRiskAlertEmail } from "@/lib/resend"
import { mapStudyRows } from "@/lib/study-mappers"

type Context = {
  params: Promise<{ id: string }>
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

  const { id } = await context.params
  const access = await canAccessStudy(auth, id)
  if (!access) {
    return NextResponse.json({ error: "Study not found." }, { status: 404 })
  }

  const { data: rawStudy, error: studyError } = await (auth.service.from("studies") as any)
    .select("*, patients(external_id, display_name), study_clinical_context(*)")
    .eq("id", id)
    .eq("organization_id", auth.profile.organization_id!)
    .single()

  if (studyError || !rawStudy) {
    return NextResponse.json({ error: studyError?.message ?? "Study not found." }, { status: 404 })
  }

  const study = rawStudy as any

  const { data: imageBlob, error: downloadError } = await auth.service.storage
    .from("studies")
    .download(study.storage_path)

  if (downloadError || !imageBlob) {
    return NextResponse.json({ error: downloadError?.message ?? "Could not read archived image." }, { status: 500 })
  }

  await auth.service.from("studies").update({ status: "analyzing", analysis_error: null }).eq("id", study.id)

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
    const [classification, heatmap] = await Promise.all([
      classifyChestXray(image, study.image_mime_type),
      generateHeatmap(image, study.image_mime_type),
    ])
    const risk = computeRisk(classification.probabilities, clinicalContext)
    const report = await generateReport({
      probabilities: classification.probabilities,
      risk,
      clinicalContext,
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
      }
    }

    await auth.service.from("study_findings").delete().eq("study_id", study.id)

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
        throw new Error(findingsError.message)
      }
    }

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
      throw new Error(reportError.message)
    }

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
      throw new Error(updateError.message)
    }

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
      throw new Error(viewError.message)
    }

    const [view] = await mapStudyRows(auth.service, rows ?? [])
    return NextResponse.json({ study: view })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed."
    await auth.service
      .from("studies")
      .update({ status: "failed", analysis_error: message, analysis_duration_ms: Date.now() - startedAt })
      .eq("id", study.id)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
