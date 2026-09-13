import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA,
  ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  net_insulation_area_m2: "Какова чистая площадь утепления без раскройного запаса, м²?",
  required_r_value: "Подтвердите проектное требуемое сопротивление теплопередаче R6.3.",
  selected_thickness_mm: "Подтвердите выбранную толщину Comfortboard 80: 38 мм.",
  selected_board_length_mm: "Подтвердите длину выбранной плиты: 1219 мм.",
  selected_board_width_mm: "Подтвердите ширину выбранной плиты: 610 мм.",
  selected_package_format: "Подтвердите формат: 6 плит 1219×610×38 мм, покрытие упаковки 4,45 м².",
  opening_and_cut_layout: "Укажите номер карты раскроя проёмов и примыканий; без неё запас и число упаковок не рассчитываются.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? decimal(match[1]) : null;
}

export function extractRockwoolComfortboard80CanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/(?:rockwool\s+)?comfortboard\s*80/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID,
  };
  const area = firstNumber(
    text,
    /(?:чист[а-яё]*\s+площад[ьи]\s+утеплен[а-яё]*|net\s+insulation\s+area)\D{0,25}(\d+(?:[.,]\d+)?)\s*(?:м2|м²|sqm|sq\.?\s*m)/iu,
  );
  if (area !== null && area > 0) result.net_insulation_area_m2 = area;
  if (/\br\s*6[.,]3\b/iu.test(text)) result.required_r_value = "R6.3";
  const thickness = firstNumber(text, /толщин[а-яё]*\D{0,15}(\d+(?:[.,]\d+)?)\s*мм/iu);
  if (thickness !== null && thickness > 0) result.selected_thickness_mm = thickness;
  const boardDimensions = text.match(/(?:плит[а-яё]*\D{0,20})?(1219)\s*[xх×]\s*(610)\s*(?:мм)?/iu);
  if (boardDimensions?.[1] && boardDimensions[2]) {
    result.selected_board_length_mm = Number(boardDimensions[1]);
    result.selected_board_width_mm = Number(boardDimensions[2]);
  }
  if (
    /6\s*плит[а-яё]*/iu.test(text) &&
    /4[.,]45\s*(?:м2|м²|sqm)/iu.test(text) &&
    result.selected_thickness_mm === 38 &&
    result.selected_board_length_mm === 1219 &&
    result.selected_board_width_mm === 610
  ) {
    result.selected_package_format = "R6_3_38MM_1219X610_6_BOARDS_4_45_M2";
  }
  const layout = text.match(
    /(?:карта\s+раскроя|cut(?:ting)?\s+layout)\s*[:№#]?\s*([a-z0-9][a-z0-9._/-]*)/iu,
  );
  if (layout?.[1]) result.opening_and_cut_layout = layout[1];
  return Object.freeze(result);
}

export function rockwoolComfortboard80MissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (
    canonicalParameters?.product_profile_id !==
    ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID
  ) return [];
  return ROCKWOOL_COMFORTBOARD80_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_m2") ? "m2" :
        parameterId.endsWith("_mm") ? "mm" : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-insulation-prompt:${parameterId}`,
      captured_at: "consumer-insulation-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the Comfortboard 80 insulation request.",
    },
  ]));
}

export function applyRockwoolComfortboard80PhysicalNormToInsulationBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "insulation_system" ||
    plan.semanticFrame.materialSystem !== "insulation_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "THERMAL_INSULATION",
    operation_class: "INSTALL",
    material_system: "ROCKWOOL_COMFORTBOARD80",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code === "reserve") {
      return {
        ...row,
        quantity: 0,
        unitPrice: 0,
        comment: "Автоматический запас и округление ROCKWOOL Comfortboard 80 до упаковки запрещены до полной карты раскроя.",
        sourcePolicy: "manual_review" as const,
        formulaId: "rockwool_comfortboard80_automatic_waste_excluded_v1",
        quantityFormula: "blocked: no cutting allowance and no package rounding",
        calculationTrace: `physicalNorm=${ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID}; cuttingAllowance=false; packageRounding=false`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: [
          "ROCKWOOL_COMFORTBOARD80_COMPLETE_CUT_LAYOUT_REQUIRED_BEFORE_PACKAGE_ROUNDING",
        ],
      };
    }
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Утеплитель ROCKWOOL Comfortboard 80 R6.3, 38 мм, плита 1219×610 мм",
      templateId: "insulation:rockwool-comfortboard80-r63-38mm:v1",
      templateVersion: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_document_version,
      normId: ROCKWOOL_COMFORTBOARD80_R63_38MM_NORM_ID,
      normFamilyId: "norm_family:insulation:rockwool_comfortboard80_net_area",
      normSourceId: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_ID,
      normSourceTitle: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_title,
      normVersion: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "ROCKWOOL",
      normSourceEffectiveDate: "2025-07",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: ROCKWOOL_COMFORTBOARD80_R63_38MM_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "insulation_rockwool_comfortboard80_net_board_area",
      materialKey: "rockwool_comfortboard80_r63_38mm",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Точная чистая площадь Comfortboard 80 заблокирована до подтверждения проектного R, формата плиты и карты раскроя.",
        sourcePolicy: "manual_review" as const,
        formulaId: "rockwool_comfortboard80_net_area_blocked_v1",
        quantityFormula: "blocked until the exact R6.3 board format and cut layout are confirmed",
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
      quantity: resolution.calculated_rockwool_comfortboard80_net_board_quantity_m2!,
      unit: "sq_m",
      comment: "Только чистая площадь плит до раскройного запаса и округления до упаковок; теплотехническая применимость подтверждается проектом.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "rockwool_comfortboard80_exact_net_area_v1",
      quantityFormula: "net_insulation_area_m2 * 1.0",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_rockwool_comfortboard80_net_board_quantity_m2}`,
        "resultUnit=m2",
        "cuttingAllowance=false",
        "packageRounding=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
