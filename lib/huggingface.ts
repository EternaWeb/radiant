const DEFAULT_MODEL_ID = "google/cxr-foundation"

export const CHEST_XRAY_LABELS = ["pneumonia", "effusion", "cardiomegaly", "nodules"] as const

export type ChestXrayLabel = (typeof CHEST_XRAY_LABELS)[number]
export type ChestXrayProbabilities = Partial<Record<ChestXrayLabel, number>>

type HuggingFaceLabelResult = {
  label?: string
  score?: number
}

export class HuggingFaceInferenceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "HuggingFaceInferenceError"
  }
}

function getModelId() {
  return process.env.HUGGINGFACE_MODEL_ID || DEFAULT_MODEL_ID
}

function getApiKey() {
  const key = process.env.HUGGINGFACE_API_KEY
  if (!key) {
    throw new HuggingFaceInferenceError("HUGGINGFACE_API_KEY is not configured.")
  }
  return key
}

function canonicalLabel(label: string): ChestXrayLabel | null {
  const normalized = label.toLowerCase().replace(/[_-]/g, " ")

  if (normalized.includes("pneumonia") || normalized.includes("opacity") || normalized.includes("consolidation")) {
    return "pneumonia"
  }

  if (normalized.includes("effusion") || normalized.includes("fluid")) {
    return "effusion"
  }

  if (normalized.includes("cardiomegaly") || normalized.includes("enlarged heart")) {
    return "cardiomegaly"
  }

  if (normalized.includes("nodule") || normalized.includes("mass")) {
    return "nodules"
  }

  return null
}

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1)
}

function flattenResults(payload: unknown): HuggingFaceLabelResult[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => flattenResults(entry))
  }

  if (payload && typeof payload === "object") {
    if ("label" in payload || "score" in payload) {
      return [payload as HuggingFaceLabelResult]
    }

    return Object.entries(payload).flatMap(([label, score]) => {
      if (typeof score === "number") {
        return [{ label, score }]
      }

      return []
    })
  }

  return []
}

export function normalizeChestXrayProbabilities(payload: unknown): ChestXrayProbabilities {
  const probabilities: ChestXrayProbabilities = {}

  for (const result of flattenResults(payload)) {
    if (!result.label || typeof result.score !== "number") continue

    const label = canonicalLabel(result.label)
    if (!label) continue

    probabilities[label] = Math.max(probabilities[label] ?? 0, clampProbability(result.score))
  }

  return probabilities
}

async function requestInference(image: Buffer, mimeType: string, attempt = 1): Promise<unknown> {
  const modelId = getModelId()
  const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": mimeType,
    },
    body: image,
  })

  if (response.status === 503 && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return requestInference(image, mimeType, attempt + 1)
  }

  if (!response.ok) {
    const message = await response.text()
    throw new HuggingFaceInferenceError(message || "Hugging Face inference failed.", response.status)
  }

  return response.json()
}

export async function classifyChestXray(image: Buffer, mimeType: string): Promise<{
  modelId: string
  probabilities: ChestXrayProbabilities
  raw: unknown
}> {
  const raw = await requestInference(image, mimeType)
  const probabilities = normalizeChestXrayProbabilities(raw)

  return {
    modelId: getModelId(),
    probabilities,
    raw,
  }
}
