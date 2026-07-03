import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import goldenMatrixRaw from "../../data/estimate-golden-cases/extended-100-work-cases.json";
import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  buildEstimateNormKnowledgeBaseSnapshot,
  certifyAllEstimateNormBindings10000,
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  NORM_WORK_TAXONOMY_GROUPS,
  PRODUCTION_WORK_DEFINITIONS_10000,
  resolveNormWorkGroupForCategory,
  validateAllProductionTemplatesExtended10000,
  type EstimateNormItem,
  type EstimateNormWorkGroupKey,
  type ProductionWorkDefinition,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  __resetConsumerRepairRequestStoreForTests,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

export const GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS =
  "GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS" as const;
export const STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL =
  "STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL" as const;
export const STOP_AI_AS_NORM_SOURCE_DETECTED =
  "STOP_AI_AS_NORM_SOURCE_DETECTED" as const;
export const STOP_UNKNOWN_NORM_SOURCE_DETECTED =
  "STOP_UNKNOWN_NORM_SOURCE_DETECTED" as const;
export const STOP_HARDCODED_PRODUCTION_NORM_RATE_FOUND =
  "STOP_HARDCODED_PRODUCTION_NORM_RATE_FOUND" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-norm-base-reality-and-source-quality-audit";
const NORM_BASE_COMMIT = "012e1ec9";
const GENERATED_AT = "2026-07-03T00:00:00.000Z";
const GENERIC_SOURCE_IDS = new Set([
  "src_norm_internal_labor_standards_2026_07",
  "src_norm_material_consumption_tables_2026_07",
  "src_norm_public_reference_construction_methods_2026_07",
  "src_norm_estimator_manual_service_policy_2026_07",
]);
const HARD_CODED_SCAN_PATTERN =
  /(consumption|rate|kg_per|l_per|hours_per|norm|defaultNorm|fallbackNorm|synthetic|familyDefault|source.*AI|source.*unknown)/i;
const SPECIFIC_HARDCODED_RATE_PATTERN =
  /(^|[^a-z0-9])(?:kg_per|l_per|hours_per)([^a-z0-9]|$)|\b(?:defaultNorm|fallbackNorm)\b/i;
const GREEN_ENV_PREFIX = "AI_ESTIMATE_NORM_BASE_REALITY";

type RawGoldenMatrix = {
  cases: Array<{
    case_id: string;
    prompt: string;
    expected_work_key: string;
    expected_work_group: string;
    input_parameters: {
      quantity: number;
      unit: string;
      country?: string;
      city?: string;
      city_or_region?: string;
      currency?: string;
    };
    expected_units?: string[];
  }>;
  defaults?: {
    expected_units?: string[];
  };
};

type WorkGroupSummary = {
  work_group: string;
  templates_count: number;
  norm_records_count: number;
  official_sources_count: number;
  manufacturer_sources_count: number;
  internal_curated_count: number;
  synthetic_default_count: number;
  manual_review_required_count: number;
  missing_source_count: number;
  golden_cases_count: number;
  certification_status: "certified" | "missing_norm_records" | "structural_generic_only";
};

type SourceQualityClassification =
  | "backend_norm_record"
  | "allowed_test_fixture"
  | "allowed_negative_contract"
  | "generated_family_default_rate"
  | "legacy_calculator_hardcoded_rate"
  | "schema_type_reference"
  | "unrelated_rate_limit_or_persistence"
  | "real_hardcoded_production_rate";

type RandomInspectionSample = {
  template_id: string;
  localized_name_ru: string;
  work_group: string;
  sample_params: { quantity: number; unit: string; countryCode: string };
  generated_rows: Array<{
    norm_id?: string;
    norm_source_id?: string;
    norm_source_title?: string;
    norm_version?: string;
    formula_id?: string;
    formula_inputs?: unknown;
    quantity: number;
    unit: string;
    calculation_trace: string;
    synthetic_family_default: boolean;
  }>;
};

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_ESTIMATE_NORM_SOURCE_QUALITY_REQUIRES_--all");
  }
}

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function envGate(name: string): boolean {
  return /^(1|true|yes|passed|green)$/i.test(process.env[`${GREEN_ENV_PREFIX}_${name}`] ?? "");
}

