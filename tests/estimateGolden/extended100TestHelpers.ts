import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS,
  loadExtended100WorkCases,
  runExtendedProfessionalCertification,
  type ExtendedProfessionalCertificationSummary,
} from "../../scripts/estimate/extendedProfessionalCertificationCore";
import {
  GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS,
  validateAllProductionTemplatesExtended10000,
  type ProductionTemplateExtendedValidationSummary,
} from "../../src/lib/ai/estimateTemplate10000";

let cachedSummary: ExtendedProfessionalCertificationSummary | null = null;
let cachedTemplates: ProductionTemplateExtendedValidationSummary | null = null;

const CACHE_DIR = path.join(".release-runtime", "ai-estimate-extended-100-cases", "jest-cache");
const SUMMARY_CACHE = path.join(CACHE_DIR, "extended-100-summary.json");
const TEMPLATE_CACHE = path.join(CACHE_DIR, "extended-10000-template-summary.json");
const EXPECTED_EXTENDED_10000_TEMPLATE_COUNT = 10000;
const EXPECTED_EXTENDED_10000_ROWS_VALIDATED = 369000;
export const EXTENDED_10000_TEMPLATE_CACHE_SOURCES = [
  "src/lib/ai/estimateTemplate10000/index.ts",
  "src/lib/ai/estimateTemplate10000/productionTemplateExtendedValidation.ts",
  "src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts",
  "src/lib/ai/estimateTemplate10000/productionTemplateBoqValidation.ts",
  "src/lib/ai/estimateTemplate10000/productionTemplatePricingValidation.ts",
  "src/lib/ai/estimateTemplate10000/productionNormKnowledgeBaseCore.ts",
] as const;
export const EXTENDED_100_SUMMARY_CACHE_SOURCES = [
  "data/estimate-golden-cases/extended-100-work-cases.json",
  "scripts/estimate/extendedProfessionalCertificationCore.ts",
  "src/lib/ai/builtInAi/builtInAiToolRegistry.ts",
  "src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector.ts",
  "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts",
  "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
  "src/lib/consumerRequests/consumerRequestPdfService.ts",
  "src/lib/consumerRequests/consumerRequestService.ts",
  "src/lib/estimateStructuredPipeline/buildStructuredEstimatePayload.ts",
  "src/lib/projectExecution/buildProjectExecutionDraftFromEstimate.ts",
  "src/features/consumerRepair/requestEstimateViewModel.ts",
  ...EXTENDED_10000_TEMPLATE_CACHE_SOURCES,
] as const;

function cacheIsFresh(filePath: string, sources: readonly string[]): boolean {
  if (!existsSync(filePath)) return false;
  const cacheMtime = statSync(filePath).mtimeMs;
  return sources.every((source) => existsSync(source) && statSync(source).mtimeMs <= cacheMtime);
}

