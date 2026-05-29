import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_UNIVERSAL_ESTIMATOR_KERNEL");

const cases = [
  { route: "/request" as const, context: "request" as const, prompt: "смета на установку лифта пассажирского на 14 этажей" },
  { route: "/request" as const, context: "request" as const, prompt: "смета на дренажные каналы 120 метров" },
  { route: "/request" as const, context: "request" as const, prompt: "смета на заливку тумб на 1 этаж ширина 0,4 высота 5 метров длина 0,5 метров и надо 10 штук" },
  { route: "/request" as const, context: "request" as const, prompt: "смета на электромонтаж 100 м2" },
  { route: "/request" as const, context: "request" as const, prompt: "смета на металлический навес 647 кв м" },
  { route: "/ai?context=request" as const, context: "request" as const, prompt: "смета на установку лифта пассажирского на 14 этажей" },
  { route: "/ai?context=request" as const, context: "request" as const, prompt: "смета на дренажные каналы 120 метров" },
  { route: "/ai?context=foreman" as const, context: "foreman" as const, prompt: "смета на пассажирский лифт 14 этажей" },
  { route: "/ai?context=foreman" as const, context: "foreman" as const, prompt: "смета на бетонные тумбы 10 шт 0,4×0,5×5 м" },
  { route: "/ai?context=foreman" as const, context: "foreman" as const, prompt: "смета на установку турбины на ГЭС 100 кВт" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runUniversalEstimatorKernelFailureReproduction() {
  const results = cases.map((item) => {
    const outcome = resolveEstimatorOutcome({ text: item.prompt, currency: "KGS" });
    const answer = answerBuiltInAi({
      text: item.prompt,
      route: item.route,
      screenContext: item.context,
      role: item.context,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    const viewModel = estimate ? buildEstimatePresentationViewModel(estimate) : null;
    const pdf = estimate ? createEstimatePdf({
      estimate,
      runtimeTrace: answer.runtimeTrace,
      generatedAt: "2026-05-29T00:00:00.000Z",
      language: "ru",
    }) : null;
    const pdfText = pdf ? extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate?.work.workKey }).text : "";
    const failures = [
      ...(answer.route.intent !== "estimate" ? ["ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT"] : []),
      ...(!outcome.plan ? ["SEMANTIC_FRAME_MISSING"] : []),
      ...(!estimate ? ["WORK_PLAN_MISSING"] : []),
      ...(answer.toolResult.blockedBy === "TEMPLATE_GAP_SAFE_TRIAGE" ? ["TEMPLATE_GAP_FOR_PARSABLE_WORK"] : []),
      ...(estimate && estimate.sections.flatMap((section) => section.rows).length < 12 ? ["WEAK_GENERIC_ROWS_FOUND"] : []),
      ...(pdf && !validateNoPdfMojibake(pdfText).passed ? ["PDF_MOJIBAKE_FOUND"] : []),
    ];
    return {
      route: item.route,
      context: item.context,
      prompt: item.prompt,
      estimateIntentDetected: answer.route.intent === "estimate",
      screenRoleOverridden: answer.route.intent === "estimate",
      semanticFrame: outcome.plan?.semanticFrame ?? null,
      EstimatorReasoningPlan: outcome.plan,
      ConstructionWorkPlan: outcome.plan ? { workKey: outcome.plan.workKey, formulas: outcome.plan.formulas } : null,
      templateExactMatch: outcome.templateExactMatch,
      parsableWorkDetected: outcome.parsableWorkDetected,
      regulatedWorkDetected: outcome.regulatedWorkDetected,
      formulaResult: outcome.plan?.formulas ?? [],
      dynamicBoqUsed: outcome.dynamicBoqUsed,
      globalEstimateRows: estimate?.sections.flatMap((section) => section.rows).map((row) => row.name) ?? [],
      presentationRows: viewModel?.rows.map((row) => row.name) ?? [],
      pdfRows: pdfText.split(/\n/).filter(Boolean).slice(0, 80),
      catalogBinding: estimate?.sections
        .flatMap((section) => section.type === "materials" ? section.rows : [])
        .map((row) => ({ code: row.code, materialKey: row.materialKey })) ?? [],
      sourceTaxStatus: { sourceCount: estimate?.sources.length ?? 0, taxLabel: estimate?.tax.taxLabel ?? null },
      classification: failures.length === 0
        ? outcome.regulatedWorkDetected ? "REGULATED_SAFE_PROFESSIONAL_BOQ_OK" : "PARSABLE_DYNAMIC_BOQ_OK"
        : failures[0],
      runtimeTraceId: answer.runtimeTrace.traceId,
      failures,
    };
  });
  writeJson("failure_reproduction.json", results);
  return results;
}

if (require.main === module) {
  const results = runUniversalEstimatorKernelFailureReproduction();
  const unknown = results.find((result) => result.classification === "UNKNOWN_NEEDS_TRACE");
  if (unknown) throw new Error(`UNKNOWN_NEEDS_TRACE:${unknown.prompt}`);
}