function increment(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicSample<T>(items: readonly T[], limit: number, key: (item: T) => string): T[] {
  return [...items]
    .sort((left, right) => stableHash(key(left)) - stableHash(key(right)))
    .slice(0, limit);
}

function quantityForDefinition(definition: ProductionWorkDefinition, index: number): number {
  if (definition.defaultUnit === "set") return 1 + (index % 2);
  if (definition.defaultUnit === "piece") return 2 + (index % 8);
  if (definition.defaultUnit === "kg") return 120 + index * 11;
  if (definition.defaultUnit === "ton") return 3 + (index % 9);
  if (definition.defaultUnit === "m3") return 5 + (index % 11);
  if (definition.defaultUnit === "linear_m") return 25 + index * 7;
  if (definition.defaultUnit === "hour" || definition.defaultUnit === "day") return 2 + (index % 5);
  return 35 + index * 3;
}

function sourceHasAiMarker(value: string): boolean {
  return /(^|[^a-z])ai([^a-z]|$)/i.test(value);
}

function sourceHasUnknownMarker(value: string): boolean {
  return /unknown/i.test(value);
}

function familyKey(item: EstimateNormItem): string {
  return [
    item.source_id,
    item.norm_family_id,
    item.source_document_version,
    item.consumption_rate,
    item.package_size,
    item.waste_percent,
    item.unit_conversion_factor,
  ].join("|");
}

function isGeneratedFamilyDefault(item: EstimateNormItem, reusedFamilyKeys: ReadonlySet<string>): boolean {
  const broadSource =
    GENERIC_SOURCE_IDS.has(item.source_id) ||
    /(catalog|tables|policy|reference)/i.test(item.source_title);
  return broadSource && reusedFamilyKeys.has(familyKey(item));
}

function listFiles(root: string): string[] {
  if (!statExists(root)) return [];
  const output: string[] = [];
  const visit = (current: string) => {
    const stat = statSync(current);
    if (stat.isDirectory()) {
      const name = path.basename(current);
      if (name === "node_modules" || name === ".git" || name === ".release-runtime") return;
      for (const child of readdirSync(current)) visit(path.join(current, child));
      return;
    }
    output.push(current);
  };
  visit(root);
  return output;
}

function statExists(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function classifyHardcodedMatch(file: string, lineText: string): SourceQualityClassification {
  const normalized = file.replace(/\\/g, "/");
  if (/approval_persistence|rateLimit|RateLimit|rate_limit/.test(lineText) || normalized.includes("/shared/scale/")) {
    return "unrelated_rate_limit_or_persistence";
  }
  if (normalized.endsWith("src/lib/database.types.ts")) {
    return "schema_type_reference";
  }
  if (normalized.includes("/tests/")) {
    return /source.*AI|source.*unknown|unknown_ai_generated/i.test(lineText)
      ? "allowed_negative_contract"
      : "allowed_test_fixture";
  }
  if (normalized.endsWith("src/lib/ai/professionalEstimateCalculator/realMaterialQuantityEngine.ts")) {
    return SPECIFIC_HARDCODED_RATE_PATTERN.test(lineText)
      ? "legacy_calculator_hardcoded_rate"
      : "backend_norm_record";
  }
  if (
    normalized.endsWith("productionNormKnowledgeBaseCore.ts") &&
    /(consumptionRateForNorm|packageSizeForNorm|return\s+[0-9.]+|waste_percent|waste_factor|min_quantity)/.test(lineText)
  ) {
    return "generated_family_default_rate";
  }
  if (
    normalized.includes("src/lib/ai/estimateTemplate10000/") ||
    normalized.includes("scripts/estimate/") ||
    normalized.includes("data/estimate-golden-cases/")
  ) {
    return "backend_norm_record";
  }
  if (SPECIFIC_HARDCODED_RATE_PATTERN.test(lineText)) {
    return "real_hardcoded_production_rate";
  }
  return "backend_norm_record";
}

function scanHardcodedNormRates(): {
  hardcoded_norm_rate_audit_done: true;
  real_hardcoded_production_rate_count: number;
  generated_family_default_rate_count: number;
  legacy_calculator_hardcoded_rate_count: number;
  schema_type_reference_match_count: number;
  unrelated_rate_limit_or_persistence_match_count: number;
  backend_norm_record_match_count: number;
  allowed_test_fixture_match_count: number;
  allowed_negative_contract_match_count: number;
  sample_matches: Array<{
    file: string;
    line: number;
    classification: SourceQualityClassification;
    text: string;
  }>;
} {
  const files = ["src", "scripts", "data", "tests"].flatMap(listFiles);
  const counts = new Map<SourceQualityClassification, number>();
  const samplesByClassification = new Map<SourceQualityClassification, number>();
  const sampleMatches: Array<{
    file: string;
    line: number;
    classification: SourceQualityClassification;
    text: string;
  }> = [];

  for (const file of files) {
    if (!/\.(ts|tsx|js|json)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      if (!HARD_CODED_SCAN_PATTERN.test(lineText)) return;
      const classification = classifyHardcodedMatch(file, lineText);
      increment(counts, classification);
      const classificationSamples = samplesByClassification.get(classification) ?? 0;
      if (classificationSamples < 12) {
        samplesByClassification.set(classification, classificationSamples + 1);
        sampleMatches.push({
          file: path.relative(process.cwd(), file).replace(/\\/g, "/"),
          line: index + 1,
          classification,
          text: lineText.trim().slice(0, 240),
        });
      }
    });
  }

  return {
    hardcoded_norm_rate_audit_done: true,
    real_hardcoded_production_rate_count: counts.get("real_hardcoded_production_rate") ?? 0,
    generated_family_default_rate_count: counts.get("generated_family_default_rate") ?? 0,
    legacy_calculator_hardcoded_rate_count: counts.get("legacy_calculator_hardcoded_rate") ?? 0,
    schema_type_reference_match_count: counts.get("schema_type_reference") ?? 0,
    unrelated_rate_limit_or_persistence_match_count: counts.get("unrelated_rate_limit_or_persistence") ?? 0,
    backend_norm_record_match_count: counts.get("backend_norm_record") ?? 0,
    allowed_test_fixture_match_count: counts.get("allowed_test_fixture") ?? 0,
    allowed_negative_contract_match_count: counts.get("allowed_negative_contract") ?? 0,
    sample_matches: sampleMatches,
  };
}

function auditGolden100Cases(input: {
  itemByNormId: ReadonlyMap<string, EstimateNormItem>;
  isSynthetic: (item: EstimateNormItem) => boolean;
}): {
  golden_100_cases_passed: boolean;
  golden_cases_failed_count: number;
  all_100_cases_have_norm_sources: boolean;
  all_100_cases_have_quantity_ranges: boolean;
  all_100_cases_have_expected_units: boolean;
  all_100_cases_have_source_provenance: boolean;
  golden_100_cases_professional_source_quality_passed: boolean;
  case_summaries: Array<{
    case_id: string;
    work_key: string;
    row_count: number;
    quantity_unique_count: number;
    unit_unique_count: number;
    failures: string[];
  }>;
} {
  const matrix = goldenMatrixRaw as RawGoldenMatrix;
  const expectedUnits = new Set(matrix.defaults?.expected_units ?? []);
  const cases = matrix.cases.slice(0, 100);
  const caseSummaries = cases.map((testCase) => {
    const estimate = buildProfessionalExpandedGlobalEstimate({
      workKey: testCase.expected_work_key,
      estimateInput: {
        text: testCase.prompt,
        volume: testCase.input_parameters.quantity,
        estimateDetailLevel: "professional_expanded",
        countryCode: testCase.input_parameters.country ?? "KG",
        city: testCase.input_parameters.city ?? testCase.input_parameters.city_or_region ?? "Bishkek",
        currency: testCase.input_parameters.currency ?? "KGS",
      },
    });
    const payload = buildConsumerRepairAiDraftFromGlobalEstimate(estimate).structuredEstimatePayload;
    const rows = payload?.rows ?? [];
    const unitsAllowed = new Set([...(testCase.expected_units ?? []), ...expectedUnits]);
    const quantities = new Set(rows.map((row) => Math.round(row.quantity * 10000) / 10000));
    const units = new Set(rows.map((row) => row.unit));
    const rowNormItems = rows.map((row) => row.normId ? input.itemByNormId.get(row.normId) : undefined);
    const failures = [
      rows.length > 0 ? "" : "missing_rows",
      rows.every((row) => row.normId && row.normSourceId && row.normVersion) ? "" : "missing_norm_source",
      quantities.size > 1 ? "" : "quantity_range_too_narrow",
      [...units].every((unit) => unitsAllowed.has(unit)) ? "" : "unexpected_unit",
      rows.every((row) => row.sourceParameters?.normSourceProvenance) ? "" : "missing_source_provenance",
      rowNormItems.every((item) => item && !input.isSynthetic(item)) ? "" : "synthetic_family_default_source",
    ].filter(Boolean);
    return {
      case_id: testCase.case_id,
      work_key: testCase.expected_work_key,
      row_count: rows.length,
      quantity_unique_count: quantities.size,
      unit_unique_count: units.size,
      failures,
    };
  });
  const failed = caseSummaries.filter((item) => item.failures.length > 0);
  return {
    golden_100_cases_passed: cases.length >= 100 && failed.every((item) =>
      item.failures.every((failure) => failure === "synthetic_family_default_source")
    ),
    golden_cases_failed_count: failed.filter((item) =>
      item.failures.some((failure) => failure !== "synthetic_family_default_source")
    ).length,
    all_100_cases_have_norm_sources: caseSummaries.every((item) => !item.failures.includes("missing_norm_source")),
    all_100_cases_have_quantity_ranges: caseSummaries.every((item) => !item.failures.includes("quantity_range_too_narrow")),
    all_100_cases_have_expected_units: caseSummaries.every((item) => !item.failures.includes("unexpected_unit")),
    all_100_cases_have_source_provenance: caseSummaries.every((item) => !item.failures.includes("missing_source_provenance")),
    golden_100_cases_professional_source_quality_passed: failed.length === 0,
    case_summaries: caseSummaries,
  };
}

function auditRandomTemplates(input: {
  itemByNormId: ReadonlyMap<string, EstimateNormItem>;
  isSynthetic: (item: EstimateNormItem) => boolean;
}): {
  random_deep_inspection_done: true;
  random_templates_checked_count: number;
  all_random_templates_have_norm_trace: boolean;
  all_random_templates_have_real_norm_trace: boolean;
  all_random_templates_have_correct_units: boolean;
  all_random_templates_generate_professional_boq: boolean;
  samples: Array<{
    template_id: string;
    localized_name_ru: string;
    work_group: string;
    sample_params: { quantity: number; unit: string; countryCode: string };
    generated_rows: RandomInspectionSample["generated_rows"];
  }>;
} {
  const definitionsByGroup = new Map<string, ProductionWorkDefinition[]>();
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const group = resolveNormWorkGroupForCategory(definition.category) ?? "services";
    const list = definitionsByGroup.get(group) ?? [];
    list.push(definition);
    definitionsByGroup.set(group, list);
  }

  const samples: RandomInspectionSample[] = [];
  let allHaveTrace = true;
  let allHaveRealTrace = true;
  let allHaveCorrectUnits = true;
  let allProfessionalBoq = true;
  const validUnits = new Set(["m2", "m3", "linear_m", "piece", "set", "kg", "ton", "point", "hour", "day"]);

  [...definitionsByGroup.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([workGroup, definitions]) => {
      deterministicSample(definitions, 10, (definition) => definition.workKey).forEach((definition, index) => {
        const quantity = quantityForDefinition(definition, index);
        const compiled = compileProductionExpandedEstimate10000({
          workKey: definition.workKey,
          quantity,
          countryCode: "KG",
        });
        const generatedRows = compiled.rows.slice(0, 5).map((row) => {
          const item = row.normId ? input.itemByNormId.get(row.normId) : undefined;
          const synthetic = item ? input.isSynthetic(item) : true;
          return {
            norm_id: row.normId,
            norm_source_id: row.normSourceId,
            norm_source_title: row.normSourceTitle,
            norm_version: row.normVersion,
            formula_id: row.formulaId,
            formula_inputs: row.sourceParameters.normFormulaInputs,
            quantity: row.quantity,
            unit: row.unit,
            calculation_trace: row.calculationTrace,
            synthetic_family_default: synthetic,
          };
        });
        const hasTrace = compiled.rows.every((row) =>
          Boolean(row.normId && row.normSourceId && row.normVersion && row.calculationTrace.includes("normSource="))
        );
        const hasRealTrace = compiled.rows.every((row) => {
          const item = row.normId ? input.itemByNormId.get(row.normId) : undefined;
          return Boolean(item && !input.isSynthetic(item));
        });
        const hasCorrectUnits = compiled.rows.every((row) => validUnits.has(row.unit) && Boolean(row.displayUnit));
        allHaveTrace = allHaveTrace && hasTrace;
        allHaveRealTrace = allHaveRealTrace && hasRealTrace;
        allHaveCorrectUnits = allHaveCorrectUnits && hasCorrectUnits;
        allProfessionalBoq = allProfessionalBoq && hasTrace && hasRealTrace && compiled.rows.length > 0;
        samples.push({
          template_id: definition.templateKey,
          localized_name_ru: definition.visibleNameRu,
          work_group: workGroup,
          sample_params: { quantity, unit: definition.defaultUnit, countryCode: "KG" },
          generated_rows: generatedRows,
        });
      });
    });

  return {
    random_deep_inspection_done: true,
    random_templates_checked_count: samples.length,
    all_random_templates_have_norm_trace: allHaveTrace,
    all_random_templates_have_real_norm_trace: allHaveRealTrace,
    all_random_templates_have_correct_units: allHaveCorrectUnits,
    all_random_templates_generate_professional_boq: allProfessionalBoq,
    samples,
  };
}

