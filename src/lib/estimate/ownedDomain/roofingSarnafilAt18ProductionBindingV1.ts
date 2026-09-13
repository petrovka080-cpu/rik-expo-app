import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  resolveProfessionalPhysicalNormParameterValuesV1,
  SARNAFIL_AT18_FIELD_80MM_NORM_ID,
  SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID,
  SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
  SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA,
  SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  net_rectangular_field_area_m2:
    "Какова чистая площадь прямоугольного поля кровли без примыканий, проходок и надстроек, м²?",
  fixing_method:
    "Подтвердите способ укладки Sarnafil AT-18: полевое механическое крепление с нахлёстом 80 мм?",
  roll_orientation:
    "Подтвердите направление полотен: параллельно длинной стороне прямоугольного поля?",
  field_course_count:
    "Сколько целых параллельных полотен предусмотрено картой раскладки?",
  field_course_lengths_m:
    "Укажите длину каждого полотна по карте раскладки, м, через запятую.",
  end_lap_design:
    "Подтвердите, что внутри рассчитываемого поля нет торцевых нахлёстов; иначе нужна отдельная раскладка.",
  details_and_upstands_area_m2:
    "Какова отдельная площадь примыканий, надстроек и деталей? Для этой полевой нормы требуется 0 м².",
  selected_package_variation:
    "Подтвердите вариант Sarnafil AT-18 с полевым нахлёстом 80 мм; 120 мм для точечного крепления сюда не входит.",
  sika_project_specific_fastening_calculation:
    "Укажите номер проектного расчёта крепления Sika для выбранной схемы.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match?.[1] ? decimal(match[1]) : null;
}

function courseLengths(text: string): string | null {
  const match = text.match(
    /(?:длин(?:а|ы)\s+полот(?:на|ен)|course\s+lengths?)\s*[:=]?\s*((?:\d+(?:[.,]\d+)?\s*,\s*)+\d+(?:[.,]\d+)?)/iu,
  );
  if (!match?.[1]) return null;
  const parsed = match[1]
    .split(",")
    .map((item) => decimal(item.trim()))
    .filter((item): item is number => item !== null && item > 0);
  return parsed.length > 0 ? parsed.join(",") : null;
}

function fasteningCalculationReference(text: string): string | null {
  const match = text.match(
    /(?:расч[её]т\s+креп(?:ежа|ления)\s+sika|sika\s+fastening\s+calculation)\s*[:№#]?\s*([a-z0-9][a-z0-9._/-]*)/iu,
  );
  return match?.[1]?.trim() || null;
}

export function extractSarnafilAt18CanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/sarnafil\s*at[-\s]?18/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID,
  };
  const netArea = firstNumber(
    text,
    /(?:чист(?:ая|ое|ую)?\s+площад[ьи]|net\s+rectangular\s+field\s+area|прямоугольн[а-яё]*\s+пол[ея])\D{0,30}(\d+(?:[.,]\d+)?)\s*(?:м2|м²|sqm|sq\.?\s*m)/iu,
  );
  if (netArea !== null && netArea > 0) result.net_rectangular_field_area_m2 = netArea;
  if (/механическ[а-яё]*\s+(?:полев[а-яё]*\s+)?креп|field[-\s]?fastened/iu.test(text)) {
    result.fixing_method = "FIELD_FASTENED";
  } else if (/точечн[а-яё]*\s+креп|spot[-\s]?fastened/iu.test(text)) {
    result.fixing_method = "SPOT_FASTENED";
  } else if (/балластн[а-яё]*|ballasted/iu.test(text)) {
    result.fixing_method = "BALLASTED";
  }
  if (/полотн[а-яё]*\s+вдоль\s+длинн|parallel\s+to\s+(?:the\s+)?long/iu.test(text)) {
    result.roll_orientation = "PARALLEL_TO_LONG_EDGE";
  }
  const count = firstNumber(
    text,
    /(\d+)\s*(?:цел[а-яё]*\s+)?(?:полот(?:но|на|ен)|courses?)(?=\s|[;,.]|$)/iu,
  );
  if (count !== null && Number.isInteger(count) && count > 0) result.field_course_count = count;
  const lengths = courseLengths(text);
  if (lengths) result.field_course_lengths_m = lengths;
  if (/без\s+торцев[а-яё]*\s+нахл[её]ст|no\s+end\s+laps?/iu.test(text)) {
    result.end_lap_design = "NO_END_LAPS_WITHIN_FIELD";
  }
  const detailsArea = firstNumber(
    text,
    /(?:площад[ьи]\s+)?(?:детал(?:ей|и)|примыкан(?:ий|ия)|надстроек|details?(?:\s+and\s+upstands?)?)\D{0,25}(\d+(?:[.,]\d+)?)\s*(?:м2|м²|sqm|sq\.?\s*m)/iu,
  );
  if (detailsArea !== null && detailsArea >= 0) result.details_and_upstands_area_m2 = detailsArea;
  if (
    /(?:80\s*мм\D{0,20}(?:полев[а-яё]*\s+)?нахл[её]ст|(?:полев[а-яё]*\s+)?нахл[её]ст\D{0,20}80\s*мм|80\s*mm\D{0,20}(?:field\s+)?overlap|(?:field\s+)?overlap\D{0,20}80\s*mm)/iu.test(text)
  ) {
    result.selected_package_variation = "FIELD_FASTENED_80_MM_OVERLAP";
  } else if (/120\s*мм\D{0,20}нахл[её]ст|нахл[её]ст\D{0,20}120\s*мм|120\s*mm\D{0,20}overlap|overlap\D{0,20}120\s*mm/iu.test(text)) {
    result.selected_package_variation = "SPOT_FASTENED_120_MM_OVERLAP";
  }
  const fasteningReference = fasteningCalculationReference(text);
  if (fasteningReference) {
    result.sika_project_specific_fastening_calculation = fasteningReference;
  }
  return Object.freeze(result);
}

