import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import {
  UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
  UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID,
  UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS,
  UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
  UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../v4/domainFactory";

type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze({
  shift_count: "Укажите число односменных дней аренды.",
  required_equipment_operating_hours: "Укажите требуемые часы работы выбранной машины.",
  equipment_productivity_calculation_reference: "Укажите отдельный расчёт производительности в формате CALC_REF:…",
  selected_equipment_and_power_status: "Укажите выбранную машину и статус power equipment в формате POWER_EQUIPMENT:…",
  supplier_and_jurisdiction: "Подтвердите United Rentals of Canada Inc. и юрисдикцию Canada.",
  supplier_terms_revision_confirmed: "Подтвердите редакцию условий поставщика от 2026-09-02.",
  rental_out_datetime: "Укажите дату и время начала аренды в ISO-формате.",
  scheduled_in_or_confirmed_off_rent_datetime: "Укажите дату и время подтверждённого окончания аренды в ISO-формате.",
  calendar_rental_period: "Укажите календарный срок аренды в днях.",
  daily_weekly_or_four_week_rate_period: "Укажите DAILY для этой точной ветки расчёта.",
  double_or_triple_shift_usage: "Укажите ONE_SHIFT для этой точной ветки расчёта.",
  weekend_and_holiday_days: "Укажите число выходных и праздничных дней в сроке аренды.",
  delivery_and_pickup_scope: "Укажите доставку и вывоз отдельно в формате SEPARATE_SCOPE:…",
  fuel_and_refueling_scope: "Укажите топливо отдельно в формате SEPARATE_SCOPE:…",
  tax_transport_environmental_and_miscellaneous_charges: "Укажите налоги и сборы отдельно в формате SEPARATE_SCOPE:…",
  operator_labor_scope: "Укажите труд оператора отдельно в формате SEPARATE_SCOPE:…",
  insurance_protection_and_damage_scope: "Укажите страхование и ущерб отдельно в формате SEPARATE_SCOPE:…",
});

function decimal(raw: string): number | null {
  const value = Number(raw.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
function numberAfter(text: string, label: RegExp, unit = ""): number | null {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu"));
  return match?.[1] ? decimal(match[1]) : null;
}
function reference(text: string, label: RegExp): string | null {
  return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null;
}

export function extractUnitedRentalsCaOneShiftCanonicalParametersV1(
  text: string,
): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*united\s+rentals)(?=.*canada)(?=.*one[\s_-]*shift)/iu.test(text)) return null;
  const result: Record<string, Primitive> = {
    product_profile_id: UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID,
    supplier_and_jurisdiction: "UNITED_RENTALS_OF_CANADA_INC:CANADA",
  };
  const numeric: readonly (readonly [string, RegExp, string])[] = [
    ["shift_count", /shift\s+count/iu, ""],
    ["required_equipment_operating_hours", /required\s+equipment\s+operating\s+hours/iu, "(?:h|hour|hours)?"],
    ["calendar_rental_period", /calendar\s+rental\s+period/iu, "(?:day|days)?"],
    ["weekend_and_holiday_days", /weekend\s+and\s+holiday\s+days/iu, "(?:day|days)?"],
  ];
  for (const [id, label, unit] of numeric) {
    const value = numberAfter(text, label, unit);
    if (value !== null) result[id] = value;
  }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["equipment_productivity_calculation_reference", /equipment\s+productivity\s+calculation\s+reference/iu],
    ["selected_equipment_and_power_status", /selected\s+equipment\s+and\s+power\s+status/iu],
    ["rental_out_datetime", /rental\s+out\s+datetime/iu],
    ["scheduled_in_or_confirmed_off_rent_datetime", /confirmed\s+off[\s_-]*rent\s+datetime/iu],
    ["daily_weekly_or_four_week_rate_period", /rate\s+period/iu],
    ["double_or_triple_shift_usage", /shift\s+usage/iu],
    ["delivery_and_pickup_scope", /delivery\s+and\s+pickup\s+scope/iu],
    ["fuel_and_refueling_scope", /fuel\s+and\s+refueling\s+scope/iu],
    ["tax_transport_environmental_and_miscellaneous_charges", /tax\s+transport\s+environmental\s+and\s+miscellaneous\s+charges/iu],
    ["operator_labor_scope", /operator\s+labor\s+scope/iu],
    ["insurance_protection_and_damage_scope", /insurance\s+protection\s+and\s+damage\s+scope/iu],
  ];
  for (const [id, label] of refs) {
    const value = reference(text, label);
    if (value) result[id] = value;
  }
  if (/supplier\s+terms\s+revision\s+2026-09-02\s+confirmed/iu.test(text)) {
    result.supplier_terms_revision_confirmed = true;
  }
  return Object.freeze(result);
}

