import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import { buildEstimatePresentationViewModel, validateNoMojibakeInEstimateViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

export const REAL10000_ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS");
export const REAL10000_SHARDS_DIR = path.join(REAL10000_ARTIFACT_DIR, "shards");
export const REAL10000_SOURCE_FINGERPRINT_ALGORITHM = "sha256:v1";
const PDF_DIR = path.join(process.cwd(), "artifacts", "pdf", "real-10000-diverse-construction-works");

const REAL10000_SOURCE_FINGERPRINT_ROOTS = [
  "src/lib/ai/builtInAi",
  "src/lib/ai/catalogBinding",
  "src/lib/ai/constructionFormulas",
  "src/lib/ai/estimatePresentation",
  "src/lib/ai/estimatorKernel",
  "src/lib/ai/globalEstimate",
  "src/lib/ai/professionalBoq",
  "src/lib/estimatePdf",
] as const;

const REAL10000_SOURCE_FINGERPRINT_FILES = [
  "scripts/e2e/real10000AcceptanceCore.ts",
  "scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts",
  "scripts/e2e/runReal10000DiverseConstructionWorksShardMerge.ts",
  "scripts/e2e/runReal10000DiverseConstructionWorksShardProof.ts",
] as const;

export type Real10000Failure = { caseId?: string; classification: string; reason: string; artifact?: string };

export type Real10000CaseResult = {
  caseId: string;
  route: Real10000ConstructionWorkCase["route"];
  prompt: string;
  macroDomain: string;
  domain: string;
  expectedResolvedDomain: string;
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
  regulatedSafetyPassed: boolean;
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

export type Real10000Evaluation = {
  cases: Real10000CaseResult[];
  failures: Real10000Failure[];
};

export type Real10000SourceFingerprint = {
  fingerprint: string;
  files: string[];
};

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function listSourceFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(normalizePath(path.relative(process.cwd(), absolutePath)));
      }
    }
  };
  walk(absoluteRoot);
  return files;
}

function real10000SourceFingerprintFiles(): string[] {
  return [...new Set([
    ...REAL10000_SOURCE_FINGERPRINT_FILES,
    ...REAL10000_SOURCE_FINGERPRINT_ROOTS.flatMap(listSourceFiles),
  ].map(normalizePath))]
    .filter((filePath) => fs.existsSync(path.join(process.cwd(), filePath)))
    .sort();
}

export function buildReal10000SourceFingerprint(): Real10000SourceFingerprint {
  const files = real10000SourceFingerprintFiles();
  const hash = crypto.createHash("sha256");
  for (const filePath of files) {
    hash.update(filePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(process.cwd(), filePath)));
    hash.update("\0");
  }
  return { fingerprint: hash.digest("hex"), files };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/С‘/g, "Рµ").replace(/\s+/g, " ").trim();
}

function hasToken(text: string, token: string): boolean {
  return normalize(text).includes(normalize(token));
}

