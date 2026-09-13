import type {
  DynamicProfessionalBoqRow,
  EstimatorReasoningPlan,
} from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;

const PARAMETER_QUESTIONS_RU: Readonly<Record<string, string>> = Object.freeze({
  approved_reinforcement_schedule_weight_kg: "Укажите итоговую массу арматуры по утверждённой ведомости стержней, кг.",
  bar_bending_schedule_reference: "Укажите номер и ревизию ведомости стержней.",
  structural_drawing_and_revision_reference: "Укажите конструктивный чертёж и его ревизию.",
  bar_standard_and_grade: "Укажите стандарт и класс арматуры.",
  bar_size_designation: "Укажите обозначение размера стержня из выбранной таблицы.",
  nominal_diameter_mm: "Укажите номинальный диаметр стержня, мм.",
  shape_straight_bent_curved_or_link: "Укажите форму STRAIGHT, BENT, CURVED или LINK с уточнением.",
  bar_count_and_cut_length_m: "Укажите число стержней и длину резки по ведомости.",
  selected_standard_mass_kg_per_m: "Укажите массу погонного метра из выбранной стандартной или продуктовой таблицы.",
  laps_hooks_chairs_connectors_and_accessories_scope: "Укажите состав нахлёстов, крюков, фиксаторов, соединителей и аксессуаров в формате PROJECT_SCOPE:…",
  fabrication_allowance_if_documented: "Укажите документированный запас PROJECT_ALLOWANCE:… либо NONE:INCLUDED_IN_APPROVED_SCHEDULE.",
  supplier_bundle_or_length_constraints: "Укажите ограничения поставки PROJECT_CONSTRAINT:… либо NONE:NO_AUTOMATIC_BUNDLE_ROUNDING.",
  estimator_approval_reference: "Укажите ссылку на согласование ведомости сметчиком.",
});

function decimal(value: string): number | null {
  const numeric = Number(value.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function reference(text: string, label: RegExp): string | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"));
  return match?.[1]?.trim() || null;
}

export function extractReinforcementBarScheduleCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (
    !/арматур/iu.test(text) ||
    !/(?:ведомост[а-яё]*\s+стержн|bar\s+bending\s+schedule)/iu.test(text) ||
    !/(?:FHWA(?:-HIF-16-026)?|RICS\s*NRM\s*2)/iu.test(text)
  ) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  };
  const weightMatch = text.match(
    /масс[а-яё]*\s+по\s+утвержд[её]нн[а-яё]*\s+ведомост[а-яё]*\s+стержн[а-яё]*\s*[:=]?\s*(\d[\d\s]*(?:[.,]\d+)?)\s*(?:кг|kg)/iu,
  );
  if (weightMatch?.[1]) {
    const weight = decimal(weightMatch[1]);
    if (weight !== null && weight > 0) result.approved_reinforcement_schedule_weight_kg = weight;
  }
  const diameterMatch = text.match(/номинальн[а-яё]*\s+диаметр[а-яё]*\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:мм|mm)/iu);
  if (diameterMatch?.[1]) {
    const diameter = decimal(diameterMatch[1]);
    if (diameter !== null && diameter > 0) result.nominal_diameter_mm = diameter;
  }
  const massMatch = text.match(/масс[а-яё]*\s+погонн[а-яё]*\s+метр[а-яё]*\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:кг\/м|kg\/m)/iu);
  if (massMatch?.[1]) {
    const mass = decimal(massMatch[1]);
    if (mass !== null && mass > 0) result.selected_standard_mass_kg_per_m = mass;
  }
  const labels: readonly (readonly [string, RegExp])[] = [
    ["bar_bending_schedule_reference", /ссылк[а-яё]*\s+на\s+ведомост[а-яё]*\s+стержн[а-яё]*/iu],
    ["structural_drawing_and_revision_reference", /конструктивн[а-яё]*\s+черт[её]ж/iu],
    ["bar_standard_and_grade", /стандарт\s+и\s+класс\s+арматур[а-яё]*/iu],
    ["bar_size_designation", /обозначени[ея]\s+размер[а-яё]*\s+стержн[а-яё]*/iu],
    ["shape_straight_bent_curved_or_link", /форм[а-яё]*\s+стержн[а-яё]*/iu],
    ["bar_count_and_cut_length_m", /числ[а-яё]*\s+стержн[а-яё]*\s+и\s+длин[а-яё]*\s+резк[а-яё]*/iu],
    ["laps_hooks_chairs_connectors_and_accessories_scope", /состав\s+нахл[её]ст[а-яё]*\s+и\s+аксессуар[а-яё]*/iu],
    ["fabrication_allowance_if_documented", /запас\s+изготовлени[а-яё]*/iu],
    ["supplier_bundle_or_length_constraints", /ограничени[а-яё]*\s+поставк[а-яё]*/iu],
    ["estimator_approval_reference", /согласовани[ея]\s+сметчик[а-яё]*/iu],
  ];
  for (const [parameterId, label] of labels) {
    const value = reference(text, label);
    if (value) result[parameterId] = value;
  }
  return Object.freeze(result);
}

