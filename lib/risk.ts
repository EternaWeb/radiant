import type { RiskLevel } from "@/lib/supabase/types"
import type { ChestXrayProbabilities } from "./huggingface"

export type ClinicalContextInput = {
  spo2?: number | null
  fever?: boolean | null
  symptoms?: string | null
}

export type RiskResult = {
  score: number
  level: RiskLevel
  modifiers: string[]
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "high"
  if (score >= 40) return "medium"
  return "low"
}

export function computeRisk(probabilities: ChestXrayProbabilities, clinicalContext: ClinicalContextInput = {}): RiskResult {
  const values = Object.values(probabilities).filter((value): value is number => typeof value === "number")
  let risk = (values.length > 0 ? Math.max(...values) : 0) * 100
  const modifiers: string[] = []

  if ((probabilities.pneumonia ?? 0) > 0.8) {
    risk += 10
    modifiers.push("Pneumonia probability above 80%")
  }

  if (typeof clinicalContext.spo2 === "number" && clinicalContext.spo2 < 90) {
    risk += 10
    modifiers.push("Oxygen saturation below 90%")
  }

  if (clinicalContext.fever) {
    risk += 5
    modifiers.push("Fever reported")
  }

  const score = Math.min(Math.round(risk), 100)

  return {
    score,
    level: riskLevel(score),
    modifiers,
  }
}
