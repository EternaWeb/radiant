import { CHEXPERT_LABELS } from "./chexpert-attention"
import type { ClinicalContextInput, RiskResult } from "./risk"

type ProbabilityMap = Record<string, number | undefined>

export type GeneratedReport = {
  summary: string
  comparison: string
  recommendation: string
  disclaimer: string
  raw: string | null
  modelUsed: string | null
}

type ReportInput = {
  probabilities: ProbabilityMap
  risk: RiskResult
  clinicalContext?: ClinicalContextInput
}

const DISCLAIMER = "AI-assisted draft. Not a clinical diagnosis; radiologist review is required."

function formatProbabilityList(probabilities: ProbabilityMap) {
  const entries = Object.entries(probabilities)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .map(([label, probability]) => `${label}: ${Math.round((probability ?? 0) * 100)}%`)

  return entries.length > 0 ? entries.join(", ") : "No supported chest X-ray labels returned."
}

function topFindings(probabilities: ProbabilityMap, limit = 3) {
  return Object.entries(probabilities)
    .filter(([, probability]) => typeof probability === "number")
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, limit)
    .map(([label, probability]) => `${label}: ${Math.round((probability ?? 0) * 100)}%`)
}

function fallbackReport({ probabilities, risk, clinicalContext }: ReportInput): GeneratedReport {
  const topFinding = Object.entries(probabilities).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]
  const findingText = topFinding
    ? `${topFinding[0]} confidence ${Math.round((topFinding[1] ?? 0) * 100)}%`
    : "no supported finding above threshold"
  const symptomText = clinicalContext?.symptoms ? ` Reported symptoms: ${clinicalContext.symptoms}.` : ""

  return {
    summary: `Pattern analysis produced a ${risk.level.toUpperCase()} risk score (${risk.score}%) with ${findingText}.${symptomText}`,
    comparison: "No prior study on file.",
    recommendation:
      risk.level === "high"
        ? "Immediate radiology review is recommended. Escalate to the appropriate department if clinical symptoms align."
        : risk.level === "medium"
          ? "Radiology review is recommended with correlation to clinical presentation."
          : "Routine radiology review is recommended.",
    disclaimer: DISCLAIMER,
    raw: null,
    modelUsed: "fallback-template",
  }
}

function buildPrompt({ probabilities, risk, clinicalContext }: ReportInput) {
  return `
You are drafting a concise radiology workflow support note for an AI imaging dashboard.
Do not provide a final diagnosis. Use cautious language and say radiologist review is required.

Chest X-ray model probabilities:
${formatProbabilityList(probabilities)}

Top 3 model findings:
${topFindings(probabilities).join(", ") || "No supported findings returned."}

Supported CheXpert labels:
${CHEXPERT_LABELS.join(", ")}

Risk score: ${risk.score}
Risk level: ${risk.level}
Risk modifiers: ${risk.modifiers.length ? risk.modifiers.join("; ") : "none"}
SpO2: ${clinicalContext?.spo2 ?? "not provided"}
Fever: ${clinicalContext?.fever ? "yes" : "no"}
Symptoms: ${clinicalContext?.symptoms || "not provided"}

Return JSON only with keys:
summary, comparison, recommendation.
`.trim()
}

function parseReport(raw: string, modelUsed: string): GeneratedReport {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch?.[0] ?? raw) as Partial<GeneratedReport>

  if (!parsed.summary || !parsed.recommendation) {
    throw new Error("Report model returned incomplete JSON.")
  }

  return {
    summary: parsed.summary,
    comparison: parsed.comparison || "No prior study on file.",
    recommendation: parsed.recommendation,
    disclaimer: DISCLAIMER,
    raw,
    modelUsed,
  }
}

async function generateWithOpenAI(input: ReportInput): Promise<GeneratedReport | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const model = process.env.OPENAI_REPORT_MODEL || "gpt-4o-mini"
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You return strict JSON for AI-assisted radiology workflow notes.",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error((await response.text()) || "OpenAI report generation failed.")
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error("OpenAI returned an empty report.")

  return parseReport(raw, model)
}

async function generateWithHuggingFaceText(input: ReportInput): Promise<GeneratedReport | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  const model = process.env.HUGGINGFACE_TEXT_MODEL_ID
  if (!apiKey || !model) return null

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: buildPrompt(input),
      parameters: {
        max_new_tokens: 220,
        temperature: 0.2,
        return_full_text: false,
      },
    }),
  })

  if (!response.ok) {
    throw new Error((await response.text()) || "Hugging Face text generation failed.")
  }

  const payload = (await response.json()) as unknown
  const raw = Array.isArray(payload)
    ? (payload[0] as { generated_text?: string })?.generated_text
    : (payload as { generated_text?: string })?.generated_text

  if (!raw) throw new Error("Hugging Face text model returned an empty report.")

  return parseReport(raw, model)
}

export async function generateReport(input: ReportInput): Promise<GeneratedReport> {
  try {
    const openAiReport = await generateWithOpenAI(input)
    if (openAiReport) return openAiReport

    const hfReport = await generateWithHuggingFaceText(input)
    if (hfReport) return hfReport
  } catch (error) {
    const fallback = fallbackReport(input)
    return {
      ...fallback,
      raw: error instanceof Error ? error.message : "Report generation failed.",
    }
  }

  return fallbackReport(input)
}