export function reinforcementBarScheduleMissingQuestionsRuV1(
  canonicalParameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (canonicalParameters?.product_profile_id !== REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID) return [];
  return REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS
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
      unit_id: parameterId.endsWith("_kg")
        ? "kg"
        : parameterId.endsWith("_mm")
          ? "mm"
          : parameterId.endsWith("_kg_per_m")
            ? "kg_per_m"
            : null,
      source_type: "USER_EXPLICIT" as const,
      source_id: `consumer-reinforcement-prompt:${parameterId}`,
      captured_at: "consumer-reinforcement-prompt-snapshot",
      confidence: "high" as const,
      applicability: "Value explicitly stated in the exact approved reinforcement schedule request.",
    },
  ]));
}

export function applyReinforcementBarSchedulePhysicalNormToBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const canonicalParameters = plan.canonicalParameters;
  if (
    canonicalParameters?.product_profile_id !== REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "approved_reinforcement_bar_schedule" ||
    plan.semanticFrame.materialSystem !== "fhwa_rics_reinforcement_schedule"
  ) return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCEMENT_SCHEDULE_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameterValues(canonicalParameters),
  });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Арматурная сталь по утверждённой ведомости стержней",
      templateId: "reinforcement:approved-bar-schedule:fhwa-rics:v1",
      templateVersion: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
      normId: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
      normFamilyId: "norm_family:reinforcement:approved_bar_schedule",
      normSourceId: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      normSourceTitle: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_title,
      normVersion: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
      normReviewStatus: "public_measurement_sources_primary_reviewed",
      normSourceProfile: "INTL_REFERENCE" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Federal Highway Administration / RICS",
      normSourceEffectiveDate: "2021-12-01",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "public",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "reinforcement_approved_schedule_weight_kg",
      materialKey: "reinforcement_steel_approved_bar_schedule",
    };
    if (resolution.status !== "APPLIED") {
      return {
        ...source,
        quantity: 0,
        unitPrice: 0,
        comment: "Масса арматуры заблокирована до полной утверждённой ведомости, выбранной таблицы массы и состава аксессуаров.",
        sourcePolicy: "manual_review" as const,
        formulaId: "reinforcement_bar_schedule_weight_blocked_v1",
        quantityFormula: "blocked until every exact reinforcement schedule parameter is explicit",
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
      quantity: resolution.calculated_reinforcement_schedule_weight_kg!,
      unit: "kg",
      comment: "Количество равно утверждённой массе ведомости; цена поставки берётся отдельно и не выводится из FHWA или RICS.",
      sourcePolicy: "configured_reference" as const,
      formulaId: "reinforcement_approved_bar_schedule_weight_v1",
      quantityFormula: "approved_reinforcement_schedule_weight_kg * 1",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `consumed=${resolution.consumed_parameter_ids.join(",")}`,
        `result=${resolution.calculated_reinforcement_schedule_weight_kg}`,
        "resultUnit=kg",
        "priceSource=separate_configured_reference",
        "automaticKgPerM3Allowance=false",
        "automaticDiameterSquaredOver162=false",
        "automaticBundleRounding=false",
        "automaticWaste=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: true,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