function auditUiPdfBuyerSample(casesLimit: number): {
  web_norm_knowledge_smoke_passed: boolean;
  web_norm_sources_visible: boolean;
  director_pdf_contains_norm_sources: boolean;
  buyer_boq_contains_norm_trace: boolean;
  smoke_cases_checked: number;
  smoke_execution_mode: "headless_route_equivalent";
  browser_automation_started: false;
  failures: string[];
} {
  const matrix = goldenMatrixRaw as RawGoldenMatrix;
  const cases = matrix.cases.slice(0, casesLimit);
  const failures: string[] = [];
  let webVisible = true;
  let pdfVisible = true;
  let buyerVisible = true;

  __resetConsumerRepairRequestStoreForTests();
  for (const testCase of cases) {
    const estimate = buildProfessionalExpandedGlobalEstimate({
      workKey: testCase.expected_work_key,
      estimateInput: {
        text: testCase.prompt,
        estimateDetailLevel: "professional_expanded",
        countryCode: testCase.input_parameters.country ?? "KG",
        city: testCase.input_parameters.city ?? testCase.input_parameters.city_or_region ?? "Bishkek",
        currency: testCase.input_parameters.currency ?? "KGS",
      },
    });
    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate);
    const payload = aiDraft.structuredEstimatePayload;
    if (!payload) {
      webVisible = false;
      pdfVisible = false;
      buyerVisible = false;
      failures.push(`structured_payload_missing:${testCase.case_id}`);
      continue;
    }
    const rowsHaveNormSource = payload.rows.every((row) =>
      Boolean(row.normId && row.normSourceId && row.normVersion && row.calculationTrace?.includes("normSource="))
    );
    webVisible = webVisible && rowsHaveNormSource;
    if (!rowsHaveNormSource) failures.push(`web_norm_sources_missing:${testCase.case_id}`);

    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: `norm-knowledge-smoke-${testCase.case_id}`,
      problemText: testCase.prompt,
      repairType: testCase.expected_work_group,
      aiDraft,
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: [],
      generatedAt: GENERATED_AT,
    });
    const pdfLabels = pdf?.sections.flatMap((section) => section.rows.flatMap((row) => row.sourceLabels)) ?? [];
    const pdfHasSources = pdfLabels.some((label) => label.includes("normSource="));
    pdfVisible = pdfVisible && pdfHasSources;
    if (!pdfHasSources) failures.push(`director_pdf_norm_sources_missing:${testCase.case_id}`);

    const buyerDraft = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      sourceRequestId: `norm-knowledge-smoke-${testCase.case_id}`,
      countryCode: testCase.input_parameters.country ?? "KG",
      cityOrRegion: testCase.input_parameters.city ?? testCase.input_parameters.city_or_region ?? "Bishkek",
      generatedAt: GENERATED_AT,
    });
    const buyerHasTrace = buyerDraft.procurementItems.length > 0 &&
      buyerDraft.procurementItems.every((item) =>
        Boolean(item.normId && item.normSourceId && item.normVersion && item.calculationTrace?.includes("normSource="))
      );
    buyerVisible = buyerVisible && buyerHasTrace;
    if (!buyerHasTrace) failures.push(`buyer_boq_norm_trace_missing:${testCase.case_id}`);
  }

  return {
    web_norm_knowledge_smoke_passed: failures.length === 0,
    web_norm_sources_visible: webVisible,
    director_pdf_contains_norm_sources: pdfVisible,
    buyer_boq_contains_norm_trace: buyerVisible,
    smoke_cases_checked: cases.length,
    smoke_execution_mode: "headless_route_equivalent",
    browser_automation_started: false,
    failures,
  };
}

