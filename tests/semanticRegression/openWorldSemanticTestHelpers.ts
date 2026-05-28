import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";
import type { SemanticGoldenPrompt } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import {
  assertUiRowsMatchGlobalEstimate,
  buildProfessionalEstimateTableViewModel,
  validateProfessionalEstimateTableViewModel,
} from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { buildEstimatePdfViewModel, createEstimatePdf } from "../../src/lib/estimatePdf";
import { answerFor } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

export const OPEN_WORLD_ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_OPEN_WORLD_ESTIMATE_SEMANTIC_COVERAGE");

export type EvaluatedSemanticPrompt = {
  id: string;
  route: SemanticGoldenPrompt["route"];
  prompt: string;
  plan: NonNullable<ReturnType<typeof buildConstructionWorkPlan>>;
  estimate: GlobalEstimateResult;
  viewModel: ReturnType<typeof buildProfessionalEstimateTableViewModel>;
  pdf: ReturnType<typeof createEstimatePdf>;
  pdfViewModel: ReturnType<typeof buildEstimatePdfViewModel>;
  rowNames: string[];
  rowText: string;
  units: string[];
  runtimeTraceId: string;
};

export function writeOpenWorldArtifact(name: string, value: unknown): void {
  fs.mkdirSync(OPEN_WORLD_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OPEN_WORLD_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readOpenWorldArtifact<T>(name: string, fallback: T): T {
  const filePath = path.join(OPEN_WORLD_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function allEstimateRows(estimate: GlobalEstimateResult) {
  return estimate.sections.flatMap((section) => section.rows.map((row) => ({ section: section.type, ...row })));
}

export function lowerText(value: string): string {
  return value.toLocaleLowerCase("ru-RU");
}

export function lowerRowText(estimate: GlobalEstimateResult): string {
  return lowerText(allEstimateRows(estimate).map((row) => row.name).join("\n"));
}

export function standaloneWeakGenericRows(rowNames: readonly string[]): string[] {
  const forbidden = [
    "материал",
    "кровля",
    "монтаж",
    "крепёж",
    "крепеж",
    "работы",
    "прочее",
    "дополнительные материалы",
    "дополнительные работы",
    "строительные работы",
    "ремонт кровли",
  ];
  return rowNames.filter((row) => forbidden.includes(lowerText(row).replace(/\s+/g, " ").trim()));
}

export function expectRequiredTokens(rowText: string, tokens: readonly string[] = [], minimum = tokens.length): void {
  const hits = tokens.filter((token) => rowText.includes(lowerText(token)));
  assert.ok(hits.length >= minimum, `required row tokens missing: ${hits.length}/${minimum}`);
}

export function expectForbiddenTokensAbsent(rowText: string, tokens: readonly string[] = []): void {
  for (const token of tokens) {
    assert.ok(!rowText.includes(lowerText(token)), `forbidden row token found: ${token}`);
  }
}

export function evaluateSemanticPrompt(item: SemanticGoldenPrompt): EvaluatedSemanticPrompt {
  const plan = buildConstructionWorkPlan(item.prompt);
  if (!plan) throw new Error(`CONSTRUCTION_WORK_PLAN_MISSING:${item.id}`);
  assert.equal(plan.workKey, item.expected.workKey);
  assert.equal(plan.domain, item.expected.domain);
  assert.equal(plan.object, item.expected.object);
  assert.equal(plan.operation, item.expected.operation);
  if (item.expected.method) assert.equal(plan.method, item.expected.method);

  const answer = answerFor(item.route, item.prompt);
  assert.equal(answer.route.intent, "estimate");
  assert.equal(answer.toolResult.toolName, "calculate_global_estimate");
  assert.equal(answer.toolResult.blockedBy, undefined);
  const estimate = answer.toolResult.estimate;
  if (!estimate) throw new Error(`GLOBAL_ESTIMATE_RESULT_MISSING:${item.id}`);
  assert.equal(estimate.work.workKey, item.expected.workKey);

  const viewModel = buildProfessionalEstimateTableViewModel(estimate);
  const viewValidation = validateProfessionalEstimateTableViewModel(viewModel);
  assert.equal(viewValidation.passed, true, viewValidation.failures.join(","));
  assertUiRowsMatchGlobalEstimate(estimate, viewModel);

  const unitValidation = validateConstructionUnitSemantics(estimate);
  assert.equal(unitValidation.passed, true, unitValidation.failures.join(","));

  const pdfInput = {
    estimate,
    runtimeTrace: answer.runtimeTrace,
    generatedAt: "2026-05-28T00:00:00.000Z",
    language: "ru",
  };
  const pdfViewModel = buildEstimatePdfViewModel(pdfInput);
  const pdf = createEstimatePdf(pdfInput);
  assert.equal(pdf.validation.valid, true, pdf.validation.failures.join(","));
  assert.equal(pdf.pdfTrace.pdf_uses_structured_global_estimate_result, true);
  assert.equal(pdf.pdfTrace.markdown_parsed_as_pdf_truth, false);
  assert.equal(pdf.pdfTrace.pdf_mojibake_found, false);

  const rowNames = allEstimateRows(estimate).map((row) => row.name);
  const rowText = lowerText(rowNames.join("\n"));
  assert.ok(rowNames.length >= (item.minimumRows ?? 10), `row count too low: ${rowNames.length}`);
  expectRequiredTokens(rowText, item.requiredRows);
  expectForbiddenTokensAbsent(rowText, item.forbiddenRows);
  for (const forbiddenWorkKey of item.forbiddenWorkKeys ?? []) {
    assert.notEqual(estimate.work.workKey, forbiddenWorkKey);
  }
  assert.deepEqual(standaloneWeakGenericRows(rowNames), []);

  return {
    id: item.id,
    route: item.route,
    prompt: item.prompt,
    plan,
    estimate,
    viewModel,
    pdf,
    pdfViewModel,
    rowNames,
    rowText,
    units: allEstimateRows(estimate).map((row) => row.unit),
    runtimeTraceId: answer.runtimeTrace.traceId,
  };
}