export function unitedRentalsCaOneShiftMissingQuestionsRuV1(
  parameters: Readonly<Record<string, Primitive>> | null | undefined,
): string[] {
  if (parameters?.product_profile_id !== UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID) return [];
  return UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((id) => parameters[id] == null)
    .map((id) => QUESTIONS[id] ?? id);
}

function explicitValues(
  parameters: Readonly<Record<string, Primitive>>,
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, {
    value,
    unit_id: id === "calendar_rental_period" || id === "weekend_and_holiday_days"
      ? "day"
      : id === "required_equipment_operating_hours"
        ? "equipment_hour"
        : null,
    source_type: "USER_EXPLICIT" as const,
    source_id: `consumer-equipment-rent-prompt:${id}`,
    captured_at: "consumer-equipment-rent-prompt-snapshot",
    confidence: "high" as const,
    applicability: "Value explicitly stated in the exact United Rentals Canada one-shift request.",
  }]));
}

export function applyUnitedRentalsCaOneShiftPhysicalNormToBoqV1(
  plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[],
): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (
    parameters?.product_profile_id !== UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "selected_equipment_rental" ||
    plan.semanticFrame.materialSystem !== "united_rentals_canada_one_shift"
  ) return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "EQUIPMENT_RENTAL_NORMAL_USE_ALLOWANCE",
    operation_class: "RENT",
    material_system: "UNITED_RENTALS_CANADA_ONE_SHIFT_TERMS",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters),
  });
  return rows.map((row) => {
    if (row.code !== "equipment_1") return row;
    const source = {
      ...row,
      professionalPhysicalNormApplicabilityV1: resolution,
      name: "Лимит нормальной односменной эксплуатации United Rentals Canada",
      templateId: "equipment-rent:united-rentals-ca:one-shift:v1",
      templateVersion: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_document_version,
      normId: UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
      normFamilyId: "norm_family:equipment_rent:united_rentals_ca",
      normSourceId: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
      normSourceTitle: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_title,
      normVersion: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_document_version,
      normReviewStatus: "supplier_primary_terms_reviewed",
      normSourceProfile: "PROJECT_SPECIFIC" as const,
      normSourceJurisdiction: "CANADA",
      normSourcePublisher: "United Rentals of Canada Inc.",
      normSourceEffectiveDate: "2026-09-02",
      normSourceCheckedAt: "2026-09-12",
      normSourceReference: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "public_supplier_terms",
      normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "equipment_rent_united_rentals_ca_normal_use_hour",
      materialKey: "selected_equipment_rental_normal_use_allowance",
    };
    if (resolution.status !== "APPLIED") return {
      ...source,
      quantity: 0,
      unitPrice: 0,
      sourcePolicy: "manual_review" as const,
      comment: "Часы заблокированы до подтверждения срока аренды, односменного режима, производительности и всех отдельных начислений.",
      formulaId: "united_rentals_ca_normal_use_hours_blocked_v1",
      quantityFormula: "blocked until every supplier-term and project input is explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false,
      includedInProcurement: false,
      optional: false,
      editable: false,
      parameterBlockerIds: resolution.blockers,
    };
    return {
      ...source,
      quantity: resolution.calculated_united_rentals_normal_use_allowance_hours!,
      unit: "equipment_hour",
      sourcePolicy: "configured_reference" as const,
      comment: "8 ч/день — только лимит нормальной эксплуатации; календарный тариф, переработка, доставка, топливо, оператор и страхование считаются отдельно.",
      formulaId: "united_rentals_ca_normal_use_hours_v1",
      quantityFormula: "confirmed one-shift rental days * 8 normal-use hours/day",
      calculationTrace: [
        `physicalNorm=${resolution.norm_id}`,
        `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_united_rentals_normal_use_allowance_hours}`,
        "resultUnit=equipment_hour",
        "calendarBillingPriceSeparate=true",
        "equipmentProductivitySeparate=true",
        "automaticGenericBinding=false",
      ].join("; "),
      includedInEstimate: true,
      includedInProcurement: false,
      optional: false,
      editable: false,
      parameterBlockerIds: [],
    };
  });
}
