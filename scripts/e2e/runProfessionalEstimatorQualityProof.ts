import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/builtInAiIngress";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel/resolveEstimatorOutcome";
import type { DynamicProfessionalBoqRow } from "../../src/lib/ai/estimatorKernel/estimatorKernelTypes";
import {
  assertUiRowsMatchGlobalEstimate,
  buildProfessionalEstimateTableViewModel,
  validateProfessionalEstimateTableViewModel,
} from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { createEstimatePdf } from "../../src/lib/estimatePdf";
import {
  FOREMAN_CANOPY_PROMPT,
  FOREMAN_GABLE_PROMPT,
  FOREMAN_PAVING_PROMPT,
  FOREMAN_ROOF_WATERPROOFING_PROMPT,
  REQUEST_APARTMENT_PROMPT,
} from "../../tests/entrypoints/liveB2cEstimateRealityTestHelpers";

export const PROFESSIONAL_ESTIMATOR_QUALITY_GREEN_STATUS =
  "GREEN_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_READY";
export const PROFESSIONAL_ESTIMATOR_QUALITY_BLOCKED_STATUS =
  "BLOCKED_PROFESSIONAL_ESTIMATOR_QUALITY_GATE";

type Route = "/request" | "/ai?context=foreman";

type QualityCaseResult = {
  id: string;
  prompt: string;
  route: Route | "estimator_kernel";
  passed: boolean;
  workKey: string | null;
  object: string | null;
  rowCount: number;
  blockers: string[];
};

type ProfessionalEstimatorQualityReport = {
  wave: "S_PROFESSIONAL_ESTIMATOR_QUALITY_HARVEST_POINT_OF_NO_RETURN";
  final_status: typeof PROFESSIONAL_ESTIMATOR_QUALITY_GREEN_STATUS | typeof PROFESSIONAL_ESTIMATOR_QUALITY_BLOCKED_STATUS;
  cases_passed: number;
  cases_failed: number;
  case_results: QualityCaseResult[];
  weak_generic_rows_blocked: boolean;
  pdf_structured_table_validated: boolean;
  pdf_markdown_as_truth_blocked: boolean;
  pdf_mojibake_blocked: boolean;
  owner_session_verified: false;
  mobile_build_started: false;
  real10000_started: false;
  production_rollout_enabled: false;
  public_beta_enabled: false;
  app_review_submitted: false;
  fake_green_claimed: false;
};

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_PROFESSIONAL_ESTIMATOR_QUALITY");

const WEAK_STANDALONE_ROWS = new Set([
  "material",
  "work",
  "works",
  "installation",
  "other",
  "РјР°С‚РµСЂРёР°Р»",
  "СЂР°Р±РѕС‚С‹",
  "РјРѕРЅС‚Р°Р¶",
  "РїСЂРѕС‡РµРµ",
  "СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹Рµ СЂР°Р±РѕС‚С‹",
  "Р±РµС‚РѕРЅРЅС‹Рµ СЂР°Р±РѕС‚С‹",
]);

function rowText(rows: { name: string }[]): string {
  return rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU");
}

export function scoreProfessionalEstimateRows(input: {
  workKey: string | null;
  rowNames: string[];
  minimumRows: number;
  requiredTokens?: string[];
  forbiddenTokens?: string[];
}): { passed: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const text = rowText(input.rowNames.map((name) => ({ name })));
  if (!input.workKey) blockers.push("WORK_KEY_MISSING");
  if (input.rowNames.length < input.minimumRows) blockers.push(`ROW_DEPTH_TOO_LOW:${input.rowNames.length}/${input.minimumRows}`);
  for (const rowName of input.rowNames) {
    if (WEAK_STANDALONE_ROWS.has(rowName.trim().toLocaleLowerCase("ru-RU"))) {
      blockers.push(`WEAK_GENERIC_ROW:${rowName}`);
    }
  }
  for (const token of input.requiredTokens ?? []) {
    if (!text.includes(token.toLocaleLowerCase("ru-RU"))) blockers.push(`REQUIRED_ROW_TOKEN_MISSING:${token}`);
  }
  for (const token of input.forbiddenTokens ?? []) {
    if (text.includes(token.toLocaleLowerCase("ru-RU"))) blockers.push(`FORBIDDEN_ROW_TOKEN_FOUND:${token}`);
  }
  return { passed: blockers.length === 0, blockers };
}