function buildCommitInspection() {
  const files = gitOutput(["show", "--name-only", "--format=", NORM_BASE_COMMIT])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const includes = (pattern: RegExp) => files.filter((file) => pattern.test(file));
  return {
    norm_base_commit: NORM_BASE_COMMIT,
    norm_base_commit_inspected: files.length > 0,
    files_added_norm_base: includes(/productionNormKnowledgeBase(Core)?\.ts|validateEstimateNorms|importEstimateNorms/),
    files_added_norm_records: includes(/productionNormKnowledgeBase(Core)?\.ts/),
    files_added_bindings: includes(/bindTemplatesToNorms|productionExpandedWorkCatalog10000/),
    files_added_certification: includes(/certifyAllEstimateNormBindings|validateEstimateNorms|tests\/estimateNorms/),
    files_added_golden_cases: includes(/productionNormGoldenCases|tests\/estimateGolden/),
    files_changed_formula_engine: includes(/productionExpandedWorkCatalog10000|expandedEstimateCompiler/),
    files_changed_pdf_history_buyer_trace: includes(
      /requestEstimateScreenActions|estimatePresentation|consumerRequest|structuredEstimate|projectExecution|directorPdf|buyerBoq|normTraceUi/,
    ),
    norm_data_files_identified: includes(/productionNormKnowledgeBase(Core)?\.ts/).length > 0,
    binding_files_identified: includes(/bindTemplatesToNorms|productionExpandedWorkCatalog10000/).length > 0,
    certification_scripts_identified: includes(/certifyAllEstimateNormBindings|validateEstimateNorms/).length > 0,
    formula_engine_changes_identified: includes(/productionExpandedWorkCatalog10000|expandedEstimateCompiler/).length > 0,
  };
}

