import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel, validateNoMojibakeInEstimateViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import {
  REAL_500_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_500_CONSTRUCTION_WORKS,
  type RealDiverseConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

export const REAL500_ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_REAL_500_DIVERSE_CONSTRUCTION_WORKS");
const PDF_DIR = path.join(process.cwd(), "artifacts", "pdf", "real-500-diverse-construction-works");

export type Real500CaseResult = {
  caseId: string;
  route: RealDiverseConstructionWorkCase["route"];
  prompt: string;
  domain: string;
  object: string | null;
  operation: string | null;
  method: string | null;
  classification: string;
  semanticFrame: unknown;
  constructionWorkPlan: unknown;
  formulaResult: unknown;
  rowCount: number;
  requiredRowsFound: string[];
  requiredRowsMissing: string[];
  forbiddenRowsFound: string[];
  unitSemanticsPassed: boolean;
  catalogBindingPassed: boolean;
  sourceEvidencePassed: boolean;
  taxWarningPassed: boolean;
  uiTableVisible: boolean;
  pdfChecked: boolean;
  pdfPassed: boolean;
  runtimeTraceId: string | null;
  failures: string[];
  estimate?: GlobalEstimateResult;
  visibleRows?: string[];
  pdfText?: string;
  pdfFile?: string;
};

export type Real500Evaluation = {
  cases: Real500CaseResult[];
  failures: { caseId?: string; classification: string; reason: string; artifact?: string }[];
};

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function hasToken(text: string, token: string): boolean {
  const normalizedText = normalize(text);
  const normalizedToken = normalize(token);
  const visibleWarningToken = normalizedToken.replace(/\bwarning\b/g, "требуется уточнение");
  return normalizedText.includes(normalizedToken) || normalizedText.includes(visibleWarningToken);
}

export function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(REAL500_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REAL500_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writePdfFile(name: string, bytes: Uint8Array): string {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const relative = path.join("artifacts", "pdf", "real-500-diverse-construction-works", name).replace(/\\/g, "/");
  fs.writeFileSync(path.join(process.cwd(), relative), bytes);
  return relative;
}

function contextFor(route: RealDiverseConstructionWorkCase["route"]): "request" | "foreman" {
  return route.includes("foreman") ? "foreman" : "request";
}

function standaloneForbiddenRows(estimate: GlobalEstimateResult, forbidden: readonly string[]): string[] {
  const forbiddenSet = new Set(forbidden.map(normalize));
  return estimate.sections
    .flatMap((section) => section.rows)
    .map((row) => row.name)
    .filter((name) => forbiddenSet.has(normalize(name)));
}

function materialRows(estimate: GlobalEstimateResult) {
  return estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows);
}

function allRows(estimate: GlobalEstimateResult) {
  return estimate.sections.flatMap((section) => section.rows);
}

function pdfName(caseId: string): string {
  return `${caseId}.pdf`;
}

export function evaluateReal500Case(item: RealDiverseConstructionWorkCase): Real500CaseResult {
  const failures: string[] = [];
  const outcome = resolveEstimatorOutcome({ text: item.promptRu, currency: "KGS" });
  if (!outcome.plan) failures.push("SEMANTIC_FRAME_MISSING");
  if (outcome.failures.length > 0) failures.push(...outcome.failures);
  if (outcome.plan?.semanticFrame.object !== item.expectedObject) failures.push("OBJECT_SCOPE_MISCLASSIFIED");
  if (outcome.plan?.semanticFrame.operation !== item.expectedOperation) failures.push("OPERATION_MISCLASSIFIED");
  if (item.expectedMethod && outcome.plan?.semanticFrame.method !== item.expectedMethod) failures.push("METHOD_MISCLASSIFIED");

  let estimate: GlobalEstimateResult | undefined;
  let visibleRows: string[] = [];
  let runtimeTraceId: string | null = null;
  let runtimeTrace: Parameters<typeof createEstimatePdf>[0]["runtimeTrace"] | undefined;
  let pdfText = "";
  let pdfFile: string | undefined;

  try {
    const context = contextFor(item.route);
    const answer = answerBuiltInAi({
      text: item.promptRu,
      route: item.route,
      screenContext: context,
      role: context,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    runtimeTraceId = answer.runtimeTrace.traceId;
    runtimeTrace = answer.runtimeTrace;
    if (answer.route.intent !== "estimate") failures.push("ESTIMATE_INTENT_LOST_TO_ROLE_CONTEXT");
    estimate = answer.toolResult.estimate;
    if (!estimate) failures.push("TEMPLATE_GAP_FOR_PARSABLE_WORK");
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  if (!estimate) {
    return {
      caseId: item.caseId,
      route: item.route,
      prompt: item.promptRu,
      domain: item.domain,
      object: outcome.plan?.semanticFrame.object ?? null,
      operation: outcome.plan?.semanticFrame.operation ?? null,
      method: outcome.plan?.semanticFrame.method ?? null,
      classification: failures[0] ?? "UNKNOWN_NEEDS_TRACE",
      semanticFrame: outcome.plan?.semanticFrame ?? null,
      constructionWorkPlan: outcome.plan ? { workKey: outcome.plan.workKey, boqPlan: outcome.plan.boqPlan } : null,
      formulaResult: outcome.plan?.formulas ?? [],
      rowCount: 0,
      requiredRowsFound: [],
      requiredRowsMissing: item.requiredRowTokens,
      forbiddenRowsFound: [],
      unitSemanticsPassed: false,
      catalogBindingPassed: false,
      sourceEvidencePassed: false,
      taxWarningPassed: false,
      uiTableVisible: false,
      pdfChecked: item.pdfRequired,
      pdfPassed: false,
      runtimeTraceId,
      failures,
    };
  }

  const viewModel = buildEstimatePresentationViewModel(estimate);
  visibleRows = viewModel.rows.map((row) => row.name);
  const visibleText = [
    estimate.work.title,
    ...visibleRows,
    ...estimate.assumptions,
    ...estimate.regionalRisks.map((risk) => `${risk.title} ${risk.text}`),
    ...estimate.clarifyingQuestions,
  ].join("\n");
  const requiredRowsFound = item.requiredRowTokens.filter((token) => hasToken(visibleText, token));
  const requiredRowsMissing = item.requiredRowTokens.filter((token) => !hasToken(visibleText, token));
  const forbiddenRowsFound = standaloneForbiddenRows(estimate, item.forbiddenRowTokens);
  const unitSemantics = validateConstructionUnitSemantics(estimate);
  const catalogBindingPassed = materialRows(estimate).every((row) => Boolean(row.materialKey));
  const sourceEvidencePassed = allRows(estimate).every((row) => row.sourceEvidence.length > 0 && Boolean(row.sourceId) && Boolean(row.rateKey));
  const taxWarningPassed = Boolean(estimate.tax.warning || estimate.tax.taxType || estimate.tax.taxLabel);
  const uiMojibakePassed = validateNoMojibakeInEstimateViewModel(viewModel).passed;
  const uiTableVisible = viewModel.rows.length >= item.expectedMinimumRows;

  if (!uiTableVisible) failures.push("SHORT_COMPLEX_ESTIMATE");
  if (requiredRowsMissing.length > 0) failures.push("WORK_SPECIFIC_ROWS_MISSING");
  if (forbiddenRowsFound.length > 0) failures.push("WEAK_GENERIC_BOQ_ROWS");
  if (!unitSemantics.passed) failures.push("UNIT_SEMANTICS_FAILED");
  if (!catalogBindingPassed) failures.push("CATALOG_BINDING_MISSING");
  if (!sourceEvidencePassed) failures.push("SOURCE_EVIDENCE_MISSING");
  if (!taxWarningPassed) failures.push("TAX_LOCAL_WARNING_MISSING");
  if (!uiMojibakePassed) failures.push("UI_MOJIBAKE_FOUND");

  let pdfPassed = false;
  if (item.pdfRequired) {
    try {
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace,
        generatedAt: "2026-05-29T00:00:00.000Z",
        language: "ru",
      });
      pdfText = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text;
      pdfFile = writePdfFile(pdfName(item.caseId), pdf.bytes);
      const pdfMojibakePassed = validateNoPdfMojibake(pdfText).passed;
      const pdfRowsMatch = visibleRows.every((row) => pdfText.includes(row));
      pdfPassed = pdf.validation.valid &&
        pdf.pdfTrace.pdf_uses_structured_global_estimate_result &&
        !pdf.pdfTrace.markdown_parsed_as_pdf_truth &&
        pdfMojibakePassed &&
        pdfRowsMatch;
      if (!pdfPassed) failures.push(!pdfMojibakePassed ? "PDF_MOJIBAKE_FOUND" : !pdfRowsMatch ? "PDF_UI_PARITY_FAILED" : "PDF_NOT_STRUCTURED");
    } catch (error) {
      failures.push(error instanceof Error ? `PDF_EXTRACTION_FAILED:${error.message}` : "PDF_EXTRACTION_FAILED");
    }
  }

  return {
    caseId: item.caseId,
    route: item.route,
    prompt: item.promptRu,
    domain: item.domain,
    object: outcome.plan?.semanticFrame.object ?? null,
    operation: outcome.plan?.semanticFrame.operation ?? null,
    method: outcome.plan?.semanticFrame.method ?? null,
    classification: item.regulatedSafetyRequired ? "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK" : "EXPANDED_PROFESSIONAL_ESTIMATE_OK",
    semanticFrame: outcome.plan?.semanticFrame ?? null,
    constructionWorkPlan: outcome.plan ? { workKey: outcome.plan.workKey, boqPlan: outcome.plan.boqPlan } : null,
    formulaResult: outcome.plan?.formulas ?? [],
    rowCount: viewModel.rows.length,
    requiredRowsFound,
    requiredRowsMissing,
    forbiddenRowsFound,
    unitSemanticsPassed: unitSemantics.passed,
    catalogBindingPassed,
    sourceEvidencePassed,
    taxWarningPassed,
    uiTableVisible,
    pdfChecked: item.pdfRequired,
    pdfPassed: item.pdfRequired ? pdfPassed : true,
    runtimeTraceId,
    failures: [...new Set(failures)],
    estimate,
    visibleRows,
    pdfText,
    pdfFile,
  };
}

export function evaluateReal500Acceptance(): Real500Evaluation {
  const cases = REAL_DIVERSE_500_CONSTRUCTION_WORKS.map(evaluateReal500Case);
  const failures = cases.flatMap((item) =>
    item.failures.map((failure) => ({
      caseId: item.caseId,
      classification: failure,
      reason: `${item.route}:${item.prompt}`,
    })),
  );
  return { cases, failures };
}

export function exactPromptLookupScan() {
  const roots = [
    "src/lib/ai/estimatorKernel",
    "src/lib/ai/professionalBoq",
    "src/lib/ai/builtInAi",
    "src/lib/ai/globalEstimate",
  ];
  const findings: string[] = [];
  const scanFile = (relativePath: string): void => {
    if (relativePath.includes("/fixtures/") || relativePath.includes("\\fixtures\\")) return;
    if (!relativePath.endsWith(".ts") && !relativePath.endsWith(".tsx")) return;
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    if (/prompt\s*={2,3}\s*["'`]/.test(source)) findings.push(`${relativePath}:prompt_equality`);
    if (/includes\(\s*["'`][^"'`]{20,}["'`]\s*\)/.test(source) && /смета|брусчат|лифт|дренаж|навес/.test(source)) {
      findings.push(`${relativePath}:long_prompt_includes`);
    }
    if (/case\s+["'`]смета\s+на/i.test(source)) findings.push(`${relativePath}:prompt_case`);
  };
  const walk = (root: string): void => {
    if (!fs.existsSync(root)) return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const relative = path.join(root, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) walk(relative);
      else scanFile(relative);
    }
  };
  roots.forEach(walk);
  return { exact_prompt_lookup_found: findings.length > 0, findings };
}

export function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe", timeout: 10_000 }).trim();
  } catch {
    return fallback;
  }
}

export function boolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export function summarizeReal500(evaluation: Real500Evaluation) {
  const cases = evaluation.cases;
  const pdfCases = cases.filter((item) => item.pdfChecked);
  const domains = [...new Set(cases.map((item) => item.domain))].sort();
  return {
    cases_total: cases.length,
    cases_passed: cases.filter((item) => item.failures.length === 0).length,
    cases_failed: cases.filter((item) => item.failures.length > 0).length,
    domains_covered: domains.length,
    domains,
    web_live_prompts_total: cases.length,
    web_live_prompts_passed: cases.filter((item) => item.uiTableVisible && item.runtimeTraceId).length,
    pdf_extraction_cases_total: pdfCases.length,
    pdf_extraction_cases_passed: pdfCases.filter((item) => item.pdfPassed).length,
    route_split: {
      request: cases.filter((item) => item.route === "/request").length,
      ai_foreman: cases.filter((item) => item.route === "/ai?context=foreman").length,
      ai_request: cases.filter((item) => item.route === "/ai?context=request").length,
    },
    contract: REAL_500_ACCEPTANCE_CONTRACT,
  };
}
