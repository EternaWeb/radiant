import type { FindingZone, RiskLevel } from "@/lib/supabase/types"

export const GPT_VISION_FINDING_LABELS = [
  "pneumonia",
  "pleural_effusion",
  "pneumothorax",
  "lung_opacity",
  "cardiomegaly",
  "normal",
] as const

export const GPT_VISION_ZONES = ["left_upper", "left_lower", "right_upper", "right_lower", "center"] as const

export type GptVisionFindingLabel = (typeof GPT_VISION_FINDING_LABELS)[number]

export type GptVisionFinding = {
  label: GptVisionFindingLabel
  zone: FindingZone
  confidence: number
}

export type GptVisionAnalysis = {
  riskScore: number
  riskLevel: RiskLevel
  findings: GptVisionFinding[]
  summary: string
  raw: {
    risk_score: number
    risk_level: "LOW" | "MEDIUM" | "HIGH"
    findings: GptVisionFinding[]
    summary: string
  }
  modelId: string
  responseId: string | null
}

type OpenAiChatCompletion = {
  id?: string
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

type OpenAiMessageContent = string | Array<{ type?: string; text?: string }> | undefined

const SYSTEM_PROMPT = `You are an AI radiology assistant for a hackathon medical imaging system.
Analyze the provided chest X-ray image.
Return ONLY valid JSON. No explanations, no markdown, no extra text.

Allowed findings labels ONLY:
- pneumonia
- pleural_effusion
- pneumothorax
- lung_opacity
- cardiomegaly
- normal

Allowed zones:
- left_upper
- left_lower
- right_upper
- right_lower
- center

Output JSON schema:
{
  "risk_score": number (0-100),
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "findings": [
    {
      "label": one of allowed labels,
      "zone": one of allowed zones,
      "confidence": number between 0 and 1
    }
  ],
  "summary": string
}

Rules:
- Always return valid JSON
- Be consistent between findings and risk_score
- If multiple findings exist, risk_score must increase
- Do not hallucinate outside allowed labels
- Keep output deterministic (temperature = 0.1)
- This system is an AI-assisted imaging workflow and decision support system, not a medical diagnostic tool.`

const labelSet = new Set<string>(GPT_VISION_FINDING_LABELS)
const zoneSet = new Set<string>(GPT_VISION_ZONES)
const riskLevelSet = new Set(["LOW", "MEDIUM", "HIGH"])

export class GptVisionAnalysisError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "GptVisionAnalysisError"
  }
}

function getApiKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new GptVisionAnalysisError("OPENAI_API_KEY is not configured.")
  }
  return key
}

function getVisionModel() {
  return process.env.OPENAI_VISION_MODEL || "gpt-4o"
}

function asTextContent(content: OpenAiMessageContent) {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" || "text" in part ? part.text ?? "" : ""))
      .join("")
      .trim()
  }
  return ""
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new GptVisionAnalysisError("GPT-4o Vision returned non-JSON content.", undefined, { body: text.slice(0, 1000) })
    return JSON.parse(match[0])
  }
}

function assertObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GptVisionAnalysisError(`${name} must be a JSON object.`, undefined, { value })
  }
}

function clampRiskScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new GptVisionAnalysisError("risk_score must be a number.", undefined, { value })
  }

  if (value < 0 || value > 100) {
    throw new GptVisionAnalysisError("risk_score must be between 0 and 100.", undefined, { value })
  }

  return Math.round(value)
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (typeof value !== "string") {
    throw new GptVisionAnalysisError("risk_level must be a string.", undefined, { value })
  }

  const normalized = value.toUpperCase()
  if (!riskLevelSet.has(normalized)) {
    throw new GptVisionAnalysisError("risk_level is not allowed.", undefined, { value })
  }

  return normalized.toLowerCase() as RiskLevel
}

function validateFinding(value: unknown, index: number): GptVisionFinding {
  assertObject(value, `findings[${index}]`)

  const label = value.label
  const zone = value.zone
  const confidence = value.confidence

  if (typeof label !== "string" || !labelSet.has(label)) {
    throw new GptVisionAnalysisError("Finding label is not allowed.", undefined, { index, label })
  }

  if (typeof zone !== "string" || !zoneSet.has(zone)) {
    throw new GptVisionAnalysisError("Finding zone is not allowed.", undefined, { index, zone })
  }

  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new GptVisionAnalysisError("Finding confidence must be between 0 and 1.", undefined, { index, confidence })
  }

  return {
    label: label as GptVisionFindingLabel,
    zone: zone as FindingZone,
    confidence,
  }
}

function normalizeAnalysis(payload: unknown, modelId: string, responseId: string | null): GptVisionAnalysis {
  assertObject(payload, "GPT-4o Vision response")

  if (!Array.isArray(payload.findings)) {
    throw new GptVisionAnalysisError("findings must be an array.", undefined, { findings: payload.findings })
  }

  if (typeof payload.summary !== "string" || !payload.summary.trim()) {
    throw new GptVisionAnalysisError("summary must be a non-empty string.", undefined, { summary: payload.summary })
  }

  const riskScore = clampRiskScore(payload.risk_score)
  const riskLevel = normalizeRiskLevel(payload.risk_level)
  const findings = payload.findings.map(validateFinding)

  if (findings.length === 0) {
    throw new GptVisionAnalysisError("findings must contain at least one result.")
  }

  const raw = {
    risk_score: riskScore,
    risk_level: riskLevel.toUpperCase() as "LOW" | "MEDIUM" | "HIGH",
    findings,
    summary: payload.summary.trim(),
  }

  return {
    riskScore,
    riskLevel,
    findings,
    summary: raw.summary,
    raw,
    modelId,
    responseId,
  }
}

export async function analyzeChestXrayWithGptVision(image: Buffer, mimeType: string): Promise<GptVisionAnalysis> {
  const modelId = getVisionModel()
  const timeoutMs = Number(process.env.OPENAI_VISION_TIMEOUT_MS ?? "60000")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`

  let response: Response
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0.1,
        max_tokens: Number(process.env.OPENAI_VISION_MAX_TOKENS ?? "800"),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this chest X-ray image and return the required JSON object.",
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (error) {
    throw new GptVisionAnalysisError("GPT-4o Vision request failed before receiving an HTTP response.", undefined, {
      modelId,
      timeoutMs,
      mimeType,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    })
  } finally {
    clearTimeout(timeout)
  }

  const responseText = await response.text()
  let payload: OpenAiChatCompletion

  try {
    payload = JSON.parse(responseText) as OpenAiChatCompletion
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new GptVisionAnalysisError(payload.error?.message ?? "GPT-4o Vision analysis failed.", response.status, {
      modelId,
      status: response.status,
      statusText: response.statusText,
      error: payload.error,
      body: responseText.slice(0, 1000),
    })
  }

  const content = asTextContent(payload.choices?.[0]?.message?.content)
  if (!content) {
    throw new GptVisionAnalysisError("GPT-4o Vision returned an empty response.", undefined, { modelId, responseId: payload.id })
  }

  return normalizeAnalysis(parseJsonObject(content), modelId, payload.id ?? null)
}