function readJsonCache<T>(filePath: string, sources: readonly string[]): T | null {
  if (!existsSync(filePath) || !cacheIsFresh(filePath, sources)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJsonCache(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function extended100Cases() {
  return loadExtended100WorkCases(100);
}

export function extended100CertificationSummary(): ExtendedProfessionalCertificationSummary {
  if (!cachedSummary) {
    cachedSummary = readJsonCache<ExtendedProfessionalCertificationSummary>(SUMMARY_CACHE, EXTENDED_100_SUMMARY_CACHE_SOURCES);
    if (cachedSummary && !isFullCertificationSummaryCacheValid(cachedSummary)) {
      cachedSummary = null;
    }
    if (!cachedSummary) {
      cachedSummary = runExtendedProfessionalCertification({
        casesLimit: 100,
        fullLifecycleLimit: 20,
        promptParsingLimit: 100,
        includeAllTemplates: true,
        smokeTarget: "headless",
        writeSummary: false,
      });
      writeJsonCache(SUMMARY_CACHE, cachedSummary);
    }
  }
  expect(cachedSummary.final_status).toBe(GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS);
  return cachedSummary;
}

export function extended10000TemplateSummary(): ProductionTemplateExtendedValidationSummary {
  if (!cachedTemplates) {
    const summary = extended100CertificationSummary();
    if (summary.template_extended_validation && isExtended10000TemplateSummaryCacheValid(summary.template_extended_validation)) {
      cachedTemplates = summary.template_extended_validation;
      return cachedTemplates;
    }
    cachedTemplates = readJsonCache<ProductionTemplateExtendedValidationSummary>(TEMPLATE_CACHE, EXTENDED_10000_TEMPLATE_CACHE_SOURCES);
    if (cachedTemplates && !isExtended10000TemplateSummaryCacheValid(cachedTemplates)) {
      cachedTemplates = null;
    }
    if (!cachedTemplates) {
      cachedTemplates = validateAllProductionTemplatesExtended10000();
      writeJsonCache(TEMPLATE_CACHE, cachedTemplates);
    }
  }
  expect(cachedTemplates.final_status).toBe(GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS);
  return cachedTemplates;
}

function isFullCertificationSummaryCacheValid(summary: ExtendedProfessionalCertificationSummary): boolean {
  return summary.final_status === GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS &&
    summary.certification_scope === "full_100_cases_plus_10000_templates" &&
    summary.full_certification_green === true &&
    summary.smoke_only_green === false &&
    summary.all_10000_templates_extended_validation_executed === true &&
    summary.all_10000_templates_extended_validation_passed === true &&
    summary.templates_validated_count === EXPECTED_EXTENDED_10000_TEMPLATE_COUNT &&
    summary.rows_validated_count === EXPECTED_EXTENDED_10000_ROWS_VALIDATED &&
    Boolean(summary.template_extended_validation) &&
    isExtended10000TemplateSummaryCacheValid(summary.template_extended_validation);
}

export function isExtended10000TemplateSummaryCacheValid(summary: ProductionTemplateExtendedValidationSummary | undefined): boolean {
  if (!summary) return false;
  const requiredTrueFlags: readonly (keyof ProductionTemplateExtendedValidationSummary)[] = [
    "all_10000_templates_extended_validation_passed",
    "all_10000_templates_boq_validation_passed",
    "all_10000_templates_pricing_validation_passed",
    "all_templates_have_material_rows",
    "all_templates_have_labor_rows",
    "all_templates_have_equipment_or_service_rows",
    "all_templates_have_logistics_or_waste_rows",
    "all_templates_have_formula_trace",
    "all_templates_have_norm_trace",
    "all_templates_have_template_version",
    "all_templates_have_source_parameters",
    "all_templates_have_procurement_flags",
    "all_templates_have_valid_units",
    "all_templates_have_positive_quantities",
    "all_templates_have_honest_missing_price",
    "no_templates_generate_fake_area_multiplier",
    "no_templates_generate_fake_default_980_price",
    "no_templates_generate_zero_amount_when_price_missing",
    "no_templates_generate_same_total_fake_cluster",
    "material_work_service_equipment_lines_separated",
    "price_sources_separated_from_norm_sources",
  ];
  return summary.final_status === GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS &&
    summary.template_count === EXPECTED_EXTENDED_10000_TEMPLATE_COUNT &&
    summary.templates_validated_count === EXPECTED_EXTENDED_10000_TEMPLATE_COUNT &&
    summary.templates_failed_count === 0 &&
    summary.rows_validated_count === EXPECTED_EXTENDED_10000_ROWS_VALIDATED &&
    summary.failures.length === 0 &&
    summary.production_db_touched === false &&
    summary.destructive_migration_run === false &&
    summary.native_build_started === false &&
    summary.eas_started === false &&
    summary.release_started === false &&
    summary.full_jest_started === false &&
    summary.fake_green_claimed === false &&
    requiredTrueFlags.every((flag) => summary[flag] === true);
}