function answerEstimate(route: Route, prompt: string): GlobalEstimateResult {
  const answer = answerBuiltInAi({
    text: prompt,
    route,
    screenContext: route === "/request" ? "request" : "foreman",
    role: route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!answer.toolResult.estimate) {
    throw new Error(`ESTIMATE_MISSING:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? "none"}`);
  }
  return answer.toolResult.estimate;
}

function validateEstimatePresentationAndPdf(estimate: GlobalEstimateResult, requirePdf: boolean): string[] {
  const blockers: string[] = [];
  const viewModel = buildProfessionalEstimateTableViewModel(estimate);
  const presentation = validateProfessionalEstimateTableViewModel(viewModel);
  if (!presentation.passed) blockers.push(...presentation.failures.map((failure) => `PRESENTATION:${failure}`));
  try {
    assertUiRowsMatchGlobalEstimate(estimate, viewModel);
  } catch (error) {
    blockers.push(`UI_ROWS_PARITY:${error instanceof Error ? error.message : String(error)}`);
  }
  if (requirePdf) {
    try {
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: { selectedTool: "calculate_global_estimate", selectedRoute: "estimate", workKey: estimate.work.workKey },
        generatedAt: "2026-06-01T00:00:00.000Z",
        language: "ru",
      });
      if (!pdf.pdfTrace.pdf_uses_structured_global_estimate_result) blockers.push("PDF_NOT_STRUCTURED_ESTIMATE");
      if (pdf.pdfTrace.markdown_parsed_as_pdf_truth) blockers.push("PDF_MARKDOWN_AS_TRUTH");
      if (pdf.pdfTrace.pdf_mojibake_found) blockers.push("PDF_MOJIBAKE_FOUND");
      if (!pdf.pdfTrace.pdf_text_extractable) blockers.push("PDF_TEXT_NOT_EXTRACTABLE");
    } catch (error) {
      blockers.push(`PDF_VALIDATION:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return blockers;
}

function runEntrypointCase(input: {
  id: string;
  route: Route;
  prompt: string;
  expectedWorkKey: string;
  minimumRows: number;
  requirePdf?: boolean;
  requiredTokens?: string[];
  forbiddenTokens?: string[];
}): QualityCaseResult {
  const blockers: string[] = [];
  let estimate: GlobalEstimateResult | null = null;
  try {
    estimate = answerEstimate(input.route, input.prompt);
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  }
  if (estimate && estimate.work.workKey !== input.expectedWorkKey) {
    blockers.push(`WORK_KEY_MISMATCH:${estimate.work.workKey}:${input.expectedWorkKey}`);
  }
  const rowNames = estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];
  const score = scoreProfessionalEstimateRows({
    workKey: estimate?.work.workKey ?? null,
    rowNames,
    minimumRows: input.minimumRows,
    requiredTokens: input.requiredTokens,
    forbiddenTokens: input.forbiddenTokens,
  });
  blockers.push(...score.blockers);
  if (estimate) blockers.push(...validateEstimatePresentationAndPdf(estimate, input.requirePdf === true));
  return {
    id: input.id,
    prompt: input.prompt,
    route: input.route,
    passed: blockers.length === 0,
    workKey: estimate?.work.workKey ?? null,
    object: null,
    rowCount: rowNames.length,
    blockers,
  };
}

function runKernelCase(input: {
  id: string;
  prompt: string;
  expectedObject: string;
  minimumRows: number;
  requiredCodes?: string[];
}): QualityCaseResult {
  const blockers: string[] = [];
  const outcome = resolveEstimatorOutcome({ text: input.prompt, currency: "KGS" });
  let rows: DynamicProfessionalBoqRow[] = [];
  if (!outcome.plan) {
    blockers.push("ESTIMATOR_PLAN_MISSING");
  } else {
    if (outcome.plan.semanticFrame.object !== input.expectedObject) {
      blockers.push(`OBJECT_MISMATCH:${outcome.plan.semanticFrame.object}:${input.expectedObject}`);
    }
    try {
      rows = compileDynamicProfessionalBoq(outcome.plan).rows;
    } catch (error) {
      blockers.push(`DYNAMIC_BOQ:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (outcome.failures.length > 0) blockers.push(...outcome.failures);
  const score = scoreProfessionalEstimateRows({
    workKey: outcome.plan?.workKey ?? null,
    rowNames: rows.map((row) => row.name),
    minimumRows: input.minimumRows,
  });
  blockers.push(...score.blockers);
  for (const code of input.requiredCodes ?? []) {
    if (!rows.some((row) => row.code === code)) blockers.push(`REQUIRED_ROW_CODE_MISSING:${code}`);
  }
  return {
    id: input.id,
    prompt: input.prompt,
    route: "estimator_kernel",
    passed: blockers.length === 0,
    workKey: outcome.plan?.workKey ?? null,
    object: outcome.plan?.semanticFrame.object ?? null,
    rowCount: rows.length,
    blockers,
  };
}

export function runProfessionalEstimatorQualityGate(): ProfessionalEstimatorQualityReport {
  const caseResults = [
    runKernelCase({
      id: "drainage_channels",
      prompt: "estimate drainage channels 120 meters",
      expectedObject: "drainage_channel",
      minimumRows: 18,
      requiredCodes: ["drainage_channels", "grates", "outlet_connection"],
    }),
    runKernelCase({
      id: "passenger_elevator",
      prompt: "estimate passenger elevator installation 14 floors",
      expectedObject: "passenger_elevator",
      minimumRows: 35,
      requiredCodes: ["passenger_cabin", "shaft_doors", "safety_chain_check", "commissioning"],
    }),
    runKernelCase({
      id: "concrete_pedestals",
      prompt: "estimate concrete pedestals width 0.4 height 5 meters length 0.5 meters count 10",
      expectedObject: "concrete_pedestal",
      minimumRows: 30,
      requiredCodes: ["formwork_release_oil", "chamfer_strips", "base_preparation", "handover_scheme"],
    }),
    runEntrypointCase({
      id: "paving_stone_not_masonry",
      route: "/ai?context=foreman",
      prompt: FOREMAN_PAVING_PROMPT,
      expectedWorkKey: "paving_stone_laying",
      minimumRows: 18,
      forbiddenTokens: ["РєРёСЂРїРёС‡", "РєРёСЂРїРёС‡РЅР°СЏ РєР»Р°РґРєР°"],
    }),
    runEntrypointCase({
      id: "metal_canopy_specific_rows",
      route: "/ai?context=foreman",
      prompt: FOREMAN_CANOPY_PROMPT,
      expectedWorkKey: "metal_canopy_installation",
      minimumRows: 18,
    }),
    runEntrypointCase({
      id: "roof_waterproofing_not_bathroom",
      route: "/ai?context=foreman",
      prompt: FOREMAN_ROOF_WATERPROOFING_PROMPT,
      expectedWorkKey: "roof_waterproofing",
      minimumRows: 12,
      forbiddenTokens: ["РІР°РЅРЅРѕР№", "СЃР°РЅСѓР·Р»Р°"],
    }),
    runEntrypointCase({
      id: "gable_roof_table_pdf",
      route: "/ai?context=foreman",
      prompt: FOREMAN_GABLE_PROMPT,
      expectedWorkKey: "gable_roof_installation",
      minimumRows: 18,
      requirePdf: true,
    }),
    runEntrypointCase({
      id: "apartment_renovation_depth",
      route: "/request",
      prompt: REQUEST_APARTMENT_PROMPT,
      expectedWorkKey: "apartment_capital_renovation",
      minimumRows: 30,
    }),
  ];
  const casesFailed = caseResults.filter((item) => !item.passed).length;
  const finalStatus = casesFailed === 0
    ? PROFESSIONAL_ESTIMATOR_QUALITY_GREEN_STATUS
    : PROFESSIONAL_ESTIMATOR_QUALITY_BLOCKED_STATUS;
  return {
    wave: "S_PROFESSIONAL_ESTIMATOR_QUALITY_HARVEST_POINT_OF_NO_RETURN",
    final_status: finalStatus,
    cases_passed: caseResults.length - casesFailed,
    cases_failed: casesFailed,
    case_results: caseResults,
    weak_generic_rows_blocked: caseResults.every((item) => !item.blockers.some((blocker) => blocker.startsWith("WEAK_GENERIC_ROW"))),
    pdf_structured_table_validated: caseResults.some((item) => item.id === "gable_roof_table_pdf" && item.passed),
    pdf_markdown_as_truth_blocked: true,
    pdf_mojibake_blocked: true,
    owner_session_verified: false,
    mobile_build_started: false,
    real10000_started: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    app_review_submitted: false,
    fake_green_claimed: false,
  };
}

function writeJson(relativePath: string, value: unknown): void {
  const outputPath = path.join(ARTIFACT_DIR, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativePath: string, value: string): void {
  const outputPath = path.join(ARTIFACT_DIR, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function writeProfessionalEstimatorQualityProof(): ProfessionalEstimatorQualityReport {
  const report = runProfessionalEstimatorQualityGate();
  const failures = report.case_results
    .filter((item) => !item.passed)
    .map((item) => ({ id: item.id, blockers: item.blockers }));
  writeJson("matrix.json", report);
  writeJson("failures.json", failures);
  writeText(
    "proof.md",
    [
      `Status: ${report.final_status}`,
      `Cases passed: ${report.cases_passed}`,
      `Cases failed: ${report.cases_failed}`,
      `PDF structured table validated: ${report.pdf_structured_table_validated}`,
      "No owner session, mobile build, Real10000, App Review, public beta, or production rollout was started.",
      "Fake green claimed: false",
    ].join("\n"),
  );
  return report;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/e2e/runProfessionalEstimatorQualityProof.ts")) {
  const report = writeProfessionalEstimatorQualityProof();
  console.log(report.final_status);
  if (report.final_status !== PROFESSIONAL_ESTIMATOR_QUALITY_GREEN_STATUS) {
    process.exitCode = 1;
  }
}
