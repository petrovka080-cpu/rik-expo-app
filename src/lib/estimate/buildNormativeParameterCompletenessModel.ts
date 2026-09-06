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
import { aiEstimateRuUnitForParameter } from "./aiEstimateRuParameterDictionary";
import { classifyAiEstimateNormativeWorkFamilyFromText } from "./aiEstimateNormativeParameterFamilies";
import { PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1 } from "./v4/domains/professionalDomainVisibleBaselineV1";

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

function professionalDomainPassport(
  revision: EstimateDraftRevision,
): AiEstimateNormativeWorkParameterPassport | null {
  const source = revision.boq.rows.find(
    (row) => row.sourceParameters?.professionalDomainFactoryV1 === true,
  )?.sourceParameters;
  if (!source) return null;
  const catalogId = typeof source.catalogId === "string" ? source.catalogId : "";
  const workKey = typeof source.workKey === "string" ? source.workKey : "";
  const requestedCatalogWorkId = typeof source.requestedCatalogWorkId === "string" ? source.requestedCatalogWorkId : "";
  const professionalEstimatePassportId = typeof source.professionalEstimatePassportId === "string"
    ? source.professionalEstimatePassportId
    : "";
  const parameterSchemaId = typeof source.parameterSchemaId === "string" ? source.parameterSchemaId : "";
  const canonicalTechnologyId = typeof source.canonicalTechnologyId === "string" ? source.canonicalTechnologyId : "";
  const projectAssemblyId = typeof source.projectAssemblyId === "string" ? source.projectAssemblyId : "";
  const baselineVersion = typeof source.professionalDomainVisibleBaselineVersion === "string"
    ? source.professionalDomainVisibleBaselineVersion
    : "";
  const declaredParameterKeys = Array.isArray(source.parameterKeys)
    ? source.parameterKeys.filter((key): key is string => typeof key === "string" && key.trim().length > 0)
    : [];
  const exactIdentity = Boolean(
    workKey && requestedCatalogWorkId === workKey &&
    (catalogId === workKey || catalogId === `expanded-template:${workKey}`) &&
    professionalEstimatePassportId && professionalEstimatePassportId === revision.selectedTemplateId &&
    revision.resolvedIdentity?.passportId === professionalEstimatePassportId &&
    canonicalTechnologyId && projectAssemblyId && parameterSchemaId &&
    parameterSchemaId === revision.workSpecificParameterSchemaId &&
    parameterSchemaId === revision.resolvedIdentity?.parameterSchemaId &&
    revision.resolvedIdentity?.requestedCatalogWorkId === requestedCatalogWorkId &&
    revision.resolvedIdentity?.legacyFallbackUsed === false &&
    revision.legacyRowsCount === 0 &&
    baselineVersion === PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1,
  );
  if (!exactIdentity) return null;
  const metadata = source.professionalDomainParameterMetadata &&
    typeof source.professionalDomainParameterMetadata === "object" &&
    !Array.isArray(source.professionalDomainParameterMetadata)
    ? source.professionalDomainParameterMetadata as Record<string, Record<string, unknown>>
    : {};
  const workSpecificParameterSignature = revision.workSpecificParameterSignature ?? [];
  const parameterKeys = workSpecificParameterSignature.filter((key) => key in metadata);
  if (
    parameterKeys.length === 0 ||
    parameterKeys.length !== workSpecificParameterSignature.length ||
    declaredParameterKeys.length !== parameterKeys.length ||
    declaredParameterKeys.some((key, index) => key !== parameterKeys[index])
  ) return null;
  const traceByKey = new Map(revision.trace.params.map((item) => [item.key, item]));
  const rowsById = new Map(revision.boq.rows.map((row) => [row.rowId, row]));
  const familyText = [revision.professionalWorkId, revision.matchedFamily, revision.selectedTemplateId].filter(Boolean).join(" ");
  const workFamily = classifyAiEstimateNormativeWorkFamilyFromText(familyText);
  const sourceRegistryIds = [...new Set(revision.boq.rows.flatMap((row) => {
    const ids = [
      row.sourceParameters?.normativeSourceIds,
      row.sourceParameters?.applicableSourceIds,
    ].flatMap((value) => Array.isArray(value) ? value : []);
    return [
      ...ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
      ...(typeof row.normSourceId === "string" && row.normSourceId.trim() ? [row.normSourceId] : []),
    ];
  }))];
  if (sourceRegistryIds.length === 0) return null;
  const requirements: AiEstimateNormativeParameterRequirement[] = parameterKeys.map((key, index) => {
    const item = metadata[key] ?? {};
    const affectsRowIds = traceByKey.get(key)?.affectsRowIds ?? [];
    const declaredFormulaConsumers = Array.isArray(item.formulaConsumers)
      ? item.formulaConsumers.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const sourceOwnership = Array.isArray(item.sourceOwnership)
      ? item.sourceOwnership.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const requiredFor = item.requiredFor === "contract_ready" || item.requiredFor === "safety_review"
      ? item.requiredFor
      : "better_accuracy";
    const role: AiEstimateNormativeParameterRequirement["role"] = affectsRowIds.length > 0
      ? "required_for_quantity"
      : requiredFor === "contract_ready"
        ? "required_for_professional_accuracy"
        : "optional_accuracy_improver";
    const inputKind = item.inputKind === "number" || item.inputKind === "boolean" || item.inputKind === "select"
      ? item.inputKind
      : "text";
    const labelRu = typeof item.labelRu === "string" && item.labelRu.trim() ? item.labelRu.trim() : key;
    const unit = typeof item.unit === "string" && item.unit.trim() ? item.unit.trim() : null;
    return {
      key,
      labelRu,
      unit,
      unitRu: aiEstimateRuUnitForParameter(key, unit),
      role,
      requiredFor,
      inputKind,
      source: affectsRowIds.length > 0 ? "formula_dependency" : requiredFor === "contract_ready" ? "passport_required" : "passport_optional",
      family: workFamily,
      affectsRowIds,
      affectsRowTitlesRu: affectsRowIds.map((rowId) => rowsById.get(rowId)?.titleRu).filter((title): title is string => Boolean(title)),
      formulaRefs: [...new Set([
        ...declaredFormulaConsumers,
        ...affectsRowIds.map((rowId) => rowsById.get(rowId)?.quantityFormula).filter((formula): formula is string => Boolean(formula)),
      ])],
      userQuestionRu: `Уточните «${labelRu}», чтобы заменить видимое предварительное допущение фактическим значением.`,
      missingReasonRu: role === "required_for_quantity"
        ? "Параметр влияет на количество одной или нескольких строк сметы."
        : "Параметр нужен для уточнения профессиональной сметы.",
      normativeBasisRu: `Индивидуальная canonical parameter schema зарегистрированного профессионального домена; владельцы источника: ${sourceOwnership.join(", ")}.`,
      sourceRegistryIds,
      priority: role === "required_for_quantity" ? 10 + index / 10_000 : role === "required_for_professional_accuracy" ? 30 + index / 10_000 : 60 + index / 10_000,
    };
  });
  if (
    requirements.every((item) => item.affectsRowIds.length === 0) ||
    requirements.some((item) => !item.normativeBasisRu.trim() || item.sourceRegistryIds.length === 0)
  ) return null;
  return {
    templateId: revision.selectedTemplateId,
    templateNameRu: (revision.professionalWorkId ?? revision.matchedFamily).replace(/_/g, " "),
    familyId: revision.professionalWorkId ?? revision.matchedFamily,
    workFamily,
    catalogTotalTemplates: 11_610,
    rowCount: revision.boq.rows.length,
    sourceQuality: "source_backed",
    requirements,
    requiredForQuantity: requirements.filter((item) => item.role === "required_for_quantity"),
    requiredForProfessionalAccuracy: requirements.filter((item) => item.role === "required_for_professional_accuracy"),
    optionalAccuracyImprovers: requirements.filter((item) => item.role === "optional_accuracy_improver"),
  };
}

export function buildNormativeParameterCompletenessModel(
  revision: EstimateDraftRevision | null | undefined,
): AiEstimateNormativeParameterCompletenessModel | null {
  if (!revision?.selectedTemplateId) return null;
  if (revision.boq.rows.some((row) => row.sourceParameters?.roadworksWaveA === true)) return null;
  const passport = professionalDomainPassport(revision) ??
    buildAiEstimateNormativeWorkParameterPassport(revision.selectedTemplateId);
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
