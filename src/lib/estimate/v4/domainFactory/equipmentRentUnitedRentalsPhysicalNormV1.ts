import equipmentRentNormPack from "../../../../../data/estimate-norms/professional/equipment_rent.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import type { ProfessionalParameterValueV4 } from "../professionalProjectAssemblyV4";
import type { ProfessionalPhysicalNormApplicabilityResolutionV1 } from "./professionalPhysicalNormApplicabilityV1";

const VERSION = "professional-physical-norm-applicability:v1" as const;

export const UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID =
  "supplier-terms:united-rentals-canada:one-shift:2026-09-02:v1" as const;
export const UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID =
  "equipment_rent_united_rentals_one_shift_hours_day_v1" as const;
export const UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID =
  `src_professional_norm_pack_${UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID}` as const;

export const UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "shift_count",
  "required_equipment_operating_hours",
  "equipment_productivity_calculation_reference",
  "selected_equipment_and_power_status",
  "supplier_and_jurisdiction",
  "supplier_terms_revision_confirmed",
  "rental_out_datetime",
  "scheduled_in_or_confirmed_off_rent_datetime",
  "calendar_rental_period",
  "daily_weekly_or_four_week_rate_period",
  "double_or_triple_shift_usage",
  "weekend_and_holiday_days",
  "delivery_and_pickup_scope",
  "fuel_and_refueling_scope",
  "tax_transport_environmental_and_miscellaneous_charges",
  "operator_labor_scope",
  "insurance_protection_and_damage_scope",
] as const);

const norm = equipmentRentNormPack.norm_items.find(
  (item) => item.norm_id === UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
);
if (!norm) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID}`);
if (
  equipmentRentNormPack.work_group !== "equipment_rent" ||
  equipmentRentNormPack.review_status !== "reviewed" ||
  norm.unit !== "hour" ||
  norm.rate.value !== 8 ||
  norm.applicability.supplier !== "United Rentals of Canada Inc." ||
  norm.applicability.jurisdiction !== "Canada" ||
  norm.applicability.terms_last_update !== "2026-09-02" ||
  norm.applicability.one_shift_hours_per_day !== 8 ||
  norm.applicability.one_shift_hours_per_week !== 40 ||
  norm.applicability.one_shift_hours_per_four_week_period !== 160 ||
  norm.applicability.weekends_and_holidays_accrue_rental_charges !== true ||
  norm.applicability.rental_period_and_off_rent_confirmation_control_calendar_charge !== true ||
  norm.applicability.equipment_productivity_must_be_calculated_separately !== true ||
  norm.applicability.supplier_agreement_and_local_rate_required !== true ||
  norm.applicability.eight_hour_allowance_is_not_complete_billing_formula !== true ||
  norm.parameters.length !== UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS.some((id) => !norm.parameters.includes(id)) ||
  norm.waste_percent_default !== 0 ||
  norm.rounding.package_size !== 8 ||
  norm.rounding.mode !== "supplier_agreement_calendar_period_and_shift_usage_schedule_required"
) throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID}`);

export const UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA = Object.freeze({
  source_id: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
  norm_id: UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
  source_document_version: equipmentRentNormPack.source_pack_version,
  source_title: norm.source.title,
  source_url: norm.source.url,
  exact_locator: norm.source.page,
  rate_value: norm.rate.value,
  rate_unit: norm.rate.unit,
  definition_hash: estimateDeterministicHash({
    work_group: equipmentRentNormPack.work_group,
    source_pack_version: equipmentRentNormPack.source_pack_version,
    norm_item: norm,
  }),
});

export const UNITED_RENTALS_CA_ONE_SHIFT_RUNTIME_BINDING_V1 = Object.freeze({
  norm_id: UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
  work_group: "equipment_rent",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "EQUIPMENT_RENTAL_NORMAL_USE_ALLOWANCE",
  operation_class: "RENT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID,
  source_id: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
  source_document_version: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_document_version,
  source_definition_hash: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["united_rentals_normal_use_allowance_hours"] as const,
});

