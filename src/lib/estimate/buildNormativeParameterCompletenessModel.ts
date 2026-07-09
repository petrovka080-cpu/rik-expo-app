import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
} from "./estimateDraftRevisionContract";
import {
  buildAiEstimateNormativeWorkParameterPassport,
  type AiEstimateNormativeParameterRequirement,
  type AiEstimateNormativeWorkParameterPassport,
} from "./aiEstimateNormativeWorkParameterPassport";
import { isAiEstimateTechnicalHiddenParam } from "./aiEstimateRuParameterDictionary";

export type AiEstimateNormativeParameterState =
  | "filled"
  | "missing"
  | "derived"
  | "catalog_default";

export type AiEstimateNormativeCompletenessItem = {
  requirement: AiEstimateNormativeParameterRequirement;
  state: AiEstimateNormativeParameterState;
  param: EstimateDraftRevisionParam | null;
};

export type AiEstimateNormativeParameterCompletenessModel = {
  revisionId: string;
  selectedTemplateId: string;
  passport: AiEstimateNormativeWorkParameterPassport;
  totalRequirements: number;
  filledRequirements: AiEstimateNormativeCompletenessItem[];
  missingRequirements: AiEstimateNormativeCompletenessItem[];
  derivedRequirements: AiEstimateNormativeCompletenessItem[];
  catalogDefaultRequirements: AiEstimateNormativeCompletenessItem[];
  requiredQuantityMissing: AiEstimateNormativeCompletenessItem[];
  requiredProfessionalMissing: AiEstimateNormativeCompletenessItem[];
  visibleMissingQuestionLimit: 5;
  preliminaryEstimateAllowed: true;
  professionalPromptRu: string;
};

function hasMeaningfulValue(param: EstimateDraftRevisionParam | null | undefined): param is EstimateDraftRevisionParam {
  if (!param) return false;
  if (param.value == null) return false;
  if (typeof param.value === "string" && param.value.trim() === "") return false;
  return true;
}

function classifyItem(
  requirement: AiEstimateNormativeParameterRequirement,
  param: EstimateDraftRevisionParam | null,
): AiEstimateNormativeCompletenessItem {
  if (!hasMeaningfulValue(param)) return { requirement, state: "missing", param: null };
  if (param.source === "derived") return { requirement, state: "derived", param };
  if (param.source === "default_assumption") return { requirement, state: "catalog_default", param };
  return { requirement, state: "filled", param };
}

export function buildNormativeParameterCompletenessModel(
  revision: EstimateDraftRevision | null | undefined,
): AiEstimateNormativeParameterCompletenessModel | null {
  if (!revision?.selectedTemplateId) return null;
  const passport = buildAiEstimateNormativeWorkParameterPassport(revision.selectedTemplateId);
  if (!passport) return null;
  const items = passport.requirements
    .filter((requirement) => !isAiEstimateTechnicalHiddenParam(requirement.key))
    .map((requirement) => classifyItem(requirement, revision.params[requirement.key] ?? null));
  const missingRequirements = items.filter((item) => item.state === "missing");
  return {
    revisionId: revision.revisionId,
    selectedTemplateId: revision.selectedTemplateId,
    passport,
    totalRequirements: items.length,
    filledRequirements: items.filter((item) => item.state === "filled"),
    missingRequirements,
    derivedRequirements: items.filter((item) => item.state === "derived"),
    catalogDefaultRequirements: items.filter((item) => item.state === "catalog_default"),
    requiredQuantityMissing: missingRequirements.filter((item) => item.requirement.role === "required_for_quantity"),
    requiredProfessionalMissing: missingRequirements.filter((item) => item.requirement.role === "required_for_professional_accuracy"),
    visibleMissingQuestionLimit: 5,
    preliminaryEstimateAllowed: true,
    professionalPromptRu:
      "Для полной профессиональной сметы уточните недостающие размеры, спецификацию материалов, условия площадки и проектные данные.",
  };
}
