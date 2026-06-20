import type { RiskLevel } from "@/lib/supabase/types"

type ProbabilityMap = Record<string, number | undefined>

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

function probability(probabilities: ProbabilityMap, label: string) {
  const exact = probabilities[label]
  if (typeof exact === "number") return exact

  const normalized = label.toLowerCase()
  const match = Object.entries(probabilities).find(([key]) => key.toLowerCase() === normalized)

  return typeof match?.[1] === "number" ? match[1] : 0
}

export function computeRisk(probabilities: ProbabilityMap, clinicalContext: ClinicalContextInput = {}): RiskResult {
  const values = Object.values(probabilities).filter((value): value is number => typeof value === "number")
  let risk = (values.length > 0 ? Math.max(...values) : 0) * 100
  const modifiers: string[] = []

  if (probability(probabilities, "Pneumonia") > 0.8) {
    risk += 10
    modifiers.push("Pneumonia probability above 80%")
  }

  if (probability(probabilities, "Pleural Effusion") > 0.8) {
    risk += 8
    modifiers.push("Pleural effusion probability above 80%")
  }

  if (probability(probabilities, "Pneumothorax") > 0.7) {
    risk += 15
    modifiers.push("Pneumothorax probability above 70%")
  }

  if (probability(probabilities, "Lung Opacity") > 0.8) {
    risk += 8
    modifiers.push("Lung opacity probability above 80%")
  }

  if (probability(probabilities, "Cardiomegaly") > 0.8) {
    risk += 6
    modifiers.push("Cardiomegaly probability above 80%")
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
