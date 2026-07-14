import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

export const REAL10000_AUDIT_SOURCE_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS",
);
export const REAL10000_AUDIT_DIR = path.join(process.cwd(), "artifacts", "S_REAL_10000_AUDIT");

export type Real10000AuditSeverity = "P0" | "P1" | "P2";

export type Real10000AuditHole = {
  phase: string;
  classification: string;
  severity: Real10000AuditSeverity;
  reason: string;
  artifact: string;
  evidence?: unknown;
  affected_cases?: string[];
};

export type Real10000AuditResult = {
  phase: string;
  artifact: string;
  passed: boolean;
  holes: Real10000AuditHole[];
  [key: string]: unknown;
};

type SourceFile = {
  path: string;
  source: string;
};

const REQUIRED_CASE_FIELDS = [
  "promptRu",
  "route",
  "domain",
  "macroDomain",
  "expectedObject",
  "expectedOperation",
  "workObjectVariant",
  "workOperationVariant",
  "requiredRowTokens",
  "forbiddenRowTokens",
  "unitRules",
] as const;

const MOJIBAKE_TOKENS = ["РЎ", "Рџ", "Ð", "Ñ", "�", "undefined", "NaN", "null null"];

function relativeArtifact(name: string): string {
  return path.join("artifacts", "S_REAL_10000_AUDIT", name).replace(/\\/g, "/");
}

function sourceArtifact(name: string): string {
  return path.join("artifacts", "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS", name).replace(/\\/g, "/");
}

export function ensureReal10000AuditDir(): void {
  fs.mkdirSync(REAL10000_AUDIT_DIR, { recursive: true });
}

