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
const SUMMARY_SOURCES = [
  "data/estimate-golden-cases/extended-100-work-cases.json",
  "scripts/estimate/extendedProfessionalCertificationCore.ts",
  "src/lib/ai/builtInAi/builtInAiToolRegistry.ts",
  "src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector.ts",
];
const TEMPLATE_SOURCES = [
  "src/lib/ai/estimateTemplate10000/productionTemplateExtendedValidation.ts",
  "src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts",
  "src/lib/ai/estimateTemplate10000/productionTemplateBoqValidation.ts",
  "src/lib/ai/estimateTemplate10000/productionTemplatePricingValidation.ts",
];

function cacheIsFresh(filePath: string, sources: readonly string[]): boolean {
  if (!existsSync(filePath)) return false;
  const cacheMtime = statSync(filePath).mtimeMs;
  return sources.every((source) => existsSync(source) && statSync(source).mtimeMs <= cacheMtime);
}

function readJsonCache<T>(filePath: string, sources: readonly string[]): T | null {
  if (!existsSync(filePath) || !cacheIsFresh(filePath, sources)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
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
    cachedSummary = readJsonCache<ExtendedProfessionalCertificationSummary>(SUMMARY_CACHE, SUMMARY_SOURCES);
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
    if (summary.template_extended_validation) {
      cachedTemplates = summary.template_extended_validation;
      return cachedTemplates;
    }
    cachedTemplates = readJsonCache<ProductionTemplateExtendedValidationSummary>(TEMPLATE_CACHE, TEMPLATE_SOURCES);
    if (!cachedTemplates) {
      cachedTemplates = validateAllProductionTemplatesExtended10000();
      writeJsonCache(TEMPLATE_CACHE, cachedTemplates);
    }
  }
  expect(cachedTemplates.final_status).toBe(GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS);
  return cachedTemplates;
}
