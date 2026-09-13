import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
  SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA,
  SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  treated_timber_surface_area_m2: "Укажите чистую площадь обрабатываемой деревянной поверхности, м².",
  treatment_purpose: "Подтвердите профилактическую защиту от насекомых и дереворазрушающих грибов.",
  timber_surface_condition: "Подтвердите чистую, сухую, необработанную деревянную поверхность.",
  application_method: "Укажите способ нанесения Sikagard Wood Preserver: кисть или распыление.",
  minimum_coat_count: "Подтвердите не менее двух слоёв при нанесении кистью или распылением.",
  selected_package_mix_l: "Укажите итоговый объём выбранной закупочной комбинации банок 1/5 л; автоматическое округление запрещено.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? decimal(match[1]) : null;
}

export function extractSikagardWoodPreserverCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/sikagard\s+wood\s+preserver/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID,
  };
  const area = firstNumber(
    text,
    /(?:чист[а-яё]*\s+)?площад[ьи]\s+(?:обрабатываем[а-яё]*\s+)?деревянн[а-яё]*\s+поверхност[а-яё]*\D{0,14}(\d+(?:[.,]\d+)?)\s*(?:м2|м²|sqm)/iu,
  );
  if (area !== null && area > 0) result.treated_timber_surface_area_m2 = area;
  if (/профилактическ[а-яё]*\s+защит[а-яё]*\s+от\s+насеком[а-яё]*\s+и\s+дереворазрушающ[а-яё]*\s+гриб/iu.test(text)) {
    result.treatment_purpose = "PREVENTATIVE_INSECTS_AND_WOOD_ROTTING_FUNGI";
  }
  if (/чист[а-яё]*\s*,?\s*сух[а-яё]*\s*,?\s*необработанн[а-яё]*\s+деревянн[а-яё]*\s+поверхност/iu.test(text)) {
    result.timber_surface_condition = "CLEAN_DRY_BARE_TIMBER";
  }
  if (/(?:способ\s+нанесени[яе]\s*[:=]?\s*)?кист(?:ью|ь)/iu.test(text)) {
    result.application_method = "BRUSH";
  } else if (/(?:способ\s+нанесени[яе]\s*[:=]?\s*)?распылени/iu.test(text)) {
    result.application_method = "SPRAY";
  }
  const coatCount = firstNumber(
    text,
    /(?:не\s+менее\s+)?(\d+)\s+сло[яеё][а-яё]*/iu,
  );
  if (coatCount !== null && coatCount > 0) result.minimum_coat_count = coatCount;
  const packageMix = firstNumber(
    text,
    /(?:закупочн[а-яё]*\s+комбинаци[а-яё]*\s+банок[^;,\n]*?итого|selected\s+package\s+mix)\D{0,8}(\d+(?:[.,]\d+)?)\s*л/iu,
  );
  if (packageMix !== null && packageMix > 0) result.selected_package_mix_l = packageMix;
  return Object.freeze(result);
}

export function sikagardWoodPreserverMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (
    canonicalParameters?.product_profile_id !==
    SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID
  ) return [];
  return SIKAGARD_WOOD_PRESERVER_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_m2") ? "m2" : parameterId.endsWith("_l") ? "l" : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-carpentry-prompt:${parameterId}`,
      captured_at: "consumer-carpentry-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the Sikagard Wood Preserver request.",
    },
  ]));
}

export function applySikagardWoodPreserverPhysicalNormToCarpentryBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "timber_preservation_system" ||
    plan.semanticFrame.materialSystem !== "sikagard_wood_preserver_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "TIMBER_PRESERVATION",
    operation_class: "APPLY",
    material_system: "SIKAGARD_WOOD_PRESERVER",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      name: "Sikagard Wood Preserver — выбранная закупочная комбинация банок 1/5 л",
      templateId: "carpentry:sikagard-wood-preserver-preventative:v1",
      templateVersion: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_document_version,
      normId: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_NORM_ID,
      normFamilyId: "norm_family:carpentry:sikagard_wood_preserver",
      normSourceId: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_ID,
      normSourceTitle: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_title,
      normVersion: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Sika",
      normSourceEffectiveDate: "2026-07",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: SIKAGARD_WOOD_PRESERVER_PREVENTATIVE_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "carpentry_sikagard_wood_preserver_procurement_litres",
      materialKey: "sikagard_wood_preserver",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Расход Sikagard Wood Preserver заблокирован до подтверждения площади, назначения, поверхности, двух слоёв и закупочной комбинации.",
        sourcePolicy: "manual_review" as const,
        formulaId: "sikagard_wood_preserver_quantity_blocked_v1",
        quantityFormula: "blocked until every exact preventative-treatment parameter is explicit",
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
      quantity: resolution.calculated_sikagard_wood_preserver_procurement_quantity_l!,
      unit: "l",
      comment: "Закупочный объём выбран пользователем; чистая норма 0,25 л/м² не включает поглощение, потери и автоматическое округление.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "sikagard_wood_preserver_exact_procurement_quantity_v1",
      quantityFormula: "selected_package_mix_l, with net requirement = treated_timber_surface_area_m2 * 0.25",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `netResult=${resolution.calculated_sikagard_wood_preserver_net_quantity_l}`,
        `procurementResult=${resolution.calculated_sikagard_wood_preserver_procurement_quantity_l}`,
        "resultUnit=l",
        "dilution=false",
        "automaticWaste=false",
        "automaticPackageRounding=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
