import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter/buildConstructionWorkPlan";
import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { resolveFormulaFromWorkPlan } from "../../src/lib/ai/constructionFormulas/resolveFormulaFromWorkPlan";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";
import { resolveLocalRateSources } from "../../src/lib/ai/localRateSources";
import {
  AI_ESTIMATE_MEMORY_BUDGET_BYTES,
  AI_ESTIMATE_STEP_BUDGETS_MS,
  collectAiEstimateLatencyMetrics,
  measureAiEstimateStep,
  type AiEstimatePerformanceStep,
} from "../../src/lib/ai/performance";
import { classifyConstructionWorkOutcome } from "../../src/lib/ai/worldConstructionInterpreter/classifyConstructionWorkOutcome";
import { compileParametricBoqRecipe } from "../../src/lib/ai/professionalBoq";
import { resolveCatalogCandidatesForMaterial } from "../../src/lib/ai/catalogBinding";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildEstimatePdfViewModel, createEstimatePdf } from "../../src/lib/estimatePdf";

export const REPRESENTATIVE_PROMPT = SEMANTIC_CONFUSION_GOLDEN_PROMPTS[0]?.prompt ?? "estimate paving stone 100 sq_m";
export const WORLD_REPRESENTATIVE_PROMPT = "estimate asphalt paving 1000 sq_m";
const REPRESENTATIVE_PERFORMANCE_SAMPLE_COUNT = 20;

export function expectMeasuredStepWithinBudget<T>(step: AiEstimatePerformanceStep, run: () => T): T {
  let representativeValue: T | undefined;
  const metrics = Array.from({ length: REPRESENTATIVE_PERFORMANCE_SAMPLE_COUNT }, (_, index) => {
    const measured = measureAiEstimateStep(step, run, { sampleId: `${step}:${index + 1}` });
    if (index === 0) representativeValue = measured.value;
    expect(measured.metric.durationMs).toBeGreaterThanOrEqual(0);
    return measured.metric;
  });
  const summary = collectAiEstimateLatencyMetrics(metrics)[step];
  expect(summary.samples).toBe(REPRESENTATIVE_PERFORMANCE_SAMPLE_COUNT);
  expect(summary.p95Ms).toBeLessThanOrEqual(AI_ESTIMATE_STEP_BUDGETS_MS[step]);
  return representativeValue as T;
}

export function representativeEstimate() {
  const answer = answerBuiltInAi({
    text: REPRESENTATIVE_PROMPT,
    route: "/request",
    screenContext: "request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!answer.toolResult.estimate) throw new Error("representative estimate missing");
  return { answer, estimate: answer.toolResult.estimate };
}

export function expectRepresentativeSemanticFrame() {
  return expectMeasuredStepWithinBudget("semantic_frame_build", () => classifyConstructionWorkOutcome({ text: WORLD_REPRESENTATIVE_PROMPT }));
}

export function expectRepresentativeWorkPlan() {
  return expectMeasuredStepWithinBudget("construction_work_plan_build", () => {
    const plan = buildConstructionWorkPlan(REPRESENTATIVE_PROMPT);
    if (!plan) throw new Error("work plan missing");
    return plan;
  });
}

export function expectRepresentativeFormula() {
  const plan = expectRepresentativeWorkPlan();
  return expectMeasuredStepWithinBudget("formula_unit_resolver", () => resolveFormulaFromWorkPlan(plan));
}

export function expectRepresentativeParametricRecipe() {
  const semantic = expectRepresentativeSemanticFrame();
  return expectMeasuredStepWithinBudget("parametric_boq_recipe_compiler", () => compileParametricBoqRecipe(semantic.primitive));
}

export function expectRepresentativeCatalogBinding() {
  const { estimate } = representativeEstimate();
  const row = estimate.sections.flatMap((section) => section.rows)[0];
  if (!row) throw new Error("representative row missing");
  return expectMeasuredStepWithinBudget("catalog_binding", () =>
    resolveCatalogCandidatesForMaterial({ row, candidates: [] }),
  );
}

export function expectRepresentativeLocalRateSource() {
  const context = resolveCountryRegionCity({ prompt: REPRESENTATIVE_PROMPT, countryCode: "KG", city: "Bishkek" });
  return expectMeasuredStepWithinBudget("local_rate_source_lookup", () => resolveLocalRateSources(context));
}

export function expectRepresentativeRequestDraft() {
  return expectMeasuredStepWithinBudget("request_draft_build", () =>
    buildConsumerRepairAiDraft(REPRESENTATIVE_PROMPT, { countryCode: "KG", city: "Bishkek" }),
  );
}

export function expectRepresentativePdfPayload() {
  const { answer, estimate } = representativeEstimate();
  return expectMeasuredStepWithinBudget("pdf_payload_build", () =>
    buildEstimatePdfViewModel({
      estimate,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: "2026-05-29T00:00:00.000Z",
      language: "ru",
    }),
  );
}

export function expectRepresentativePdfGeneration() {
  const { answer, estimate } = representativeEstimate();
  return expectMeasuredStepWithinBudget("pdf_file_generation", () =>
    createEstimatePdf({
      estimate,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: "2026-05-29T00:00:00.000Z",
      language: "ru",
    }),
  );
}

export function expectMemoryBudgetBoundary() {
  expect(AI_ESTIMATE_MEMORY_BUDGET_BYTES).toBeGreaterThanOrEqual(256 * 1024 * 1024);
}
