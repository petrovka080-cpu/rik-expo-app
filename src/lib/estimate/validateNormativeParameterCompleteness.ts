import {
  clearAiEstimateNormativeWorkParameterPassportCache,
  listAiEstimateNormativeWorkParameterPassportTemplateIds,
  buildAiEstimateNormativeWorkParameterPassport,
  type AiEstimateNormativeWorkParameterPassport,
} from "./aiEstimateNormativeWorkParameterPassport";
import type { AiEstimateNormativeWorkFamily } from "./aiEstimateNormativeParameterFamilies";
import { containsForbiddenAiEstimateVisibleToken } from "./aiEstimateRuParameterDictionary";

export type NormativeParameterCompletenessValidationResult = {
  ok: boolean;
  catalogTotalTemplates: number;
  normativePassportCoverage: string;
  requirementsTotal: number;
  requirementsConnectedToRows: number;
  requirementsWithVisibleQuestions: number;
  requirementsWithNormativeBasis: number;
  templatesWithQuantityRequirements: number;
  templatesWithProfessionalAccuracyRequirements: number;
  workFamilyCoverage: Record<AiEstimateNormativeWorkFamily, number>;
  criticalFamilyCoverage: Record<string, boolean>;
  genericOnlyTemplateCount: number;
  blockingReasons: string[];
};

const CRITICAL_FAMILIES: AiEstimateNormativeWorkFamily[] = [
  "apartment_repair",
  "road",
  "water_supply",
  "sewerage",
  "power_line",
  "substation",
  "facade",
  "roof",
  "concrete",
  "earthworks",
  "demolition",
  "glazing",
  "heating",
  "ventilation",
  "electrical",
  "plumbing",
  "industrial_equipment",
];

function emptyFamilyCoverage(): Record<AiEstimateNormativeWorkFamily, number> {
  return {
    apartment_repair: 0,
    road: 0,
    water_supply: 0,
    sewerage: 0,
    power_line: 0,
    substation: 0,
    facade: 0,
    roof: 0,
    drilling: 0,
    fence: 0,
    dam: 0,
    concrete: 0,
    earthworks: 0,
    demolition: 0,
    glazing: 0,
    heating: 0,
    ventilation: 0,
    electrical: 0,
    plumbing: 0,
    industrial_equipment: 0,
    mep: 0,
    other: 0,
  };
}

function isVisibleQuestion(passport: AiEstimateNormativeWorkParameterPassport, key: string, text: string): boolean {
  return Boolean(text.trim()) &&
    !text.includes(key) &&
    !containsForbiddenAiEstimateVisibleToken(text) &&
    !/\b[a-z][a-z0-9]+_[a-z0-9_]+\b/i.test(text) &&
    Boolean(passport.templateNameRu);
}

function isGenericOnly(passport: AiEstimateNormativeWorkParameterPassport): boolean {
  const genericKeys = new Set(["q", "material_specification", "site_access"]);
  return passport.requirements.length <= 3 &&
    passport.requirements.every((requirement) => genericKeys.has(requirement.key));
}