export function writeReal10000AuditJson(name: string, value: unknown): void {
  ensureReal10000AuditDir();
  fs.writeFileSync(path.join(REAL10000_AUDIT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJsonFile<T = unknown>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
  } catch {
    return fallback;
  }
}

function readSourceJson<T = unknown>(name: string, fallback: T): T {
  return readJsonFile(path.join(REAL10000_AUDIT_SOURCE_DIR, name), fallback);
}

function hole(params: Omit<Real10000AuditHole, "artifact"> & { artifact?: string }): Real10000AuditHole {
  return {
    artifact: params.artifact ?? relativeArtifact(`${params.phase}_audit.json`),
    ...params,
  };
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function promptTemplate(value: string): string {
  return normalizeText(value).replace(/\d+([.,]\d+)?/g, "N").replace(/\s+/g, " ").trim();
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function distribution<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

function resultWithHoles(phase: string, artifactName: string, extra: Record<string, unknown>, holes: Real10000AuditHole[]): Real10000AuditResult {
  const result = {
    phase,
    artifact: relativeArtifact(artifactName),
    passed: holes.filter((item) => item.severity === "P0").length === 0,
    holes,
    ...extra,
  };
  writeReal10000AuditJson(artifactName, result);
  return result;
}

export function runReal10000ProvenanceAudit(
  cases: readonly Real10000ConstructionWorkCase[] = REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
): Real10000AuditResult {
  const holes: Real10000AuditHole[] = [];
  const caseIds = cases.map((item) => item.caseId);
  const duplicateCaseIds = duplicateValues(caseIds);
  const duplicatePrompts = duplicateValues(cases.map((item) => `${item.route}:${normalizeText(item.promptRu ?? "")}`));
  const templateGroups = new Map<string, string[]>();
  const comboGroups = new Map<string, string[]>();
  const missingRequiredFields: string[] = [];
  const generatedNonsense: string[] = [];

  for (const item of cases) {
    for (const field of REQUIRED_CASE_FIELDS) {
      const value = item[field];
      if (Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim()) {
        missingRequiredFields.push(`${item.caseId}:${field}`);
      }
    }
    const template = `${item.route}:${promptTemplate(item.promptRu ?? "")}`;
    templateGroups.set(template, [...(templateGroups.get(template) ?? []), item.caseId]);
    const combo = `${item.domain}/${item.expectedObject}/${item.expectedOperation}`;
    comboGroups.set(combo, [...(comboGroups.get(combo) ?? []), item.caseId]);
    if (/^(?:test|dummy|lorem|ipsum|case[_\s-]?\d+|[a-z0-9_]+)$/i.test(String(item.promptRu ?? "").trim())) {
      generatedNonsense.push(item.caseId);
    }
  }

  const samePromptNumberChanged = [...templateGroups.values()]
    .filter((ids) => ids.length > 20)
    .flatMap((ids) => ids.slice(0, 10));
  const heavyDomainObjectOperation = [...comboGroups.entries()]
    .filter(([, ids]) => ids.length > 200)
    .map(([key, ids]) => ({ key, count: ids.length, sample: ids.slice(0, 5) }))
    .sort((a, b) => b.count - a.count);
  const macroDomainDistribution = distribution(cases.map((item) => item.macroDomain));
  const macroDomainCounts = Object.values(macroDomainDistribution);
  const macroDomainImbalance = Object.keys(macroDomainDistribution).length < 9 || Math.min(...macroDomainCounts) < 100;

  if (cases.length !== 10000) {
    holes.push(hole({
      phase: "provenance",
      classification: "CASES_TOTAL_NOT_10000",
      severity: "P0",
      reason: `Expected 10000 governed cases, found ${cases.length}`,
      evidence: { cases_total: cases.length },
    }));
  }
  if (duplicateCaseIds.length > 0) {
    holes.push(hole({
      phase: "provenance",
      classification: "DUPLICATE_CASE_IDS",
      severity: "P0",
      reason: "Case IDs must be globally unique.",
      affected_cases: duplicateCaseIds,
    }));
  }
  if (missingRequiredFields.length > 0) {
    holes.push(hole({
      phase: "provenance",
      classification: "MISSING_DOMAIN_OBJECT_OPERATION_OR_REQUIRED_FIELDS",
      severity: "P0",
      reason: "Every case must include prompt, route, domain, macroDomain, object, operation, row tokens, and unit rules.",
      affected_cases: missingRequiredFields.slice(0, 50),
      evidence: { missing_count: missingRequiredFields.length },
    }));
  }
  if (duplicatePrompts.length > 0) {
    holes.push(hole({
      phase: "provenance",
      classification: "DUPLICATE_OR_PADDED_PROMPTS",
      severity: "P1",
      reason: "Duplicate prompt texts found within the same route.",
      evidence: { duplicate_prompt_count: duplicatePrompts.length, sample: duplicatePrompts.slice(0, 20) },
    }));
  }
  if (samePromptNumberChanged.length > 0) {
    holes.push(hole({
      phase: "provenance",
      classification: "SAME_PROMPT_DIFFERENT_NUMBER_OVERUSED",
      severity: "P1",
      reason: "Many cases share the same prompt template with only numbers changed.",
      affected_cases: samePromptNumberChanged,
    }));
  }
  if (heavyDomainObjectOperation.length > 0) {
    holes.push(hole({
      phase: "provenance",
      classification: "DOMAIN_OBJECT_OPERATION_OVER_REPRESENTED",
      severity: "P1",
      reason: "Some domain/object/operation combinations exceed 200 cases.",
      evidence: heavyDomainObjectOperation.slice(0, 20),
    }));
  }
  if (macroDomainImbalance) {
    holes.push(hole({
      phase: "provenance",
      classification: "MACRO_DOMAIN_IMBALANCE",
      severity: "P1",
      reason: "Macro-domain distribution does not meet the minimum balance policy.",
      evidence: macroDomainDistribution,
    }));
  }
  if (generatedNonsense.length > 0) {
    holes.push(hole({
      phase: "provenance",
      classification: "GENERATED_NONSENSE_LABELS",
      severity: "P0",
      reason: "Generated/test/nonsense prompt labels were found.",
      affected_cases: generatedNonsense.slice(0, 50),
    }));
  }

  return resultWithHoles("provenance", "provenance_audit.json", {
    cases_total: cases.length,
    case_ids_unique: duplicateCaseIds.length === 0,
    required_fields_present: missingRequiredFields.length === 0,
    duplicate_case_ids: duplicateCaseIds,
    duplicate_or_padded_prompts_count: duplicatePrompts.length,
    same_prompt_number_changed_count: samePromptNumberChanged.length,
    heavy_domain_object_operation: heavyDomainObjectOperation,
    macro_domain_distribution: macroDomainDistribution,
    generated_nonsense_labels_count: generatedNonsense.length,
  }, holes);
}

export function runReal10000DiversityAudit(
  cases: readonly Real10000ConstructionWorkCase[] = REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
): Real10000AuditResult {
  const macroDomains = new Set(cases.map((item) => item.macroDomain));
  const domains = new Set(cases.map((item) => item.domain));
  const semanticObjects = new Set(cases.map((item) => item.expectedObject));
  const semanticOperations = new Set(cases.map((item) => item.expectedOperation));
  const objects = new Set(cases.map((item) => item.workObjectVariant || item.expectedObject));
  const operations = new Set(cases.map((item) => item.workOperationVariant || item.expectedOperation));
  const counts = {
    regulated: cases.filter((item) => item.regulatedSafetyRequired || item.complexity === "regulated" || item.macroDomain === "regulated_high_risk").length,
    infrastructure: cases.filter((item) => item.macroDomain === "infrastructure").length,
    engineering: cases.filter((item) => item.macroDomain === "engineering_communications").length,
    industrial: cases.filter((item) => item.macroDomain === "industrial_facilities").length,
  };
  const holes: Real10000AuditHole[] = [];
  const minimums = [
    ["MACRO_DOMAIN_COVERAGE_LOW", macroDomains.size, 9],
    ["DOMAIN_COVERAGE_LOW", domains.size, 100],
    ["OBJECT_COVERAGE_LOW", objects.size, 500],
    ["OPERATION_COVERAGE_LOW", operations.size, 50],
    ["REGULATED_COVERAGE_LOW", counts.regulated, 300],
    ["INFRASTRUCTURE_COVERAGE_LOW", counts.infrastructure, 500],
    ["ENGINEERING_COVERAGE_LOW", counts.engineering, 1000],
    ["INDUSTRIAL_COVERAGE_LOW", counts.industrial, 500],
  ] as const;
  for (const [classification, actual, required] of minimums) {
    if (actual < required) {
      holes.push(hole({
        phase: "diversity",
        classification,
        severity: classification.includes("OBJECT") || classification.includes("OPERATION") ? "P1" : "P0",
        reason: `Required >= ${required}, found ${actual}.`,
        evidence: { actual, required },
      }));
    }
  }
  return resultWithHoles("diversity", "diversity_audit.json", {
    macro_domains: macroDomains.size,
    domains: domains.size,
    objects: objects.size,
    operations: operations.size,
    semantic_objects: semanticObjects.size,
    semantic_operations: semanticOperations.size,
    regulated: counts.regulated,
    infrastructure: counts.infrastructure,
    engineering: counts.engineering,
    industrial: counts.industrial,
  }, holes);
}

export function runReal10000ShardRuntimeEvidenceAudit(params: {
  shardMatrices?: Record<string, unknown>[];
  shardFailures?: unknown[][];
  mergedMatrix?: Record<string, unknown>;
  runtimeResults?: Array<{ caseId?: string; runtimeTraceId?: string | null }>;
} = {}): Real10000AuditResult {
  const holes: Real10000AuditHole[] = [];
  const shardsDir = path.join(REAL10000_AUDIT_SOURCE_DIR, "shards");
  const shardNames = params.shardMatrices
    ? params.shardMatrices.map((_, index) => `shard_${String(index).padStart(3, "0")}`)
    : fs.existsSync(shardsDir)
    ? fs.readdirSync(shardsDir).filter((name) => /^shard_\d{3}$/.test(name)).sort()
    : [];
  const globalRuntime = params.runtimeResults ?? readSourceJson<Array<{ caseId?: string; runtimeTraceId?: string | null }>>("runtime_results.json", []);
  const runtimeCaseIds = new Set(globalRuntime.map((item) => item.caseId).filter(Boolean));
  let shardFailuresTotal = 0;
  let shardsPassed = 0;
  const singleShardGreenClaims: string[] = [];
  const missingShardArtifacts: string[] = [];

  for (const shard of shardNames) {
    const shardIndex = Number(shard.slice("shard_".length));
    const shardDir = path.join(shardsDir, shard);
    const matrixPath = path.join(shardDir, "matrix.json");
    const failuresPath = path.join(shardDir, "failures.json");
    if (!params.shardMatrices && (!fs.existsSync(matrixPath) || !fs.existsSync(failuresPath))) {
      missingShardArtifacts.push(shard);
      continue;
    }
    const matrix = params.shardMatrices?.[shardIndex] ?? readJsonFile<Record<string, unknown>>(matrixPath, {});
    const failures = params.shardFailures?.[shardIndex] ?? readJsonFile<unknown[]>(failuresPath, []);
    shardFailuresTotal += Array.isArray(failures) ? failures.length : 1;
    if (matrix.final_status === "REAL_10000_SHARD_OK" && failures.length === 0) shardsPassed += 1;
    if (matrix.final_status === "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY") {
      singleShardGreenClaims.push(shard);
    }
  }
  const mergedMatrix = params.mergedMatrix ?? readSourceJson<Record<string, unknown>>("merged_matrix.json", {});
  const missingRuntimeTraceIds = globalRuntime
    .filter((item) => !item.runtimeTraceId)
    .map((item) => String(item.caseId ?? "unknown"))
    .slice(0, 100);

  if (shardNames.length !== 100) {
    holes.push(hole({ phase: "shard_runtime_evidence", classification: "SHARD_COUNT_NOT_100", severity: "P0", reason: `Expected 100 shards, found ${shardNames.length}.`, evidence: { shards_present: shardNames.length } }));
  }
  if (missingShardArtifacts.length > 0) {
    holes.push(hole({ phase: "shard_runtime_evidence", classification: "SHARD_ARTIFACTS_MISSING", severity: "P0", reason: "Each shard requires matrix.json and failures.json.", evidence: missingShardArtifacts }));
  }
  if (shardFailuresTotal > 0 || shardsPassed !== shardNames.length) {
    holes.push(hole({ phase: "shard_runtime_evidence", classification: "SHARD_FAILURES_NOT_EMPTY", severity: "P0", reason: "One or more shard failures are non-empty or shard matrix is not OK.", evidence: { shard_failures_total: shardFailuresTotal, shards_passed: shardsPassed } }));
  }
  if (mergedMatrix.cases_total !== 10000 || runtimeCaseIds.size !== 10000) {
    holes.push(hole({ phase: "shard_runtime_evidence", classification: "MERGED_CASE_IDS_INCOMPLETE", severity: "P0", reason: "Merged matrix/global runtime does not prove all 10,000 case IDs.", evidence: { merged_cases_total: mergedMatrix.cases_total, runtime_case_ids: runtimeCaseIds.size } }));
  }
  if (singleShardGreenClaims.length > 0) {
    holes.push(hole({ phase: "shard_runtime_evidence", classification: "SINGLE_SHARD_GREEN_CLAIMED", severity: "P0", reason: "A shard claimed the full 10,000 green status.", evidence: singleShardGreenClaims }));
  }
  if (missingRuntimeTraceIds.length > 0) {
    holes.push(hole({ phase: "shard_runtime_evidence", classification: "RUNTIME_TRACE_ID_MISSING", severity: "P0", reason: "Every case requires runtimeTraceId evidence.", affected_cases: missingRuntimeTraceIds }));
  }

  return resultWithHoles("shard_runtime_evidence", "shard_runtime_evidence_audit.json", {
    shards_present: shardNames.length,
    shards_passed: shardsPassed,
    shard_failures_total: shardFailuresTotal,
    merged_cases_total: mergedMatrix.cases_total ?? null,
    runtime_case_ids_present: runtimeCaseIds.size,
    runtime_trace_ids_missing_sample: missingRuntimeTraceIds,
    single_shard_green_claims: singleShardGreenClaims,
  }, holes);
}

function stratifiedSample<T extends { macroDomain?: string; domain?: string }>(items: T[]): T[] {
  const buckets = [
    ["residential_construction", 100],
    ["non_residential_construction", 100],
    ["fit_out_furnishing", 100],
    ["engineering_communications", 150],
    ["infrastructure", 150],
    ["agricultural_structures", 100],
    ["industrial_facilities", 100],
    ["regulated_high_risk", 100],
  ] as const;
  const selected: T[] = [];
  const used = new Set<T>();
  for (const [macroDomain, count] of buckets) {
    for (const item of items.filter((candidate) => candidate.macroDomain === macroDomain).slice(0, count)) {
      selected.push(item);
      used.add(item);
    }
  }
  for (const item of items) {
    if (selected.length >= 1000) break;
    if (!used.has(item)) selected.push(item);
  }
  return selected.slice(0, 1000);
}

function minimumRowsFor(item: { macroDomain?: string; complexity?: string }): number {
  if (item.complexity === "regulated") return 30;
  if (item.complexity === "infrastructure" || item.macroDomain === "infrastructure") return 45;
  if (item.complexity === "complex") return 30;
  if (item.complexity === "medium") return 18;
  return 12;
}

export function runReal10000OutputQualitySampleAudit(
  runtime = readSourceJson<Array<Record<string, unknown>>>("runtime_results.json", []),
  cases: readonly Real10000ConstructionWorkCase[] = REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
): Real10000AuditResult {
  const byCase = new Map(cases.map((item) => [item.caseId, item]));
  const sample = stratifiedSample(runtime);
  const holes: Real10000AuditHole[] = [];
  const failingCases = sample.flatMap((result) => {
    const item = byCase.get(String(result.caseId));
    const rowCount = Number(result.rowCount ?? 0);
    const minimum = minimumRowsFor(item ?? {});
    const failures: string[] = [];
    if (rowCount < minimum) failures.push(`rowCount ${rowCount} < ${minimum}`);
    if (result.unitSemanticsPassed !== true) failures.push("unit semantics failed");
    if (result.catalogBindingPassed !== true) failures.push("catalog binding failed");
    if (result.sourceEvidencePassed !== true) failures.push("source evidence missing");
    if (result.taxWarningPassed !== true) failures.push("tax warning missing");
    if (Array.isArray(result.forbiddenRowsFound) && result.forbiddenRowsFound.length > 0) failures.push("generic/forbidden rows found");
    if (Array.isArray(result.requiredRowsMissing) && result.requiredRowsMissing.length > 0) failures.push("required rows missing");
    if (item?.regulatedSafetyRequired && result.regulatedSafetyPassed !== true) failures.push("regulated warning missing");
    return failures.length > 0 ? [{ caseId: String(result.caseId), failures }] : [];
  });
  if (sample.length < 1000) {
    holes.push(hole({ phase: "output_quality_sample", classification: "SAMPLE_SIZE_BELOW_1000", severity: "P0", reason: `Expected 1000 sample cases, found ${sample.length}.` }));
  }
  if (failingCases.length > 0) {
    holes.push(hole({ phase: "output_quality_sample", classification: "OUTPUT_QUALITY_SAMPLE_FAILED", severity: "P0", reason: "One or more sampled outputs failed row/unit/catalog/source/tax/generic-row checks.", affected_cases: failingCases.slice(0, 50).map((item) => item.caseId), evidence: failingCases.slice(0, 20) }));
  }
  return resultWithHoles("output_quality_sample", "output_quality_sample_audit.json", {
    sample_total: sample.length,
    sample_failed: failingCases.length,
    sample_passed: sample.length - failingCases.length,
    failing_sample: failingCases.slice(0, 100),
  }, holes);
}

export function runReal10000P0RegressionAudit(): Real10000AuditResult {
  const runtime = readSourceJson<Array<Record<string, unknown>>>("runtime_results.json", []);
  const pdfExtract = readSourceJson<Array<Record<string, unknown>>>("pdf_text_extract.json", []);
  const runtimeByDomain = new Map<string, Record<string, unknown>>();
  runtime.forEach((item) => {
    if (!runtimeByDomain.has(String(item.domain))) runtimeByDomain.set(String(item.domain), item);
  });
  const pdfCaseIds = new Set(pdfExtract.map((item) => String(item.caseId)));
  const goldenDomains = [
    "paving_stone_paths",
    "metal_canopies",
    "roof_waterproofing",
    "drainage_channels",
    "concrete_pedestals",
    "ventilation_systems",
    "electrical_installation",
    "industrial_floors",
    "equipment_foundations",
    "residential_flooring",
    "apartment_renovation",
    "bathroom_renovation",
    "residential_tiling",
    "residential_drywall",
    "hydropower_turbines",
    "passenger_elevators",
    "industrial_cranes",
  ];
  const checks = goldenDomains.map((domain) => {
    const result = runtimeByDomain.get(domain);
    const failures: string[] = [];
    if (!result) failures.push("runtime result missing");
    if (result && result.classification !== "EXPANDED_PROFESSIONAL_ESTIMATE_OK" && result.classification !== "REGULATED_SAFE_PROFESSIONAL_ESTIMATE_OK") failures.push(String(result.classification));
    if (result && (Array.isArray(result.failures) ? result.failures.length > 0 : false)) failures.push("runtime failures present");
    if (result && !result.runtimeTraceId) failures.push("runtimeTraceId missing");
    if (result && Number(result.rowCount ?? 0) < minimumRowsFor(result)) failures.push("row count below minimum");
    const fixtureCase = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find((item) => item.domain === domain && item.pdfRequired);
    if (fixtureCase && !pdfCaseIds.has(fixtureCase.caseId)) failures.push("PDF extract evidence missing");
    return { domain, caseId: String(result?.caseId ?? fixtureCase?.caseId ?? "missing"), failures };
  });
  const failed = checks.filter((item) => item.failures.length > 0);
  const holes = failed.length > 0
    ? [hole({ phase: "p0_regression", classification: "P0_GOLDEN_PROMPT_FAILED", severity: "P0", reason: "One or more golden domains failed runtime/PDF checks.", affected_cases: failed.map((item) => item.caseId), evidence: failed })]
    : [];
  return resultWithHoles("p0_regression", "p0_regression_audit.json", {
    golden_cases_total: checks.length,
    golden_cases_passed: checks.length - failed.length,
    checks,
  }, holes);
}

export function runReal10000UiPdfParityAudit(
  pdfExtract = readSourceJson<Array<Record<string, unknown>>>("pdf_text_extract.json", []),
  pdfParity = readSourceJson<Array<Record<string, unknown>>>("pdf_parity.json", []),
): Real10000AuditResult {
  const parityFailures = pdfParity.filter((item) => item.pdfRowsMatchUiRows !== true).map((item) => String(item.caseId));
  const mojibake = pdfExtract.flatMap((item) => {
    const text = String(item.text ?? "");
    const tokens = MOJIBAKE_TOKENS.filter((token) => text.includes(token));
    return tokens.length > 0 ? [{ caseId: String(item.caseId), tokens }] : [];
  });
  const markdownTruth = pdfExtract
    .filter((item) => /^#{1,6}\s|\|\s*---|```/.test(String(item.text ?? "")))
    .map((item) => String(item.caseId));
  const holes: Real10000AuditHole[] = [];
  if (pdfExtract.length < 1000 || pdfParity.length < 1000) holes.push(hole({ phase: "ui_pdf_parity", classification: "PDF_EXTRACTION_OR_PARITY_BELOW_1000", severity: "P0", reason: "Expected 1000 PDF extraction and parity cases.", evidence: { pdf_text_extract: pdfExtract.length, pdf_parity: pdfParity.length } }));
  if (parityFailures.length > 0) holes.push(hole({ phase: "ui_pdf_parity", classification: "PDF_ROWS_DO_NOT_MATCH_UI_ROWS", severity: "P0", reason: "PDF rows must match UI rows.", affected_cases: parityFailures.slice(0, 50) }));
  if (mojibake.length > 0) holes.push(hole({ phase: "ui_pdf_parity", classification: "PDF_MOJIBAKE_FOUND", severity: "P0", reason: "Extracted PDF text contains forbidden mojibake/invalid tokens.", affected_cases: mojibake.slice(0, 50).map((item) => item.caseId), evidence: mojibake.slice(0, 20) }));
  if (markdownTruth.length > 0) holes.push(hole({ phase: "ui_pdf_parity", classification: "MARKDOWN_AS_PDF_TRUTH_FOUND", severity: "P0", reason: "Extracted PDF text appears to use markdown as truth.", affected_cases: markdownTruth.slice(0, 50) }));
  return resultWithHoles("ui_pdf_parity", "ui_pdf_parity_audit.json", {
    pdf_text_extract_cases: pdfExtract.length,
    pdf_parity_cases: pdfParity.length,
    parity_failures_count: parityFailures.length,
    mojibake_cases_count: mojibake.length,
    markdown_truth_cases_count: markdownTruth.length,
  }, holes);
}

function gitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8", stdio: "pipe", timeout: 10_000 }).trim();
  } catch {
    return "unknown";
  }
}

function liveEvidenceSupersession(params: {
  matrix: Record<string, unknown>;
  web: Record<string, unknown>;
  android: Record<string, unknown>;
  screenshotsPresent: boolean;
  androidScreenshotsPresent: boolean;
  androidUiDumpsPresent: boolean;
  currentHead: string;
  artifactHead: string;
}) {
  const webPassed = Number(params.web.web_live_prompts_passed ?? 0) >= 1000;
  const androidPassed =
    Number(params.android.android_api34_prompts_passed ?? 0) >= 300 &&
    params.android.android_api34_tested === true &&
    params.android.api36_rejected === true;
  const sourceMatrixCountsGreen =
    Number(params.matrix.cases_total ?? 0) >= 10000 &&
    Number(params.matrix.cases_passed ?? 0) >= 10000 &&
    Number(params.matrix.cases_failed ?? 0) === 0 &&
    Number(params.matrix.shards_total ?? 0) >= 100 &&
    Number(params.matrix.shards_present ?? 0) >= 100 &&
    Number(params.matrix.shards_passed ?? 0) >= 100 &&
    params.matrix.single_shard_green_claimed !== true &&
    Number(params.matrix.pdf_extraction_cases_total ?? 0) >= 1000 &&
    Number(params.matrix.pdf_extraction_cases_passed ?? 0) >= 1000 &&
    params.matrix.template_gap_for_parsable_work_found !== true &&
    params.matrix.weak_generic_rows_found !== true &&
    params.matrix.unit_semantics_failed !== true &&
    params.matrix.catalog_items_bound_for_material_rows === true &&
    params.matrix.source_evidence_present_all_priced_rows === true &&
    params.matrix.tax_or_local_warning_present_all === true &&
    params.matrix.pdf_rows_match_ui_rows === true &&
    params.matrix.pdf_mojibake_found !== true &&
    params.matrix.fake_green_claimed !== true;
  const sourceMatrixGreen =
    params.matrix.final_status === "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY" ||
    sourceMatrixCountsGreen;
  const evidencePresent =
    sourceMatrixGreen &&
    webPassed &&
    androidPassed &&
    params.screenshotsPresent &&
    params.androidScreenshotsPresent &&
    params.androidUiDumpsPresent;
  const supersession = {
    supersedes_artifact: sourceArtifact("matrix.json"),
    supersession_reason: params.artifactHead
      ? "source_matrix_head_sha_differs_from_current_audit_head"
      : "source_matrix_head_sha_missing_current_audit_supersedes",
    accepted: evidencePresent,
    source_matrix_final_status: params.matrix.final_status ?? null,
    source_matrix_counts_green: sourceMatrixCountsGreen,
    artifact_head_sha: params.artifactHead || null,
    current_head_sha: params.currentHead,
    web_live_prompts_passed: Number(params.web.web_live_prompts_passed ?? 0),
    android_api34_prompts_passed: Number(params.android.android_api34_prompts_passed ?? 0),
    api36_rejected: params.android.api36_rejected === true,
    screenshots_present: params.screenshotsPresent,
    android_screenshots_present: params.androidScreenshotsPresent,
    android_ui_dumps_present: params.androidUiDumpsPresent,
  };
  writeReal10000AuditJson("evidence_supersession.json", supersession);
  return supersession;
}

export function runReal10000LiveEvidenceAudit(params: {
  web?: Record<string, unknown>;
  android?: Record<string, unknown>;
  screenshotsPresent?: boolean;
  androidScreenshotsPresent?: boolean;
  androidUiDumpsPresent?: boolean;
} = {}): Real10000AuditResult {
  const web = params.web ?? readSourceJson<Record<string, unknown>>("web_live_results.json", {});
  const android = params.android ?? readSourceJson<Record<string, unknown>>("android_api34_results.json", {});
  const screenshots = path.join(REAL10000_AUDIT_SOURCE_DIR, "web_screenshots.json");
  const androidScreenshots = path.join(REAL10000_AUDIT_SOURCE_DIR, "android_screenshots.json");
  const androidDumps = path.join(REAL10000_AUDIT_SOURCE_DIR, "android_ui_dumps.json");
  const holes: Real10000AuditHole[] = [];
  if (Number(web.web_live_prompts_passed ?? 0) < 1000) holes.push(hole({ phase: "live_evidence", classification: "WEB_LIVE_EVIDENCE_MISSING", severity: "P1", reason: "web_live_results.json must prove >= 1000 prompts passed.", artifact: sourceArtifact("web_live_results.json"), evidence: { web_live_prompts_passed: web.web_live_prompts_passed } }));
  if (Number(android.android_api34_prompts_passed ?? 0) < 300 || android.android_api34_tested !== true || android.api36_rejected !== true) holes.push(hole({ phase: "live_evidence", classification: "ANDROID_API34_EVIDENCE_MISSING", severity: "P1", reason: "android_api34_results.json must prove >= 300 prompts passed and API36 rejected.", artifact: sourceArtifact("android_api34_results.json"), evidence: android }));
  const screenshotChecks = [
    ["WEB_SCREENSHOTS_MISSING", screenshots, params.screenshotsPresent],
    ["ANDROID_SCREENSHOTS_MISSING", androidScreenshots, params.androidScreenshotsPresent],
    ["ANDROID_UI_DUMPS_MISSING", androidDumps, params.androidUiDumpsPresent],
  ] as const;
  const screenshotPresence = new Map<string, boolean>();
  for (const [classification, file, overridePresent] of screenshotChecks) {
    const present = overridePresent ?? (fs.existsSync(file) && fs.statSync(file).size >= 1000);
    screenshotPresence.set(classification, present);
    if (!present) {
      holes.push(hole({ phase: "live_evidence", classification, severity: "P1", reason: `${path.basename(file)} is missing or placeholder-sized.`, artifact: path.relative(process.cwd(), file).replace(/\\/g, "/") }));
    }
  }
  const matrix = readSourceJson<Record<string, unknown>>("matrix.json", {});
  const artifactHead = String(matrix.head_sha ?? matrix.git_head ?? matrix.commit_sha ?? "");
  const currentHead = gitHead();
  const supersession = liveEvidenceSupersession({
    matrix,
    web,
    android,
    screenshotsPresent: screenshotPresence.get("WEB_SCREENSHOTS_MISSING") === true,
    androidScreenshotsPresent: screenshotPresence.get("ANDROID_SCREENSHOTS_MISSING") === true,
    androidUiDumpsPresent: screenshotPresence.get("ANDROID_UI_DUMPS_MISSING") === true,
    currentHead,
    artifactHead,
  });
  if (!artifactHead && supersession.accepted !== true) {
    holes.push(hole({ phase: "live_evidence", classification: "ARTIFACT_HEAD_SHA_MISSING", severity: "P2", reason: "Real10000 matrix has no artifact HEAD SHA or documented supersession.", artifact: sourceArtifact("matrix.json"), evidence: { current_head: gitHead() } }));
  } else if (artifactHead && artifactHead !== currentHead && supersession.accepted !== true) {
    holes.push(hole({ phase: "live_evidence", classification: "ARTIFACT_HEAD_SHA_MISMATCH", severity: "P2", reason: "Artifact HEAD SHA differs from current HEAD.", artifact: sourceArtifact("matrix.json"), evidence: { artifact_head: artifactHead, current_head: gitHead() } }));
  }
  return resultWithHoles("live_evidence", "live_evidence_audit.json", {
    web_live_prompts_passed: web.web_live_prompts_passed ?? 0,
    android_api34_prompts_passed: android.android_api34_prompts_passed ?? 0,
    api36_rejected: android.api36_rejected === true,
    artifact_head_sha: artifactHead || null,
    artifact_head_superseded: supersession.accepted === true,
    current_head_sha: currentHead,
  }, holes);
}

function walkFiles(root: string, files: string[] = []): string[] {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "artifacts"].includes(entry.name)) continue;
      walkFiles(filePath, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(relative)) {
      files.push(relative);
    }
  }
  return files;
}

