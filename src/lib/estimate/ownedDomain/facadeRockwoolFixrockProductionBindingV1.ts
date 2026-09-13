import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
  ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID,
  ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS,
  ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
  ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  facade_insulation_area_m2: "Укажите чистую площадь фасадной теплоизоляции Fixrock, м².",
  fixing_variant: "Подтвердите обычный вариант крепления плит отдельными держателями.",
  conventional_holder_fixing_confirmed: "Подтвердите применение обычного крепления держателями для VHF.",
  adhesive_variant_excluded: "Подтвердите, что отдельный клеевой вариант исключён.",
  one_dowel_variant_excluded: "Подтвердите, что вариант одного дюбеля на плиту исключён.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

export function extractRockwoolFixrockCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/(?:rockwool\s+)?fixrock/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID,
  };
  const areaMatch = text.match(
    /(?:чист[а-яё]*\s+)?площад[ьи]\s+(?:фасадн[а-яё]*\s+)?теплоизоляци[ия]\s+fixrock\D{0,14}(\d+(?:[.,]\d+)?)\s*(?:м2|м²|sqm)/iu,
  );
  if (areaMatch?.[1]) {
    const area = decimal(areaMatch[1]);
    if (area !== null && area > 0) result.facade_insulation_area_m2 = area;
  }
  if (/вариант\s+креплени[яе]\s*[:=]\s*обычн[а-яё]*\s+держател/iu.test(text)) {
    result.fixing_variant = "CONVENTIONAL_INSULATION_HOLDER";
  }
  if (/обычн[а-яё]*\s+креплени[ея]\s+держател[а-яё]*\s+(?:для\s+vhf\s+)?подтвержден/iu.test(text)) {
    result.conventional_holder_fixing_confirmed = true;
  }
  if (/клеев[а-яё]*\s+вариант\s+исключ[её]н/iu.test(text)) {
    result.adhesive_variant_excluded = true;
  }
  if (/вариант\s+одн[а-яё]*\s+дюбел[а-яё]*\s+на\s+плит[а-яё]*\s+исключ[её]н/iu.test(text)) {
    result.one_dowel_variant_excluded = true;
  }
  return Object.freeze(result);
}

export function rockwoolFixrockMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (
    canonicalParameters?.product_profile_id !==
    ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID
  ) return [];
  return ROCKWOOL_FIXROCK_CONVENTIONAL_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => canonicalParameters[parameterId] == null)
    .map((parameterId) => PARAMETER_QUESTIONS_RU[parameterId] ?? parameterId);
}

function explicitParameterValues(
  canonicalParameters: Readonly<Record<string, Primitive>>,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(canonicalParameters).map(([parameterId, value]) => [
    parameterId,
    {
      value,
      unit_id: parameterId.endsWith("_m2") ? "m2" : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-facade-prompt:${parameterId}`,
      captured_at: "consumer-facade-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the exact ROCKWOOL Fixrock request.",
    },
  ]));
}

export function applyRockwoolFixrockPhysicalNormToFacadeBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== ROCKWOOL_FIXROCK_CONVENTIONAL_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "ventilated_facade_insulation_system" ||
    plan.semanticFrame.materialSystem !== "rockwool_fixrock_conventional_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "VENTILATED_FACADE_INSULATION",
    operation_class: "FIX",
    material_system: "ROCKWOOL_FIXROCK_CONVENTIONAL",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Держатели теплоизоляции ROCKWOOL Fixrock для обычного крепления VHF",
      templateId: "facade:rockwool-fixrock-conventional-holders:v1",
      templateVersion: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_document_version,
      normId: ROCKWOOL_FIXROCK_CONVENTIONAL_NORM_ID,
      normFamilyId: "norm_family:facade:rockwool_fixrock",
      normSourceId: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_ID,
      normSourceTitle: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_title,
      normVersion: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "ROCKWOOL",
      normSourceEffectiveDate: "2026-09",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: ROCKWOOL_FIXROCK_CONVENTIONAL_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "facade_rockwool_fixrock_conventional_holders_piece",
      materialKey: "rockwool_fixrock_conventional_insulation_holder",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Количество держателей Fixrock заблокировано до подтверждения площади и строго обычного варианта крепления.",
        sourcePolicy: "manual_review" as const,
        formulaId: "rockwool_fixrock_conventional_quantity_blocked_v1",
        quantityFormula: "blocked until area and every conventional-variant exclusion are explicit",
        calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: resolution.blockers,
      };
    }
    return {
      ...source,
      quantity: resolution.calculated_rockwool_fixrock_conventional_holder_quantity_piece!,
      unit: "piece",
      comment: "Среднее 5 держателей/м² применено только к обычному VHF-варианту; результат округлён вверх до целой штуки без запаса.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "rockwool_fixrock_conventional_holders_v1",
      quantityFormula: "ceil(facade_insulation_area_m2 * 5)",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_rockwool_fixrock_conventional_holder_quantity_piece}`,
        "resultUnit=piece",
        "wholePieceRounding=ceil",
        "automaticWaste=false",
        "adhesiveVariant=false",
        "oneDowelVariant=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