export function validateNormativeParameterCompleteness(input: {
  templateIds?: readonly string[];
} = {}): NormativeParameterCompletenessValidationResult {
  const ids = [...(input.templateIds ?? listAiEstimateNormativeWorkParameterPassportTemplateIds())];
  let passportsBuilt = 0;
  let requirementsTotal = 0;
  let requirementsConnectedToRows = 0;
  let requirementsWithVisibleQuestions = 0;
  let requirementsWithNormativeBasis = 0;
  let templatesWithQuantityRequirements = 0;
  let templatesWithProfessionalAccuracyRequirements = 0;
  let genericOnlyTemplateCount = 0;
  const workFamilyCoverage = emptyFamilyCoverage();
  const failures: string[] = [];

  for (const [index, templateId] of ids.entries()) {
    const passport = buildAiEstimateNormativeWorkParameterPassport(templateId);
    if (!passport) {
      failures.push(`${templateId}:normative_passport_missing`);
      continue;
    }
    passportsBuilt += 1;
    workFamilyCoverage[passport.workFamily] += 1;
    if (passport.requiredForQuantity.length > 0) templatesWithQuantityRequirements += 1;
    if (passport.requiredForProfessionalAccuracy.length > 0) templatesWithProfessionalAccuracyRequirements += 1;
    if (isGenericOnly(passport)) genericOnlyTemplateCount += 1;
    if (passport.requirements.length === 0) failures.push(`${templateId}:requirements_empty`);
    if (passport.requiredForQuantity.length === 0) failures.push(`${templateId}:required_quantity_params_empty`);

    for (const requirement of passport.requirements) {
      requirementsTotal += 1;
      if (requirement.affectsRowIds.length > 0) {
        requirementsConnectedToRows += 1;
      } else {
        failures.push(`${templateId}:${requirement.key}:not_connected_to_rows`);
      }
      if (isVisibleQuestion(passport, requirement.key, requirement.userQuestionRu)) {
        requirementsWithVisibleQuestions += 1;
      } else {
        failures.push(`${templateId}:${requirement.key}:question_not_visible_ru`);
      }
      if (requirement.normativeBasisRu.trim() && requirement.sourceRegistryIds.length > 0) {
        requirementsWithNormativeBasis += 1;
      } else {
        failures.push(`${templateId}:${requirement.key}:normative_basis_missing`);
      }
    }

    if (index > 0 && index % 250 === 0) clearAiEstimateNormativeWorkParameterPassportCache();
  }
  clearAiEstimateNormativeWorkParameterPassportCache();

  const criticalFamilyCoverage = Object.fromEntries(
    CRITICAL_FAMILIES.map((family) => [family, workFamilyCoverage[family] > 0]),
  );
  const blockingReasons = [
    ids.length === 11610 ? "" : `catalog_total_templates:${ids.length}`,
    passportsBuilt === ids.length ? "" : `normative_passport_coverage:${passportsBuilt}/${ids.length}`,
    requirementsTotal > 0 ? "" : "requirements_total_empty",
    requirementsConnectedToRows === requirementsTotal ? "" : `requirements_connected_to_rows:${requirementsConnectedToRows}/${requirementsTotal}`,
    requirementsWithVisibleQuestions === requirementsTotal ? "" : `requirements_with_visible_questions:${requirementsWithVisibleQuestions}/${requirementsTotal}`,
    requirementsWithNormativeBasis === requirementsTotal ? "" : `requirements_with_normative_basis:${requirementsWithNormativeBasis}/${requirementsTotal}`,
    templatesWithQuantityRequirements === ids.length ? "" : `templates_with_quantity_requirements:${templatesWithQuantityRequirements}/${ids.length}`,
    templatesWithProfessionalAccuracyRequirements === ids.length ? "" : `templates_with_professional_accuracy_requirements:${templatesWithProfessionalAccuracyRequirements}/${ids.length}`,
    genericOnlyTemplateCount === 0 ? "" : `generic_only_template_count:${genericOnlyTemplateCount}`,
    ...Object.entries(criticalFamilyCoverage)
      .filter(([, covered]) => !covered)
      .map(([family]) => `critical_family_missing:${family}`),
    ...failures.slice(0, 200),
  ].filter(Boolean);

  return {
    ok: blockingReasons.length === 0,
    catalogTotalTemplates: ids.length,
    normativePassportCoverage: `${passportsBuilt}/${ids.length}`,
    requirementsTotal,
    requirementsConnectedToRows,
    requirementsWithVisibleQuestions,
    requirementsWithNormativeBasis,
    templatesWithQuantityRequirements,
    templatesWithProfessionalAccuracyRequirements,
    workFamilyCoverage,
    criticalFamilyCoverage,
    genericOnlyTemplateCount,
    blockingReasons,
  };
}
