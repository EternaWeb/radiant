const DEFAULT_CHEXPERT_MODEL_ID = "calender/Convnext-Chexpert-Attention"

export const CHEXPERT_LABELS = [
  "No Finding",
  "Enlarged Cardiomediastinum",
  "Cardiomegaly",
  "Lung Opacity",
  "Lung Lesion",
  "Edema",
  "Consolidation",
  "Pneumonia",
  "Atelectasis",
  "Pneumothorax",
  "Pleural Effusion",
  "Pleural Other",
  "Fracture",
  "Support Devices",
] as const

export type ChexpertLabel = (typeof CHEXPERT_LABELS)[number]
export type ChexpertProbabilities = Partial<Record<ChexpertLabel, number>>

export type ChexpertAttentionResult = {
  modelId: string
  probabilities: ChexpertProbabilities
  heatmap: Buffer | null
  heatmapContentType: "image/png" | null
  raw: unknown
  endpoint: string
}

type LabelScore = {
  label?: string
  name?: string
  class?: string
  score?: number
  probability?: number
  confidence?: number
}

export class ChexpertAttentionError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "ChexpertAttentionError"
  }
}

function getModelId() {
  return process.env.CHEXPERT_MODEL_ID || DEFAULT_CHEXPERT_MODEL_ID
}

function getEndpoint() {
  const endpoint = process.env.CHEXPERT_SPACE_URL?.trim()
  if (!endpoint) {
    throw new ChexpertAttentionError("CHEXPERT_SPACE_URL is not configured.", undefined, {
      modelId: getModelId(),
    })
  }

  return endpoint
}

function getTimeoutMs() {
  const configured = Number(process.env.CHEXPERT_TIMEOUT_MS ?? "60000")
  return Number.isFinite(configured) ? configured : 60000
}

function imageDataUrl(image: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${image.toString("base64")}`
}

function errorCause(error: unknown) {
  if (!(error instanceof Error)) return undefined

  const cause = (error as Error & { cause?: unknown }).cause
  if (!cause || typeof cause !== "object") return undefined

  return Object.fromEntries(
    Object.entries(cause as Record<string, unknown>).filter(([, value]) => typeof value !== "function"),
  )
}

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1)
}

function canonicalLabel(label: string): ChexpertLabel | null {
  const normalized = label.toLowerCase().replace(/[_-]/g, " ").trim()

  return (
    CHEXPERT_LABELS.find((candidate) => candidate.toLowerCase() === normalized) ??
    CHEXPERT_LABELS.find((candidate) => normalized.includes(candidate.toLowerCase())) ??
    null
  )
}

function extractObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const found = extractObject(entry)
      if (found) return found
    }

    return null
  }

  return payload as Record<string, unknown>
}

function findValueByKeys(payload: unknown, keys: string[]): unknown {
  if (!payload || typeof payload !== "object") return null

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const found = findValueByKeys(entry, keys)
      if (found) return found
    }

    return null
  }

  const record = payload as Record<string, unknown>
  for (const key of keys) {
    if (record[key]) return record[key]
  }

  for (const value of Object.values(record)) {
    const found = findValueByKeys(value, keys)
    if (found) return found
  }

  return null
}

function flattenLabelScores(payload: unknown): LabelScore[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => flattenLabelScores(entry))
  }

  if (!payload || typeof payload !== "object") return []

  const record = payload as Record<string, unknown>

  if ("label" in record || "score" in record || "probability" in record || "confidence" in record) {
    return [record as LabelScore]
  }

  return Object.entries(record).flatMap(([label, value]) => {
    if (typeof value === "number") {
      return [{ label, score: value }]
    }

    return []
  })
}

function normalizeProbabilities(payload: unknown): ChexpertProbabilities {
  const source = findValueByKeys(payload, ["probabilities", "predictions", "labels"]) ?? payload
  const probabilities: ChexpertProbabilities = {}

  for (const item of flattenLabelScores(source)) {
    const rawLabel = item.label ?? item.name ?? item.class
    const rawScore = item.score ?? item.probability ?? item.confidence
    if (!rawLabel || typeof rawScore !== "number") continue

    const label = canonicalLabel(rawLabel)
    if (!label) continue

    probabilities[label] = Math.max(probabilities[label] ?? 0, clampProbability(rawScore))
  }

  return probabilities
}

function findHeatmapString(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload.startsWith("data:image/") ? payload : null
  }

  if (!payload || typeof payload !== "object") return null

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const found = findHeatmapString(entry)
      if (found) return found
    }

    return null
  }

  const root = payload as Record<string, unknown>
  const candidate =
    root.heatmap ??
    root.heatmap_png ??
    root.heatmapImage ??
    root.heatmap_image ??
    root.overlay ??
    root.image_overlay

  if (typeof candidate === "string") return candidate

  for (const value of Object.values(root)) {
    const found = findHeatmapString(value)
    if (found) return found
  }

  return null
}

function decodeHeatmap(payload: unknown) {
  const encoded = findHeatmapString(payload)
  if (!encoded) return null

  const base64 = encoded.includes(",") ? encoded.split(",").pop() : encoded
  if (!base64) return null

  return Buffer.from(base64, "base64")
}

export async function analyzeWithChexpertAttention(
  image: Buffer,
  mimeType: string,
): Promise<ChexpertAttentionResult> {
  const endpoint = getEndpoint()
  const modelId = getModelId()
  const timeoutMs = getTimeoutMs()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const token = process.env.CHEXPERT_SPACE_TOKEN?.trim()

  let response: Response

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        image: imageDataUrl(image, mimeType),
        mimeType,
        model: modelId,
      }),
      cache: "no-store",
      signal: controller.signal,
    })
  } catch (error) {
    throw new ChexpertAttentionError(
      "ConvNeXt-CheXpert Space request failed before receiving an HTTP response.",
      undefined,
      {
        endpoint,
        modelId,
        mimeType,
        timeoutMs,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
        cause: errorCause(error),
      },
    )
  } finally {
    clearTimeout(timeout)
  }

  const responseText = await response.text()

  if (!response.ok) {
    throw new ChexpertAttentionError(responseText || "ConvNeXt-CheXpert Space request failed.", response.status, {
      endpoint,
      modelId,
      mimeType,
      timeoutMs,
      status: response.status,
      statusText: response.statusText,
      body: responseText.slice(0, 2000),
    })
  }

  let raw: unknown
  try {
    raw = responseText ? JSON.parse(responseText) : {}
  } catch {
    throw new ChexpertAttentionError("ConvNeXt-CheXpert Space returned non-JSON output.", response.status, {
      endpoint,
      modelId,
      contentType: response.headers.get("content-type"),
      body: responseText.slice(0, 2000),
    })
  }

  const probabilities = normalizeProbabilities(raw)
  const heatmap = decodeHeatmap(raw)

  if (Object.keys(probabilities).length === 0) {
    throw new ChexpertAttentionError("ConvNeXt-CheXpert Space returned no supported CheXpert probabilities.", 200, {
      endpoint,
      modelId,
      responseKeys: extractObject(raw) ? Object.keys(extractObject(raw)!) : [],
      body: responseText.slice(0, 2000),
    })
  }

  return {
    modelId,
    probabilities,
    heatmap,
    heatmapContentType: heatmap ? "image/png" : null,
    raw,
    endpoint,
  }
}
