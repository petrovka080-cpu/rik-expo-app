import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  buildEstimatorReasoningPlan,
  resolveEstimatorOutcome,
  type EstimatorReasoningPlan,
} from "../../src/lib/ai/estimatorKernel";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq";

export const UNIVERSAL_PROMPTS = {
  elevator: "смета на установку лифта пассажирского на 14 этажей",
  drainage: "смета на дренажные каналы 120 метров",
  concretePedestals: "смета на заливку тумб ширина 0,4 высота 5 метров длина 0,5 метров и надо 10 штук",
  electrical: "смета на электромонтаж 100 м2",
  metalCanopy: "смета на металлический навес 647 кв м",
  hydro: "смета на установку турбины на ГЭС 100 кВт",
} as const;

export function estimatorPlan(prompt: string): EstimatorReasoningPlan {
  const plan = buildEstimatorReasoningPlan({ text: prompt, currency: "KGS" });
  if (!plan) throw new Error(`ESTIMATOR_PLAN_MISSING:${prompt}`);
  return {
    ...plan,
    formulas: resolveEstimatorOutcome({ text: prompt, currency: "KGS" }).plan?.formulas ?? plan.formulas,
  };
}

export function dynamicBoq(prompt: string) {
  const outcome = resolveEstimatorOutcome({ text: prompt, currency: "KGS" });
  if (!outcome.plan) throw new Error(`OUTCOME_PLAN_MISSING:${prompt}`);
  return compileDynamicProfessionalBoq(outcome.plan);
}

export function requestEstimate(prompt: string): GlobalEstimateResult {
  const answer = answerBuiltInAi({
    text: prompt,
    route: "/request",
    screenContext: "request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!answer.toolResult.estimate) {
    throw new Error(`ESTIMATE_MISSING:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? "none"}`);
  }
  return answer.toolResult.estimate;
}

export function embeddedEstimate(prompt: string, context: "request" | "foreman" = "foreman"): GlobalEstimateResult {
  const answer = answerBuiltInAi({
    text: prompt,
    route: `/ai?context=${context}`,
    screenContext: context,
    role: context,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (answer.route.intent !== "estimate") throw new Error(`INTENT_NOT_ESTIMATE:${answer.route.intent}`);
  if (!answer.toolResult.estimate) {
    throw new Error(`ESTIMATE_MISSING:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? "none"}`);
  }
  return answer.toolResult.estimate;
}

export function rowNames(estimate: GlobalEstimateResult): string[] {
  return estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
}

export function rowText(estimate: GlobalEstimateResult): string {
  return rowNames(estimate).join("\n").toLocaleLowerCase("ru-RU");
}

export function expectNoWeakGenericRows(estimate: GlobalEstimateResult): void {
  const forbidden = new Set([
    "материал",
    "работы",
    "монтаж",
    "крепёж",
    "крепеж",
    "прочее",
    "дополнительные материалы",
    "дополнительные работы",
    "строительные работы",
    "бетонные работы",
  ]);
  for (const row of rowNames(estimate)) {
    expect(forbidden.has(row.trim().toLocaleLowerCase("ru-RU"))).toBe(false);
  }
}