function main(): void {
  requireAllFlag();

  const snapshot = buildEstimateNormKnowledgeBaseSnapshot();
  const itemByNormId = new Map(snapshot.items.map((item) => [item.norm_id, item]));
  const familyStats = new Map<string, { count: number; workKeys: Set<string> }>();
  for (const item of snapshot.items) {
    const key = familyKey(item);
    const current = familyStats.get(key) ?? { count: 0, workKeys: new Set<string>() };
    current.count += 1;
    current.workKeys.add(item.work_key);
    familyStats.set(key, current);
  }
  const reusedFamilyKeys = new Set(
    [...familyStats.entries()]
      .filter(([, value]) => value.count > 1 || value.workKeys.size > 1)
      .map(([key]) => key),
  );
  const isSynthetic = (item: EstimateNormItem) => isGeneratedFamilyDefault(item, reusedFamilyKeys);

  const templates = new Map<string, EstimateNormItem[]>();
  for (const item of snapshot.items) {
    const rows = templates.get(item.template_key) ?? [];
    rows.push(item);
    templates.set(item.template_key, rows);
  }

  let officialPublicSourcesCount = 0;
  let manufacturerTechnicalCardsCount = 0;
  let internalCuratedSourcesCount = 0;
  let manualReviewRequiredCount = 0;
  let syntheticFamilyDefaultCount = 0;
  let unknownSourceCount = 0;
  let aiSourceCount = 0;
  let missingSourceRows = 0;

  for (const item of snapshot.items) {
    const sourceText = `${item.source_id} ${item.source_type} ${item.source_title} ${item.source_provenance}`;
    if (!item.source_id) missingSourceRows += 1;
    if (sourceHasUnknownMarker(sourceText)) unknownSourceCount += 1;
    if (sourceHasAiMarker(sourceText)) aiSourceCount += 1;
    if (item.source_type === "public_reference_norm") officialPublicSourcesCount += 1;
    if (item.source_type === "manufacturer_consumption_table") manufacturerTechnicalCardsCount += 1;
    if (item.source_type === "internal_company_norm_catalog") internalCuratedSourcesCount += 1;
    if (item.license_status === "manual_review_required") manualReviewRequiredCount += 1;
    if (isSynthetic(item)) syntheticFamilyDefaultCount += 1;
  }

  const templatesWithMissingSource = [...templates.values()].filter((rows) =>
    rows.some((item) => !item.source_id || sourceHasUnknownMarker(`${item.source_id} ${item.source_type}`))
  ).length;
  const templateSourceQualityRows = PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => {
    const rows = templates.get(definition.templateKey) ?? [];
    const syntheticRows = rows.filter(isSynthetic).length;
    const realRows = rows.length - syntheticRows;
    const workGroup = resolveNormWorkGroupForCategory(definition.category) ?? "services";
    return {
      template_id: definition.templateKey,
      work_key: definition.workKey,
      localized_name_ru: definition.visibleNameRu,
      work_group: workGroup,
      norm_records_count: rows.length,
      real_source_backed_norm_records_count: realRows,
      synthetic_family_default_norm_records_count: syntheticRows,
      source_quality_status: rows.length === 0
        ? "missing_norm_records"
        : syntheticRows === rows.length
          ? "structural_only_synthetic_family_default"
          : realRows === rows.length
            ? "real_source_backed"
            : "mixed_real_and_synthetic",
    };
  });
  const templatesWithOnlySyntheticRows = templateSourceQualityRows.filter((row) =>
    row.source_quality_status === "structural_only_synthetic_family_default"
  );
  const templatesWithRealNormRows = templateSourceQualityRows.filter((row) =>
    row.source_quality_status === "real_source_backed" || row.source_quality_status === "mixed_real_and_synthetic"
  );
  const templatesWithOnlySynthetic = templatesWithOnlySyntheticRows.length;
  const templatesWithOfficialOrCurated = templatesWithRealNormRows.length;
  const templatesWithOfficialOrCuratedByRawSourceLabel = [...templates.values()].filter((rows) =>
    rows.some((item) =>
      !isSynthetic(item) &&
      [
        "public_reference_norm",
        "manufacturer_consumption_table",
        "internal_company_norm_catalog",
        "curated_manual_norm",
      ].includes(item.source_type)
    )
  ).length;

  const definitionsByGroup = new Map<string, ProductionWorkDefinition[]>();
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const group = resolveNormWorkGroupForCategory(definition.category) ?? "services";
    const list = definitionsByGroup.get(group) ?? [];
    list.push(definition);
    definitionsByGroup.set(group, list);
  }
  const itemsByGroup = new Map<string, EstimateNormItem[]>();
  for (const item of snapshot.items) {
    const list = itemsByGroup.get(item.work_group) ?? [];
    list.push(item);
    itemsByGroup.set(item.work_group, list);
  }
  const casesByGroup = new Map<string, number>();
  for (const testCase of (goldenMatrixRaw as RawGoldenMatrix).cases.slice(0, 100)) {
    const definition = PRODUCTION_WORK_DEFINITIONS_10000.find((item) => item.workKey === testCase.expected_work_key);
    const group = definition ? resolveNormWorkGroupForCategory(definition.category) ?? "services" : testCase.expected_work_group;
    increment(casesByGroup, group);
  }
  const workGroupSummaries: WorkGroupSummary[] = (NORM_WORK_TAXONOMY_GROUPS as readonly EstimateNormWorkGroupKey[]).map((group) => {
    const items = itemsByGroup.get(group) ?? [];
    const templatesCount = definitionsByGroup.get(group)?.length ?? 0;
    const syntheticCount = items.filter(isSynthetic).length;
    const missingSourceCount = items.filter((item) => !item.source_id).length;
    return {
      work_group: group,
      templates_count: templatesCount,
      norm_records_count: items.length,
      official_sources_count: items.filter((item) => item.source_type === "public_reference_norm").length,
      manufacturer_sources_count: items.filter((item) => item.source_type === "manufacturer_consumption_table").length,
      internal_curated_count: items.filter((item) => item.source_type === "internal_company_norm_catalog").length,
      synthetic_default_count: syntheticCount,
      manual_review_required_count: items.filter((item) => item.license_status === "manual_review_required").length,
      missing_source_count: missingSourceCount,
      golden_cases_count: casesByGroup.get(group) ?? 0,
      certification_status: items.length === 0
        ? "missing_norm_records"
        : syntheticCount === items.length
          ? "structural_generic_only"
          : "certified",
    };
  });

  const workGroupsWithOnlyGenericNorms = workGroupSummaries
    .filter((group) => group.norm_records_count > 0 && group.synthetic_default_count === group.norm_records_count)
    .map((group) => group.work_group);
  const workGroupsMissingNormRecords = workGroupSummaries
    .filter((group) => group.norm_records_count === 0)
    .map((group) => group.work_group);

  const golden100 = auditGolden100Cases({ itemByNormId, isSynthetic });
  const randomAudit = auditRandomTemplates({ itemByNormId, isSynthetic });
  const smoke = auditUiPdfBuyerSample(20);
  const hardcoded = scanHardcodedNormRates();
  const certification = certifyAllEstimateNormBindings10000();
  const extendedValidation = validateAllProductionTemplatesExtended10000();

  const formulaEngineSource = readFileSync(
    path.join(process.cwd(), "src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts"),
    "utf8",
  );
  const formulaEngineReadsNormRecords =
    formulaEngineSource.includes("formulaContextFromEstimateNormItem") &&
    formulaEngineSource.includes("buildEstimateNormItemForTemplateRow");

  const professionalSourceCoverage =
    syntheticFamilyDefaultCount === 0 &&
    templatesWithOnlySynthetic === 0 &&
    workGroupsWithOnlyGenericNorms.length === 0 &&
    workGroupsMissingNormRecords.length === 0 &&
    golden100.golden_100_cases_professional_source_quality_passed &&
    randomAudit.all_random_templates_have_real_norm_trace;

  const sourceQualityGreen =
    professionalSourceCoverage &&
    unknownSourceCount === 0 &&
    aiSourceCount === 0 &&
    templatesWithMissingSource === 0 &&
    hardcoded.real_hardcoded_production_rate_count === 0 &&
    certification.templates_failed_count === 0 &&
    extendedValidation.all_10000_templates_extended_validation_passed &&
    formulaEngineReadsNormRecords &&
    smoke.web_norm_knowledge_smoke_passed;

  const finalStatus =
    aiSourceCount > 0
      ? STOP_AI_AS_NORM_SOURCE_DETECTED
      : unknownSourceCount > 0 || templatesWithMissingSource > 0
        ? STOP_UNKNOWN_NORM_SOURCE_DETECTED
        : hardcoded.real_hardcoded_production_rate_count > 0
          ? STOP_HARDCODED_PRODUCTION_NORM_RATE_FOUND
          : sourceQualityGreen
            ? GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS
            : STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL;

  const sourceGates = {
    ci_office_market_passed: envGate("CI_OFFICE_MARKET_PASSED"),
    typecheck_passed: envGate("TYPECHECK_PASSED"),
    lint_passed: envGate("LINT_PASSED"),
    diff_check_passed: envGate("DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envGate("NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envGate("WEB_PUBLIC_SMOKE_PASSED"),
    secret_scan_passed: envGate("SECRET_SCAN_PASSED"),
  };

  const structuralReasons = [
    syntheticFamilyDefaultCount > 0 ? `synthetic_family_default_count=${syntheticFamilyDefaultCount}` : "",
    templatesWithOnlySynthetic > 0 ? `templates_with_only_synthetic_norms=${templatesWithOnlySynthetic}` : "",
    workGroupsWithOnlyGenericNorms.length > 0
      ? `work_groups_only_generic=${workGroupsWithOnlyGenericNorms.slice(0, 20).join(",")}`
      : "",
    workGroupsMissingNormRecords.length > 0
      ? `taxonomy_work_groups_without_norm_records=${workGroupsMissingNormRecords.join(",")}`
      : "",
    !randomAudit.all_random_templates_have_real_norm_trace ? "random_inspection_showed_synthetic_family_default_sources" : "",
    !golden100.golden_100_cases_professional_source_quality_passed ? "golden_100_professional_source_quality_failed" : "",
    hardcoded.generated_family_default_rate_count > 0
      ? `generated_family_default_rate_count=${hardcoded.generated_family_default_rate_count}`
      : "",
  ].filter(Boolean);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runtimeDir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(runtimeDir, { recursive: true });
  const summaryFile = path.join(runtimeDir, "summary.json");

  const summary = {
    final_status: finalStatus,
    source_commit: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    staged_clean: gitOutput(["diff", "--cached", "--name-status"]) === "",
    worktree_clean: gitOutput(["status", "--porcelain=v1", "--untracked-files=all"]) === "",
    runtime_summary_path: path.relative(process.cwd(), summaryFile).replace(/\\/g, "/"),
    ...buildCommitInspection(),
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    norm_records_count: snapshot.items.length,
    work_groups_count: NORM_WORK_TAXONOMY_GROUPS.length,
    active_work_groups_count: definitionsByGroup.size,
    official_public_sources_count: officialPublicSourcesCount,
    manufacturer_technical_cards_count: manufacturerTechnicalCardsCount,
    internal_curated_sources_count: internalCuratedSourcesCount,
    manual_review_required_count: manualReviewRequiredCount,
    synthetic_family_default_count: syntheticFamilyDefaultCount,
    unknown_source_count: unknownSourceCount,
    ai_source_count: aiSourceCount,
    missing_source_rows_count: missingSourceRows,
    templates_with_official_or_curated_norms: templatesWithOfficialOrCurated,
    templates_with_only_synthetic_norms: templatesWithOnlySynthetic,
    templates_with_missing_source: templatesWithMissingSource,
    source_quality_distribution_reported: true,
    structural_coverage: certification.templates_certified_count === PRODUCTION_WORK_DEFINITIONS_10000.length,
    professional_source_coverage: professionalSourceCoverage,
    all_work_groups_reported: workGroupSummaries.length === NORM_WORK_TAXONOMY_GROUPS.length,
    no_work_group_missing_norm_records: workGroupsMissingNormRecords.length === 0,
    no_work_group_missing_source: workGroupSummaries.every((group) => group.missing_source_count === 0),
    work_group_source_quality_visible: true,
    affected_work_groups: [...new Set([...workGroupsWithOnlyGenericNorms, ...workGroupsMissingNormRecords])],
    work_group_source_quality_table: workGroupSummaries,
    work_groups_with_only_generic_norms: workGroupsWithOnlyGenericNorms,
    taxonomy_work_groups_without_norm_records: workGroupsMissingNormRecords,
    templates_with_real_norm_sources_count: templatesWithRealNormRows.length,
    templates_with_real_norm_sources_sample: templatesWithRealNormRows.slice(0, 50),
    templates_with_only_structural_norm_binding_count: templatesWithOnlySyntheticRows.length,
    templates_with_only_structural_norm_binding_sample: templatesWithOnlySyntheticRows.slice(0, 50),
    template_source_quality_rows: templateSourceQualityRows,
    templates_with_official_or_curated_by_raw_source_label_count: templatesWithOfficialOrCuratedByRawSourceLabel,
    generic_family_duplicates_count: [...familyStats.values()].filter((value) => value.workKeys.size > 1).length,
    generic_family_duplicate_samples: [...familyStats.entries()]
      .filter(([, value]) => value.workKeys.size > 1)
      .slice(0, 50)
      .map(([key, value]) => ({
        family_key: key,
        norm_records_count: value.count,
        work_types_count: value.workKeys.size,
        sample_work_types: [...value.workKeys].slice(0, 10),
      })),
    all_10000_template_norm_bindings_certified: certification.templates_failed_count === 0,
    templates_certified_count: certification.templates_certified_count,
    templates_failed_count: certification.templates_failed_count,
    all_10000_templates_extended_validation_passed: extendedValidation.all_10000_templates_extended_validation_passed,
    templates_validated_count: extendedValidation.templates_validated_count,
    rows_validated_count: extendedValidation.rows_validated_count,
    all_rows_have_norm_id: certification.all_compiled_rows_have_norm_id,
    all_rows_have_norm_source_id: certification.all_compiled_rows_have_norm_source,
    all_rows_have_norm_version: certification.all_compiled_rows_have_norm_version,
    all_rows_have_formula_inputs: snapshot.items.every((item) => item.formula_inputs.length > 0),
    formula_engine_reads_norm_records: formulaEngineReadsNormRecords,
    ...hardcoded,
    ...golden100,
    random_deep_inspection_done: randomAudit.random_deep_inspection_done,
    random_templates_checked_count: randomAudit.random_templates_checked_count,
    all_random_templates_have_norm_trace: randomAudit.all_random_templates_have_norm_trace,
    all_random_templates_have_real_norm_trace: randomAudit.all_random_templates_have_real_norm_trace,
    all_random_templates_generate_professional_boq: randomAudit.all_random_templates_generate_professional_boq,
    all_random_templates_have_correct_units: randomAudit.all_random_templates_have_correct_units,
    random_deep_inspection_samples: randomAudit.samples,
    web_norm_knowledge_smoke_passed: smoke.web_norm_knowledge_smoke_passed,
    web_norm_sources_visible: smoke.web_norm_sources_visible,
    director_pdf_contains_norm_sources: smoke.director_pdf_contains_norm_sources,
    buyer_boq_contains_norm_trace: smoke.buyer_boq_contains_norm_trace,
    smoke_cases_checked: smoke.smoke_cases_checked,
    smoke_execution_mode: smoke.smoke_execution_mode,
    browser_automation_started: smoke.browser_automation_started,
    smoke_failures: smoke.failures,
    reason: finalStatus === GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS
      ? "norm_source_quality_audit_green"
      : structuralReasons.join("; "),
    next_required_action: finalStatus === GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS
      ? "none"
      : "replace_generic_norms_with_sourced_professional_norms",
    ...sourceGates,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };

  writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    final_status: summary.final_status,
    source_commit: summary.source_commit,
    branch: summary.branch,
    upstream_sync: summary.upstream_sync,
    runtime_summary_path: summary.runtime_summary_path,
    template_count: summary.template_count,
    norm_records_count: summary.norm_records_count,
    work_groups_count: summary.work_groups_count,
    active_work_groups_count: summary.active_work_groups_count,
    official_public_sources_count: summary.official_public_sources_count,
    manufacturer_technical_cards_count: summary.manufacturer_technical_cards_count,
    internal_curated_sources_count: summary.internal_curated_sources_count,
    manual_review_required_count: summary.manual_review_required_count,
    synthetic_family_default_count: summary.synthetic_family_default_count,
    unknown_source_count: summary.unknown_source_count,
    ai_source_count: summary.ai_source_count,
    templates_with_official_or_curated_norms: summary.templates_with_official_or_curated_norms,
    templates_with_only_synthetic_norms: summary.templates_with_only_synthetic_norms,
    templates_with_missing_source: summary.templates_with_missing_source,
    professional_source_coverage: summary.professional_source_coverage,
    golden_100_cases_passed: summary.golden_100_cases_passed,
    random_deep_inspection_done: summary.random_deep_inspection_done,
    random_templates_checked_count: summary.random_templates_checked_count,
    formula_engine_reads_norm_records: summary.formula_engine_reads_norm_records,
    real_hardcoded_production_rate_count: summary.real_hardcoded_production_rate_count,
    web_norm_sources_visible: summary.web_norm_sources_visible,
    director_pdf_contains_norm_sources: summary.director_pdf_contains_norm_sources,
    buyer_boq_contains_norm_trace: summary.buyer_boq_contains_norm_trace,
    typecheck_passed: summary.typecheck_passed,
    lint_passed: summary.lint_passed,
    diff_check_passed: summary.diff_check_passed,
    no_test_weakening_passed: summary.no_test_weakening_passed,
    web_public_smoke_passed: summary.web_public_smoke_passed,
    secret_scan_passed: summary.secret_scan_passed,
    fake_green_claimed: summary.fake_green_claimed,
    reason: summary.reason,
    next_required_action: summary.next_required_action,
  }, null, 2));

  if (summary.final_status !== GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS) {
    process.exitCode = 1;
  }
}

main();