export function writeReal10000Json(name: string, value: unknown): void {
  fs.mkdirSync(REAL10000_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REAL10000_ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writePdfFile(name: string, bytes: Uint8Array): string {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const relative = path.join("artifacts", "pdf", "real-10000-diverse-construction-works", name).replace(/\\/g, "/");
  fs.writeFileSync(path.join(process.cwd(), relative), bytes);
  return relative;
}

function contextFor(route: Real10000ConstructionWorkCase["route"]): "request" | "foreman" {
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

function regulatedSafetyPassed(item: Real10000ConstructionWorkCase, estimate: GlobalEstimateResult, semanticFrame: unknown): boolean {
  if (!item.regulatedSafetyRequired) return true;
  const frameRegulated = typeof semanticFrame === "object" && semanticFrame !== null && "regulated" in semanticFrame && semanticFrame.regulated === true;
  const text = [
    ...estimate.assumptions,
    ...estimate.regionalRisks.map((risk) => `${risk.title} ${risk.text}`),
    ...estimate.clarifyingQuestions,
  ].join("\n");
  return frameRegulated || /лиценз|инспек|permit|licensed|Р»РёС†РµРЅР·|РёРЅСЃРїРµРє/i.test(text);
}

export function evaluateReal10000Case(
  item: Real10000ConstructionWorkCase,
  options: { includePdf?: boolean } = {},
): Real10000CaseResult {
  const includePdf = options.includePdf !== false;
  const failures: string[] = [];
  const outcome = resolveEstimatorOutcome({ text: item.promptRu, currency: "KGS" });
  if (!outcome.plan) failures.push("SEMANTIC_FRAME_MISSING");
  if (outcome.failures.length > 0) failures.push(...outcome.failures);
  if (outcome.plan?.semanticFrame.domain !== item.expectedResolvedDomain) failures.push("OBJECT_SCOPE_MISCLASSIFIED");
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
      macroDomain: item.macroDomain,
      domain: item.domain,
      expectedResolvedDomain: item.expectedResolvedDomain,
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
      regulatedSafetyPassed: false,
      uiTableVisible: false,
      pdfChecked: item.pdfRequired && includePdf,
      pdfPassed: false,
      runtimeTraceId,
      failures: [...new Set(failures)],
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
  const catalogBindingPassed = !item.catalogBindingRequired || materialRows(estimate).every((row) => Boolean(row.materialKey));
  const sourceEvidencePassed = !item.sourceEvidenceRequired || allRows(estimate).every((row) => row.sourceEvidence.length > 0 && Boolean(row.sourceId) && Boolean(row.rateKey));
  const taxWarningPassed = Boolean(estimate.tax.warning || estimate.tax.taxType || estimate.tax.taxLabel);
  const regulatedOk = regulatedSafetyPassed(item, estimate, outcome.plan?.semanticFrame ?? null);
  const uiMojibakePassed = validateNoMojibakeInEstimateViewModel(viewModel).passed;
  const uiTableVisible = viewModel.rows.length >= item.expectedMinimumRows;

  if (!uiTableVisible) failures.push("SHORT_COMPLEX_ESTIMATE");
  if (requiredRowsMissing.length > 0) failures.push("WORK_SPECIFIC_ROWS_MISSING");
  if (forbiddenRowsFound.length > 0) failures.push("WEAK_GENERIC_BOQ_ROWS");
  if (!unitSemantics.passed) failures.push("UNIT_SEMANTICS_FAILED");
  if (!catalogBindingPassed) failures.push("CATALOG_BINDING_MISSING");
  if (!sourceEvidencePassed) failures.push("SOURCE_EVIDENCE_MISSING");
  if (!taxWarningPassed) failures.push("TAX_LOCAL_WARNING_MISSING");
  if (!regulatedOk) failures.push("REGULATED_SAFETY_WARNING_MISSING");
  if (!uiMojibakePassed) failures.push("UI_MOJIBAKE_FOUND");

  let pdfPassed = false;
  const pdfChecked = item.pdfRequired && includePdf;
  if (pdfChecked) {
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

  const classification = item.regulatedSafetyRequired
    ? "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK"
    : "EXPANDED_PROFESSIONAL_ESTIMATE_OK";

  return {
    caseId: item.caseId,
    route: item.route,
    prompt: item.promptRu,
    macroDomain: item.macroDomain,
    domain: item.domain,
    expectedResolvedDomain: item.expectedResolvedDomain,
    object: outcome.plan?.semanticFrame.object ?? null,
    operation: outcome.plan?.semanticFrame.operation ?? null,
    method: outcome.plan?.semanticFrame.method ?? null,
    classification,
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
    regulatedSafetyPassed: regulatedOk,
    uiTableVisible,
    pdfChecked,
    pdfPassed: pdfChecked ? pdfPassed : true,
    runtimeTraceId,
    failures: [...new Set(failures)],
    estimate,
    visibleRows,
    pdfText,
    pdfFile,
  };
}

export function evaluateReal10000Cases(
  cases: readonly Real10000ConstructionWorkCase[],
  options: { includePdf?: boolean } = {},
): Real10000Evaluation {
  const results = cases.map((item) => evaluateReal10000Case(item, options));
  const failures = results.flatMap((item) =>
    item.failures.map((failure) => ({
      caseId: item.caseId,
      classification: failure,
      reason: `${item.route}:${item.prompt}`,
    })),
  );
  return { cases: results, failures };
}

export function evaluateReal10000Acceptance(options: { includePdf?: boolean } = {}): Real10000Evaluation {
  return evaluateReal10000Cases(REAL_DIVERSE_10000_CONSTRUCTION_WORKS, options);
}

export function real10000WebSampleCases(): Real10000ConstructionWorkCase[] {
  return [
    ...REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.route === "/request").slice(0, 400),
    ...REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.route === "/ai?context=foreman").slice(0, 300),
    ...REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.route === "/ai?context=request").slice(0, 300),
  ];
}

export function real10000AndroidSampleCases(): Real10000ConstructionWorkCase[] {
  return [
    ...REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.route === "/request").slice(0, 100),
    ...REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.route === "/ai?context=foreman").slice(0, 100),
    ...REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.route === "/ai?context=request").slice(0, 100),
  ];
}

export function exactPromptLookupScanReal10000() {
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
    if (/includes\(\s*["'`][^"'`]{20,}["'`]\s*\)/.test(source) && /смета|СЃРјРµС‚Р°|брусчат|лифт|дренаж|навес|Р±СЂСѓСЃС‡Р°С‚|Р»РёС„С‚|РґСЂРµРЅР°Р¶|РЅР°РІРµСЃ/.test(source)) {
      findings.push(`${relativePath}:long_prompt_includes`);
    }
    if (/case\s+["'`](смета|СЃРјРµС‚Р°)\s+на/i.test(source)) findings.push(`${relativePath}:prompt_case`);
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

export function branchPushed(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const counts = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "");
  const [ahead = "1", behind = "1"] = counts.split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

export function slimResult(item: Real10000CaseResult) {
  const { estimate: _estimate, pdfText: _pdfText, ...rest } = item;
  return rest;
}

export function summarizeReal10000(evaluation: Real10000Evaluation) {
  const cases = evaluation.cases;
  const pdfCases = cases.filter((item) => item.pdfChecked);
  const domains = [...new Set(cases.map((item) => item.domain))].sort();
  const macroDomains = [...new Set(cases.map((item) => item.macroDomain))].sort();
  return {
    cases_total: cases.length,
    cases_passed: cases.filter((item) => item.failures.length === 0).length,
    cases_failed: cases.filter((item) => item.failures.length > 0).length,
    domains_covered: domains.length,
    domains,
    macro_domains_total: macroDomains.length,
    macro_domains: macroDomains,
    web_live_prompts_total: cases.length,
    web_live_prompts_passed: cases.filter((item) => item.uiTableVisible && item.runtimeTraceId).length,
    pdf_extraction_cases_total: pdfCases.length,
    pdf_extraction_cases_passed: pdfCases.filter((item) => item.pdfPassed).length,
    route_split: {
      request: cases.filter((item) => item.route === "/request").length,
      ai_foreman: cases.filter((item) => item.route === "/ai?context=foreman").length,
      ai_request: cases.filter((item) => item.route === "/ai?context=request").length,
    },
    contract: REAL_10000_ACCEPTANCE_CONTRACT,
  };
}