function explicit(values: Readonly<Record<string, ProfessionalParameterValueV4>>, id: string) {
  const value = values[id];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && !value.value.trim()) return null;
  return value;
}
function text(value: ProfessionalParameterValueV4 | null): string | null {
  return typeof value?.value === "string" ? value.value.trim() || null : null;
}
function number(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const parsed = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function boolean(value: ProfessionalParameterValueV4 | null): boolean | null {
  return typeof value?.value === "boolean" ? value.value : null;
}
function blocked(
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE",
  profile: string | null,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumed: readonly string[] = [],
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const base = {
    status,
    applicability_version: VERSION,
    product_profile_id: profile,
    source_id: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
    norm_id: UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
    source_document_version: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_document_version,
    source_url: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_url,
    exact_locator: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.exact_locator,
    source_definition_hash: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...consumed].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: values,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}

export function resolveUnitedRentalsCaOneShiftPhysicalNormV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: string;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profile = text(explicit(input.parameter_values, "product_profile_id"));
  if (profile !== UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID) {
    return blocked("NOT_REQUESTED", profile, input.parameter_values, []);
  }
  if (
    input.technology_class !== "EQUIPMENT_RENTAL_NORMAL_USE_ALLOWANCE" ||
    input.operation_class !== "RENT" ||
    input.material_system !== "UNITED_RENTALS_CANADA_ONE_SHIFT_TERMS" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE"
  ) return blocked("NOT_REQUESTED", profile, input.parameter_values, []);

  const values = Object.fromEntries(
    UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
      (id) => [id, explicit(input.parameter_values, id)],
    ),
  );
  const missing = UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((id) => values[id] === null)
    .map((id) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${id}`);
  if (missing.length) {
    return blocked(
      "BLOCKED_REQUIRED_INPUTS",
      profile,
      input.parameter_values,
      missing,
      UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const shiftCount = number(values.shift_count);
  const requiredHours = number(values.required_equipment_operating_hours);
  const calendarDays = number(values.calendar_rental_period);
  const weekendHolidayDays = number(values.weekend_and_holiday_days);
  const outAt = text(values.rental_out_datetime);
  const offRentAt = text(values.scheduled_in_or_confirmed_off_rent_datetime);
  const outMs = outAt ? Date.parse(outAt) : Number.NaN;
  const offRentMs = offRentAt ? Date.parse(offRentAt) : Number.NaN;
  const elapsedDays = Number.isFinite(outMs) && Number.isFinite(offRentMs)
    ? (offRentMs - outMs) / 86_400_000
    : Number.NaN;
  const allowanceHours = shiftCount === null ? null : shiftCount * 8;
  const blockers = [
    shiftCount !== null && Number.isInteger(shiftCount) && shiftCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:shift_count",
    requiredHours !== null && requiredHours > 0
      ? ""
      : "PROJECT_VALUE_INVALID:required_equipment_operating_hours",
    text(values.equipment_productivity_calculation_reference)?.startsWith("CALC_REF:")
      ? ""
      : "PROJECT_VALUE_INVALID:equipment_productivity_calculation_reference",
    text(values.selected_equipment_and_power_status)?.startsWith("POWER_EQUIPMENT:")
      ? ""
      : "PROJECT_VALUE_INVALID:selected_equipment_and_power_status",
    text(values.supplier_and_jurisdiction) === "UNITED_RENTALS_OF_CANADA_INC:CANADA"
      ? ""
      : "PHYSICAL_NORM_VARIANT_CONFLICT:supplier_and_jurisdiction",
    boolean(values.supplier_terms_revision_confirmed) === true
      ? ""
      : "PHYSICAL_NORM_NOT_APPLICABLE:supplier_terms_revision_confirmed",
    Number.isFinite(outMs) ? "" : "PROJECT_VALUE_INVALID:rental_out_datetime",
    Number.isFinite(offRentMs) && offRentMs > outMs
      ? ""
      : "PROJECT_VALUE_INVALID:scheduled_in_or_confirmed_off_rent_datetime",
    calendarDays !== null && Number.isInteger(calendarDays) && calendarDays > 0
      ? ""
      : "PROJECT_VALUE_INVALID:calendar_rental_period",
    Number.isFinite(elapsedDays) && calendarDays !== null && Math.abs(elapsedDays - calendarDays) <= 0.000001
      ? ""
      : "PROJECT_VALUE_CONFLICT:calendar_rental_period",
    text(values.daily_weekly_or_four_week_rate_period) === "DAILY"
      ? ""
      : "PHYSICAL_NORM_NOT_APPLICABLE:daily_weekly_or_four_week_rate_period",
    text(values.double_or_triple_shift_usage) === "ONE_SHIFT"
      ? ""
      : "PHYSICAL_NORM_NOT_APPLICABLE:double_or_triple_shift_usage",
    shiftCount !== null && calendarDays !== null && shiftCount === calendarDays
      ? ""
      : "PROJECT_VALUE_CONFLICT:shift_count_vs_calendar_rental_period",
    weekendHolidayDays !== null && Number.isInteger(weekendHolidayDays) && weekendHolidayDays >= 0 &&
      calendarDays !== null && weekendHolidayDays <= calendarDays
      ? ""
      : "PROJECT_VALUE_INVALID:weekend_and_holiday_days",
    requiredHours !== null && allowanceHours !== null && requiredHours <= allowanceHours
      ? ""
      : "NORMAL_USE_ALLOWANCE_EXCEEDED:required_equipment_operating_hours",
    ...[
      "delivery_and_pickup_scope",
      "fuel_and_refueling_scope",
      "tax_transport_environmental_and_miscellaneous_charges",
      "operator_labor_scope",
      "insurance_protection_and_damage_scope",
    ].map((id) => text(values[id])?.startsWith("SEPARATE_SCOPE:") ? "" : `PROJECT_VALUE_INVALID:${id}`),
  ].filter(Boolean);
  if (blockers.length) {
    return blocked(
      "BLOCKED_NOT_APPLICABLE",
      profile,
      input.parameter_values,
      blockers,
      UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const existing = number(explicit(input.parameter_values, "united_rentals_normal_use_allowance_hours"));
  if (existing !== null && existing !== allowanceHours) {
    return blocked(
      "BLOCKED_NOT_APPLICABLE",
      profile,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:united_rentals_normal_use_allowance_hours=${existing}:norm_value=${allowanceHours}`],
      [...UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS, "united_rentals_normal_use_allowance_hours"],
    );
  }

  const capturedAt = UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((id) => values[id]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${profile}`,
    `shift_count=${shiftCount}`,
    "one_shift_hours_per_day=8",
    `normal_use_allowance_hours=${allowanceHours}`,
    `required_equipment_operating_hours=${requiredHours}`,
    `calendar_rental_period_days=${calendarDays}`,
    `weekend_and_holiday_days=${weekendHolidayDays}`,
    "calendar_billing_price_separate=true",
    "equipment_productivity_separate=true",
    "delivery_fuel_operator_insurance_charges_separate=true",
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    united_rentals_normal_use_allowance_hours: {
      value: allowanceHours!,
      unit_id: "equipment_hour",
      source_type: "APPLICABLE_NORM" as const,
      source_id: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const base = {
    status: "APPLIED" as const,
    applicability_version: VERSION,
    product_profile_id: profile,
    source_id: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
    norm_id: UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
    source_document_version: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_document_version,
    source_url: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.source_url,
    exact_locator: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.exact_locator,
    source_definition_hash: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...UNITED_RENTALS_CA_ONE_SHIFT_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["united_rentals_normal_use_allowance_hours"] as const,
    calculated_united_rentals_normal_use_allowance_hours: allowanceHours!,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...base, deterministic_hash: estimateDeterministicHash(base) };
}