export function sarnafilAt18MissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (canonicalParameters?.product_profile_id !== SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID) return [];
  return SARNAFIL_AT18_REQUIRED_EXPLICIT_PARAMETER_IDS
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
        parameterId === "field_course_lengths_m" ? "m" : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-roof-waterproofing-prompt:${parameterId}`,
      captured_at: "consumer-roof-waterproofing-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the roof-waterproofing request.",
    },
  ]));
}

export function applySarnafilAt18PhysicalNormToRoofBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "waterproofing_surface" ||
    plan.semanticFrame.materialSystem !== "roof_waterproofing_system"
  ) {
    return [...rows];
  }
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "ROOF_WATERPROOFING",
    operation_class: "INSTALL",
    material_system: "SARNAFIL_AT18_ROOF_MEMBRANE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code === "reserve") {
      return {
        ...row,
        quantity: 0,
        unitPrice: 0,
        comment: "Автоматический процент запаса Sarnafil AT-18 запрещён: раскрой и округление до рулона считаются только по полной карте поля и деталей.",
        sourcePolicy: "manual_review" as const,
        formulaId: "sarnafil_at18_automatic_waste_excluded_v1",
        quantityFormula: "blocked: no percentage waste and no roll rounding before complete layout",
        calculationTrace: `physicalNorm=${SARNAFIL_AT18_FIELD_80MM_NORM_ID}; automaticWaste=false; rollRounding=false`,
        includedInEstimate: false,
        includedInProcurement: false,
        optional: false,
        editable: false,
        parameterBlockerIds: [
          "SARNAFIL_AT18_COMPLETE_COURSE_AND_DETAIL_LAYOUT_REQUIRED_BEFORE_ROLL_ROUNDING",
        ],
      };
    }
    if (row.code !== "waterproofing") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      templateId: "roof-waterproofing:sarnafil-at18-field-layout:v1",
      templateVersion: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_document_version,
      normId: SARNAFIL_AT18_FIELD_80MM_NORM_ID,
      normFamilyId: "norm_family:roofing:sarnafil_at18_field_layout",
      normSourceId: SARNAFIL_AT18_FIELD_80MM_SOURCE_ID,
      normSourceTitle: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_title,
      normVersion: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_document_version,
      normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Sika",
      normSourceEffectiveDate: "2025-08",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: SARNAFIL_AT18_FIELD_80MM_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "roof_waterproofing_sarnafil_at18_field_membrane",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Точный расход Sarnafil AT-18 заблокирован до подтверждения карты раскладки и границ полевого участка.",
        sourcePolicy: "manual_review" as const,
        formulaId: "sarnafil_at18_field_layout_blocked_v1",
        quantityFormula: "blocked until the complete rectangular field layout is confirmed",
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
      quantity: resolution.calculated_sarnafil_at18_gross_field_membrane_m2!,
      unit: "sq_m",
      comment: "Только мембрана прямоугольного полевого участка; торцы, примыкания, проходки, детали, раскрой и округление до рулона исключены.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "sarnafil_at18_exact_field_course_layout_v1",
      quantityFormula: "sum(field_course_lengths_m) * 2.00 m roll width",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_sarnafil_at18_gross_field_membrane_m2}`,
        "resultUnit=m2",
        "rollRounding=false",
        "excluded=end_laps,upstands,penetrations,details,cutting",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
