import {
  PROFESSIONAL_GROUP_DISTRIBUTION_1500,
  PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG,
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  bindProfessionalRecipeRowToCatalog,
  buildProfessionalEstimateSnapshot,
  calculateProfessionalRecipeRowQuantity,
  countInternalKeysVisible,
  countMojibakeVisible,
  forbiddenGenericMaterialLabels,
} from "../../src/lib/ai/professionalEstimateTemplates";
import type {
  ProfessionalEstimate1500Case,
  ProfessionalEstimateSnapshot,
} from "../../src/lib/ai/professionalEstimateTemplates";
import {
  buildProfessionalDeepGolden300Cases,
  buildProfessionalEstimate1500Cases,
  runProfessionalEstimateDeepGolden300Audit,
  runProfessionalEstimateMaterialFormulaAudit,
  runProfessionalEstimatePricebookAudit,
  runProfessionalEstimateRegionalCurrencyAudit,
  runProfessionalEstimateSnapshotNoDesyncAudit,
  runProfessionalEstimateTemplateCoverageAudit,
} from "../../scripts/e2e/professionalEstimate1500WorkCases";

let cachedCases: ProfessionalEstimate1500Case[] | null = null;
let cachedSnapshots: ProfessionalEstimateSnapshot[] | null = null;

export function professionalCases(): ProfessionalEstimate1500Case[] {
  cachedCases ??= buildProfessionalEstimate1500Cases();
  return cachedCases;
}

export function professionalSnapshots(): ProfessionalEstimateSnapshot[] {
  cachedSnapshots ??= professionalCases().slice(0, 150).map((item) =>
    buildProfessionalEstimateSnapshot({
      selected_work_key: item.expected_canonical_work_key ?? "",
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
    })
  );
  return cachedSnapshots;
}

export function professionalCoverage() {
  return runProfessionalEstimateTemplateCoverageAudit();
}

export function professionalGolden() {
  return runProfessionalEstimateDeepGolden300Audit();
}

export function professionalFormulaAudit() {
  return runProfessionalEstimateMaterialFormulaAudit();
}

export function professionalPricebookAudit() {
  return runProfessionalEstimatePricebookAudit();
}

export function professionalCurrencyAudit() {
  return runProfessionalEstimateRegionalCurrencyAudit();
}

export function professionalSnapshotAudit() {
  return runProfessionalEstimateSnapshotNoDesyncAudit();
}

export {
  PROFESSIONAL_GROUP_DISTRIBUTION_1500,
  PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG,
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  bindProfessionalRecipeRowToCatalog,
  buildProfessionalDeepGolden300Cases,
  buildProfessionalEstimateSnapshot,
  calculateProfessionalRecipeRowQuantity,
  countInternalKeysVisible,
  countMojibakeVisible,
  forbiddenGenericMaterialLabels,
};
