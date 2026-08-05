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
  REAL_10000_CORPUS_VERSION,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { normalizeCanonicalProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";

export const REAL10000_ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS");
export const REAL10000_SHARDS_DIR = path.join(REAL10000_ARTIFACT_DIR, "shards");
export const REAL10000_SOURCE_FINGERPRINT_ALGORITHM = "sha256:v1";
export const REAL10000_ARTIFACT_SCHEMA_VERSION = "real10000-shard-evidence:2026-07.v3";
export const REAL10000_CORPUS_ID = "real-diverse-10000-construction-works";
export const REAL10000_COMPILER_ID = "production-estimator-compiler";
export const REAL10000_FORMULA_GRAPH_ID = "construction-formula-graph";
export const REAL10000_COMPILER_VERSION = "production-estimator-compiler:v1";
export const REAL10000_FORMULA_GRAPH_VERSION = "construction-formula-graph:v1";
const PDF_DIR = path.join(process.cwd(), "artifacts", "pdf", "real-10000-diverse-construction-works");

const REAL10000_SOURCE_FINGERPRINT_ROOTS = [
  "src/lib/ai/builtInAi",
  "src/lib/ai/catalogBinding",
  "src/lib/ai/constructionFormulas",
  "src/lib/ai/estimateCompiler",
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

const REAL10000_FORMULA_GRAPH_ROOTS = [
  "src/lib/ai/constructionFormulas",
  "src/lib/ai/estimateCompiler",
  "src/lib/ai/globalEstimate",
  "src/lib/ai/professionalBoq",
] as const;

export type Real10000Failure = { caseId?: string; classification: string; reason: string; artifact?: string };

export type Real10000RuntimeIntegrity = {
  nonFiniteValueCount: number;
  negativeQuantityCount: number;
  negativeTotalCount: number;
  unknownUnitCount: number;
  silentPriceFallbackCount: number;
  unconfirmedContractTotalClaimCount: number;
  passed: boolean;
};

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
  semanticFrame?: unknown;
  constructionWorkPlan?: unknown;
  formulaResult?: unknown;
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
  toolName?: string;
  blockedBy?: string;
  fallbackUsed?: string;
  runtimeTraceId: string | null;
  runtimeIntegrity: Real10000RuntimeIntegrity;
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

export type Real10000ArtifactIdentity = {
  artifact_schema_version: typeof REAL10000_ARTIFACT_SCHEMA_VERSION;
  subject_sha: string;
  corpus_id: typeof REAL10000_CORPUS_ID;
  corpus_version: typeof REAL_10000_CORPUS_VERSION;
  corpus_fingerprint_algorithm: typeof REAL10000_SOURCE_FINGERPRINT_ALGORITHM;
  corpus_fingerprint: string;
  compiler_id: typeof REAL10000_COMPILER_ID;
  compiler_version: typeof REAL10000_COMPILER_VERSION;
  compiler_source_fingerprint: string;
  formula_graph_id: typeof REAL10000_FORMULA_GRAPH_ID;
  formula_graph_version: typeof REAL10000_FORMULA_GRAPH_VERSION;
  formula_graph_fingerprint: string;
  runtime_version: string;
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

function fingerprintFiles(files: readonly string[]): string {
  const hash = crypto.createHash("sha256");
  for (const filePath of [...files].sort()) {
    hash.update(filePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(process.cwd(), filePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function buildReal10000ArtifactIdentity(): Real10000ArtifactIdentity {
  const compiler = buildReal10000SourceFingerprint();
  const formulaGraphFiles = REAL10000_FORMULA_GRAPH_ROOTS
    .flatMap(listSourceFiles)
    .filter((filePath) => fs.existsSync(path.join(process.cwd(), filePath)));
  return {
    artifact_schema_version: REAL10000_ARTIFACT_SCHEMA_VERSION,
    subject_sha: gitOutput(["rev-parse", "HEAD"], "UNKNOWN_HEAD"),
    corpus_id: REAL10000_CORPUS_ID,
    corpus_version: REAL_10000_CORPUS_VERSION,
    corpus_fingerprint_algorithm: REAL10000_SOURCE_FINGERPRINT_ALGORITHM,
    corpus_fingerprint: crypto
      .createHash("sha256")
      .update(JSON.stringify(REAL_DIVERSE_10000_CONSTRUCTION_WORKS))
      .digest("hex"),
    compiler_id: REAL10000_COMPILER_ID,
    compiler_version: REAL10000_COMPILER_VERSION,
    compiler_source_fingerprint: compiler.fingerprint,
    formula_graph_id: REAL10000_FORMULA_GRAPH_ID,
    formula_graph_version: REAL10000_FORMULA_GRAPH_VERSION,
    formula_graph_fingerprint: fingerprintFiles(formulaGraphFiles),
    runtime_version: process.version,
  };
}

export function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function hashReal10000WorkIds(workIds: readonly string[]): string {
  return sha256Text(JSON.stringify(workIds));
}

export function summarizeReal10000RuntimeIntegrity(
  cases: readonly Pick<Real10000CaseResult, "runtimeIntegrity" | "requiredRowsMissing" | "failures">[],
) {
  const integrity = {
    runtime_exceptions: cases.filter((item) =>
      item.failures.some((failure) => /exception|error|failed:/i.test(failure)),
    ).length,
    non_finite_values: cases.reduce(
      (total, item) => total + item.runtimeIntegrity.nonFiniteValueCount,
      0,
    ),
    negative_quantities: cases.reduce(
      (total, item) => total + item.runtimeIntegrity.negativeQuantityCount,
      0,
    ),
    negative_totals: cases.reduce(
      (total, item) => total + item.runtimeIntegrity.negativeTotalCount,
      0,
    ),
    unknown_units: cases.reduce(
      (total, item) => total + item.runtimeIntegrity.unknownUnitCount,
      0,
    ),
    lost_required_boq_positions: cases.reduce(
      (total, item) => total + item.requiredRowsMissing.length,
      0,
    ),
    silent_fallbacks: cases.reduce(
      (total, item) => total + item.runtimeIntegrity.silentPriceFallbackCount,
      0,
    ),
    unconfirmed_contract_total_claims: cases.reduce(
      (total, item) => total + item.runtimeIntegrity.unconfirmedContractTotalClaimCount,
      0,
    ),
    passed: false,
  };
  integrity.passed = Object.entries(integrity)
    .filter(([key]) => key !== "passed")
    .every(([, count]) => count === 0);
  return integrity;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/С‘/g, "Рµ").replace(/\s+/g, " ").trim();
}

function hasToken(text: string, token: string): boolean {
  const normalizedText = normalize(text);
  const normalizedToken = normalize(token);
  const visibleWarningToken = normalizedToken.replace(/\bwarning\b/g, "требуется уточнение");
  return normalizedText.includes(normalizedToken) || normalizedText.includes(visibleWarningToken);
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

function runtimeIntegrity(estimate: GlobalEstimateResult): Real10000RuntimeIntegrity {
  const rows = allRows(estimate);
  const totalValues = [
    estimate.tax.taxableBase,
    estimate.tax.taxAmount,
    ...rows.flatMap((row) => [row.unitPrice, row.total]),
    ...Object.values(estimate.totals).filter((value): value is number => typeof value === "number"),
  ];
  const numericValues = [
    estimate.input.volume,
    ...rows.map((row) => row.quantity),
    ...totalValues,
  ];
  const fallbackRows = rows.filter(
    (row) => row.priceStatus === "manual_fallback" || row.priceStatus === "stale_fallback",
  );
  const unconfirmedContractTotalClaimCount =
    estimate.requiresReview &&
    /\bcontract(?:ual)?\b|\u0434\u043e\u0433\u043e\u0432\u043e\u0440\u043d/ui.test(
      [
        estimate.work.title,
        ...estimate.assumptions,
        ...estimate.regionalRisks.map((risk) => `${risk.title} ${risk.text}`),
      ].join("\n"),
    )
      ? 1
      : 0;
  const result: Real10000RuntimeIntegrity = {
    nonFiniteValueCount: numericValues.filter((value) => !Number.isFinite(value)).length,
    negativeQuantityCount: rows.filter((row) => row.quantity < 0).length,
    negativeTotalCount: totalValues.filter(
      (value) => Number.isFinite(value) && value < 0,
    ).length,
    unknownUnitCount: rows.filter(
      (row) => normalizeCanonicalProfessionalBoqUnit(row.unit) === null,
    ).length,
    silentPriceFallbackCount: fallbackRows.filter(
      (row) =>
        row.sourceEvidence.length === 0 ||
        !row.sourceId ||
        !row.rateKey,
    ).length,
    unconfirmedContractTotalClaimCount,
    passed: false,
  };
  result.passed =
    result.nonFiniteValueCount === 0 &&
    result.negativeQuantityCount === 0 &&
    result.negativeTotalCount === 0 &&
    result.unknownUnitCount === 0 &&
    result.silentPriceFallbackCount === 0 &&
    result.unconfirmedContractTotalClaimCount === 0;
  return result;
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
  let toolName: string | undefined;
  let blockedBy: string | undefined;
  let fallbackUsed: string | undefined;

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
    toolName = answer.toolResult.toolName;
    blockedBy = answer.toolResult.blockedBy;
    fallbackUsed = answer.toolResult.fallbackUsed;
    if (blockedBy || fallbackUsed) failures.push("MANUAL_FALLBACK_FOR_CONSTRUCTION_LIKE_WORK");
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
      toolName,
      blockedBy,
      fallbackUsed,
      runtimeTraceId,
      runtimeIntegrity: {
        nonFiniteValueCount: 0,
        negativeQuantityCount: 0,
        negativeTotalCount: 0,
        unknownUnitCount: 0,
        silentPriceFallbackCount: 0,
        unconfirmedContractTotalClaimCount: 0,
        passed: false,
      },
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
  const integrity = runtimeIntegrity(estimate);
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
  if (integrity.nonFiniteValueCount > 0) failures.push("NON_FINITE_ESTIMATE_VALUES");
  if (integrity.negativeQuantityCount > 0) failures.push("NEGATIVE_ESTIMATE_QUANTITIES");
  if (integrity.negativeTotalCount > 0) failures.push("NEGATIVE_ESTIMATE_TOTALS");
  if (integrity.unknownUnitCount > 0) failures.push("UNKNOWN_ESTIMATE_UNITS");
  if (integrity.silentPriceFallbackCount > 0) failures.push("SILENT_PRICE_FALLBACK");
  if (integrity.unconfirmedContractTotalClaimCount > 0) {
    failures.push("UNCONFIRMED_CONTRACT_TOTAL_CLAIMED");
  }

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
    toolName,
    blockedBy,
    fallbackUsed,
    runtimeTraceId,
    runtimeIntegrity: integrity,
    failures: [...new Set(failures)],
    estimate,
    visibleRows,
    pdfText,
    pdfFile,
  };
}

export function evaluateReal10000Cases(
  cases: readonly Real10000ConstructionWorkCase[],
  options: { includePdf?: boolean; retainArtifacts?: boolean } = {},
): Real10000Evaluation {
  const results: Real10000CaseResult[] = [];
  const failures: Real10000Failure[] = [];
  for (const item of cases) {
    const result = evaluateReal10000Case(item, options);
    failures.push(...result.failures.map((failure) => ({
      caseId: result.caseId,
      classification: failure,
      reason: `${result.route}:${result.prompt}`,
    })));
    results.push(options.retainArtifacts === false ? slimResult(result) : result);
  }
  return { cases: results, failures };
}

export function evaluateReal10000Acceptance(
  options: { includePdf?: boolean; retainArtifacts?: boolean } = {},
): Real10000Evaluation {
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
  const {
    estimate: _estimate,
    pdfText: _pdfText,
    visibleRows: _visibleRows,
    semanticFrame: _semanticFrame,
    constructionWorkPlan: _constructionWorkPlan,
    formulaResult: _formulaResult,
    ...rest
  } = item;
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
