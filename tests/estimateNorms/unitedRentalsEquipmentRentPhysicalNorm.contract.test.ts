import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID,
  UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID,
  UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-12T23:00:00.000Z", confidence: "high", applicability: "Exact supplier-term fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return {
    product_profile_id: explicit(UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID),
    shift_count: explicit(2, "day"), required_equipment_operating_hours: explicit(12, "equipment_hour"),
    equipment_productivity_calculation_reference: explicit("CALC_REF:approved excavator production schedule"),
    selected_equipment_and_power_status: explicit("POWER_EQUIPMENT:mini excavator 5 t"),
    supplier_and_jurisdiction: explicit("UNITED_RENTALS_OF_CANADA_INC:CANADA"),
    supplier_terms_revision_confirmed: explicit(true), rental_out_datetime: explicit("2026-09-14T08:00:00Z"),
    scheduled_in_or_confirmed_off_rent_datetime: explicit("2026-09-16T08:00:00Z"),
    calendar_rental_period: explicit(2, "day"), daily_weekly_or_four_week_rate_period: explicit("DAILY"),
    double_or_triple_shift_usage: explicit("ONE_SHIFT"), weekend_and_holiday_days: explicit(0, "day"),
    delivery_and_pickup_scope: explicit("SEPARATE_SCOPE:supplier quote"),
    fuel_and_refueling_scope: explicit("SEPARATE_SCOPE:project fuel log"),
    tax_transport_environmental_and_miscellaneous_charges: explicit("SEPARATE_SCOPE:supplier invoice"),
    operator_labor_scope: explicit("SEPARATE_SCOPE:contractor labor"),
    insurance_protection_and_damage_scope: explicit("SEPARATE_SCOPE:selected protection plan"),
    ...changes,
  };
}
function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "EQUIPMENT_RENTAL_NORMAL_USE_ALLOWANCE", operation_class: "RENT",
    material_system: "UNITED_RENTALS_CANADA_ONE_SHIFT_TERMS", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}
function prompt(days = 2) {
  const offRentDay = 14 + days;
  return [
    "Equipment rental United Rentals of Canada Inc Canada one-shift; supplier terms revision 2026-09-02 confirmed;",
    `shift count: ${days}; required equipment operating hours: ${days * 6} hours;`,
    "equipment productivity calculation reference: CALC_REF:approved excavator production schedule;",
    "selected equipment and power status: POWER_EQUIPMENT:mini excavator 5 t;",
    "rental out datetime: 2026-09-14T08:00:00Z;",
    `confirmed off-rent datetime: 2026-09-${offRentDay}T08:00:00Z; calendar rental period: ${days} days;`,
    "rate period: DAILY; shift usage: ONE_SHIFT; weekend and holiday days: 0 days;",
    "delivery and pickup scope: SEPARATE_SCOPE:supplier quote; fuel and refueling scope: SEPARATE_SCOPE:project fuel log;",
    "tax transport environmental and miscellaneous charges: SEPARATE_SCOPE:supplier invoice;",
    "operator labor scope: SEPARATE_SCOPE:contractor labor;",
    "insurance protection and damage scope: SEPARATE_SCOPE:selected protection plan",
  ].join(" ");
}

describe("United Rentals Canada one-shift equipment-use allowance", () => {
  test("registers the exact supplier terms without presenting them as productivity or price", () => {
    expect(constructionNormativeRegistryV1.get(UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID)).toMatchObject({
      source_type: "WORK_EXECUTION_STANDARD", operation_class_applicability: ["RENT"],
      product_profile_applicability: [UNITED_RENTALS_CA_ONE_SHIFT_PRODUCT_PROFILE_ID],
    });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID, work_group: "equipment_rent",
      produced_parameter_ids: ["united_rentals_normal_use_allowance_hours"],
    }));
  });

  test("calculates only the normal-use allowance from confirmed one-shift days", () => {
    const result = resolve(inputs());
    expect(result).toMatchObject({ status: "APPLIED", calculated_united_rentals_normal_use_allowance_hours: 16, blockers: [] });
    expect(result.parameter_values.united_rentals_normal_use_allowance_hours).toMatchObject({
      value: 16, unit_id: "equipment_hour", source_type: "APPLICABLE_NORM",
      source_id: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID,
    });
    expect(result.parameter_values.united_rentals_normal_use_allowance_hours.applicability)
      .toContain("equipment_productivity_separate=true");
  });

  test("fails closed for missing scope, excess required hours and non-one-shift use", () => {
    const missing = { ...inputs() };
    delete (missing as Record<string, ProfessionalParameterValueV4>).fuel_and_refueling_scope;
    expect(resolve(missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:fuel_and_refueling_scope"]) });
    expect(resolve(inputs({ required_equipment_operating_hours: explicit(17, "equipment_hour") })))
      .toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["NORMAL_USE_ALLOWANCE_EXCEEDED:required_equipment_operating_hours"]) });
    expect(resolve(inputs({ double_or_triple_shift_usage: explicit("DOUBLE_SHIFT") })))
      .toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:double_or_triple_shift_usage"]) });
  });

  test("runs through the exact consumer route", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("equipment_rent");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Equipment rental for two days")).toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("equipment_rent_united_rentals_ca_one_shift");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 16, unit: "equipment_hour", normSourceId: UNITED_RENTALS_CA_ONE_SHIFT_SOURCE_ID });
    expect(rows[0]?.sourceParameters).toMatchObject({ includedInEstimate: true, includedInProcurement: false, parameterBlockerIds: [] });
  });

  test("changes the sourced quantity and money when shift count changes independently", () => {
    const one = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: prompt(1), owner: "equipment_rent", currency: "KGS",
    }));
    const two = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({
      text: prompt(2), owner: "equipment_rent", currency: "KGS",
    }));
    const first = one.rows.find((row) => row.normId === UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID)!;
    const second = two.rows.find((row) => row.normId === UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID)!;
    expect(first.quantity).toBe(8);
    expect(second.quantity).toBe(16);
    expect(second.quantity * second.unitPrice).toBeGreaterThan(first.quantity * first.unitPrice);
  });

  test("blocks incomplete exact input and leaves generic equipment rent unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft(
      "United Rentals Canada one-shift", { city: "Бишкек", countryCode: "KG" },
    );
    const row = incomplete.items.find((item) => item.normId === UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 });
    expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false, conditionalStatus: "blocked_missing_parameters" });
    const generic = buildDirectConsumerRepairOpenWorldAiDraft(
      "Аренда экскаватора на два дня", { city: "Бишкек", countryCode: "KG" },
    );
    expect(generic.items.some((item) => item.normId === UNITED_RENTALS_CA_ONE_SHIFT_NORM_ID)).toBe(false);
  });
});