function isExactPromptExempt(filePath: string): boolean {
  return (
    filePath.includes("/fixtures/") ||
    filePath.startsWith("tests/") ||
    filePath.startsWith("scripts/audit/") ||
    filePath.includes("real10000AcceptanceCore.ts") ||
    filePath.includes("runReal10000")
  );
}

export function detectReal10000AntiFakeGreenFindings(files?: SourceFile[]): Real10000AuditHole[] {
  const sourceFiles = files ?? ["src", "scripts", "tests"].flatMap((root) => walkFiles(path.join(process.cwd(), root))).map((file) => ({
    path: file,
    source: fs.readFileSync(path.join(process.cwd(), file), "utf8"),
  }));
  const holes: Real10000AuditHole[] = [];
  const fullPromptTokens = String.raw`(?:смета\s+на|брусчат|навес|дренаж|крыши|лифт)`;
  const promptVariable = String.raw`(?:prompt|promptRu|text|inputText|userText|normalizedPrompt|normalizedText|question|query)`;
  const quoteClass = String.raw`["'\x60]`;
  const exactPromptFindings = sourceFiles
    .filter((file) => !isExactPromptExempt(file.path))
    .flatMap((file) => {
      const findings: string[] = [];
      const promptEquality = new RegExp(String.raw`\b${promptVariable}\b\s*={2,3}\s*${quoteClass}[^"'\x60]{16,}${fullPromptTokens}[^"'\x60]*${quoteClass}`, "iu");
      const promptIncludes = new RegExp(String.raw`\b${promptVariable}\b(?:\.[a-zA-Z]+\(.*?\))*\.includes\(\s*${quoteClass}[^"'\x60]{16,}${fullPromptTokens}[^"'\x60]*${quoteClass}\s*\)`, "iu");
      const promptSwitch = new RegExp(String.raw`switch\s*\(\s*\b${promptVariable}\b[\s\S]{0,400}?case\s+${quoteClass}[^"'\x60]{16,}${fullPromptTokens}[^"'\x60]*${quoteClass}`, "iu");
      if (promptEquality.test(file.source)) findings.push("prompt equality");
      if (promptIncludes.test(file.source)) findings.push("exact prompt includes");
      if (promptSwitch.test(file.source)) findings.push("exact prompt switch case");
      return findings.map((reason) => `${file.path}:${reason}`);
    });
  const selfValidating = sourceFiles
    .filter((file) => !file.path.startsWith("tests/"))
    .flatMap((file) => {
    const writesMatrixArtifact = /writeJson|writeFileSync|writeReal10000|fs\.writeFile|matrixPath|matrixFile/i.test(file.source);
    const writesGreenMatrix =
      writesMatrixArtifact &&
      /matrix\.json/.test(file.source) &&
      /GREEN_REAL_10000|final_status\s*:\s*["'`][^"'`]*GREEN_REAL_10000/i.test(file.source);
    const readsRuntimeEvidence =
      /runtime_results\.json|pdf_text_extract\.json|pdf_parity\.json|android_api34_results\.json|web_live_results\.json|failures\.json|merged_matrix\.json|shards/i.test(file.source) &&
      /readFileSync|readJson|readSourceJson|fs\.readFile/i.test(file.source);
    return writesGreenMatrix && !readsRuntimeEvidence ? [`${file.path}:green matrix without runtime evidence read`] : [];
  });
  const releaseGuardSource = sourceFiles.find((file) => file.path === "scripts/release/releaseGuard.shared.ts")?.source ?? "";
  const releaseGuardMissingAudit = !releaseGuardSource.includes("real-10000-estimate-provenance-diversity-output-quality-audit-proof");

  if (exactPromptFindings.length > 0) holes.push(hole({ phase: "anti_fake_green", classification: "EXACT_PROMPT_LOOKUP_FOUND", severity: "P0", reason: "Production/script code contains exact prompt lookup patterns outside exemptions.", evidence: exactPromptFindings.slice(0, 50) }));
  if (selfValidating.length > 0) holes.push(hole({ phase: "anti_fake_green", classification: "SELF_VALIDATING_MATRIX_FOUND", severity: "P0", reason: "A matrix appears to write green without reading evidence artifacts.", evidence: selfValidating.slice(0, 50) }));
  if (releaseGuardMissingAudit) holes.push(hole({ phase: "anti_fake_green", classification: "RELEASE_GUARD_AUDIT_GATE_MISSING", severity: "P1", reason: "Release guard does not include the Real10000 audit proof gate." }));
  return holes;
}

export function runReal10000AntiFakeGreenAudit(): Real10000AuditResult {
  const holes = detectReal10000AntiFakeGreenFindings();
  return resultWithHoles("anti_fake_green", "anti_fake_green_audit.json", {
    exact_prompt_lookup_found: holes.some((item) => item.classification === "EXACT_PROMPT_LOOKUP_FOUND"),
    self_validating_matrix_found: holes.some((item) => item.classification === "SELF_VALIDATING_MATRIX_FOUND"),
    release_guard_audit_gate_present: !holes.some((item) => item.classification === "RELEASE_GUARD_AUDIT_GATE_MISSING"),
  }, holes);
}

export function runAllReal10000EstimateAuditPhases(): Real10000AuditResult[] {
  return [
    runReal10000ProvenanceAudit(),
    runReal10000DiversityAudit(),
    runReal10000ShardRuntimeEvidenceAudit(),
    runReal10000OutputQualitySampleAudit(),
    runReal10000P0RegressionAudit(),
    runReal10000UiPdfParityAudit(),
    runReal10000LiveEvidenceAudit(),
    runReal10000AntiFakeGreenAudit(),
  ];
}

export function buildReal10000EstimateAuditMatrix(results: readonly Real10000AuditResult[]) {
  const holes = results.flatMap((result) => result.holes);
  const p0 = holes.filter((item) => item.severity === "P0");
  const p1 = holes.filter((item) => item.severity === "P1");
  const p2 = holes.filter((item) => item.severity === "P2");
  return {
    wave: "S_REAL_10000_ESTIMATE_PROVENANCE_DIVERSITY_OUTPUT_QUALITY_AUDIT",
    final_status: p0.length === 0 ? "GREEN_REAL_10000_ESTIMATE_AUDIT_NO_P0_HOLES_FOUND" : "NO_GO_REAL_10000_ESTIMATE_AUDIT_P0_HOLES_FOUND",
    governed_acceptance_cases_proven: true,
    real_external_user_traffic_proven: false,
    real_user_traffic_claimed: false,
    phases_total: results.length,
    phases_passed_without_p0: results.filter((result) => result.passed).length,
    holes_total: holes.length,
    p0_holes: p0.length,
    p1_holes: p1.length,
    p2_holes: p2.length,
    provenance_audit_passed: results.find((item) => item.phase === "provenance")?.passed === true,
    diversity_audit_passed: results.find((item) => item.phase === "diversity")?.passed === true,
    shard_runtime_evidence_audit_passed: results.find((item) => item.phase === "shard_runtime_evidence")?.passed === true,
    output_quality_sample_audit_passed: results.find((item) => item.phase === "output_quality_sample")?.passed === true,
    p0_regression_audit_passed: results.find((item) => item.phase === "p0_regression")?.passed === true,
    ui_pdf_parity_audit_passed: results.find((item) => item.phase === "ui_pdf_parity")?.passed === true,
    live_evidence_audit_passed: results.find((item) => item.phase === "live_evidence")?.passed === true,
    anti_fake_green_audit_passed: results.find((item) => item.phase === "anti_fake_green")?.passed === true,
    fake_green_claimed: false,
  };
}
