import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  FORD_TRANSIT_V363_DELIVERY_NORM_ID, FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID,
  FORD_TRANSIT_V363_DELIVERY_SOURCE_ID, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";

function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-12T21:00:00.000Z", confidence: "high", applicability: "Exact selected vehicle fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return {
    product_profile_id: explicit(FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID),
    cargo_weight_kg: explicit(5000, "kg"), cargo_volume_m3: explicit(18, "m3"),
    selected_vehicle_model_and_derivative: explicit("FORD_TRANSIT_V363_500_L4_H3"),
    selected_verified_usable_payload_kg: explicit(2357, "kg"),
    selected_verified_usable_loadspace_m3: explicit(15.1, "m3"),
    selected_verified_kerb_mass_kg: explicit(2500, "kg"),
    driver_crew_options_and_accessories_weight_kg: explicit(100, "kg"),
    payload_margin_for_error_kg: explicit(125, "kg"), axle_load_limits_confirmed: explicit(true),
    load_securing_and_compatibility_confirmed: explicit(true), route_and_access_confirmed: explicit(true),
    supplier_billing_scope: explicit("SUPPLIER_SCOPE:quote FT-2026-0912 per completed trip"), ...changes,
  };
}
function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "MATERIAL_DELIVERY", operation_class: "TRANSPORT",
    material_system: "FORD_TRANSIT_V363_500_L4_H3", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: values,
  });
}
function prompt(cargoKg = 5000, cargoM3 = 18): string {
  return [
    "Доставка Ford Transit V363 500 L4 H3;", `масса груза: ${cargoKg} кг;`, `объём груза: ${cargoM3} м³;`,
    "модель и модификация: FORD_TRANSIT_V363_500_L4_H3;",
    "проверенная грузоподъёмность: 2357 кг;", "проверенный полезный объём: 15.1 м³;",
    "проверенная снаряжённая масса: 2500 кг;", "масса водителя, экипажа, опций и аксессуаров: 100 кг;",
    "запас грузоподъёмности: 125 кг;", "нагрузки на оси подтверждены;",
    "крепление и совместимость груза подтверждены;", "маршрут и доступ подтверждены;",
    "тариф перевозчика: SUPPLIER_SCOPE:quote FT-2026-0912 per completed trip",
  ].join(" ");
}

describe("Ford Transit selected-derivative delivery norm", () => {
  test("registers a manufacturer binding without treating the headline as universal", () => {
    expect(constructionNormativeRegistryV1.get(FORD_TRANSIT_V363_DELIVERY_SOURCE_ID)).toMatchObject({
      source_type: "MANUFACTURER_PASSPORT", operation_class_applicability: ["TRANSPORT"],
      product_profile_applicability: [FORD_TRANSIT_V363_DELIVERY_PRODUCT_PROFILE_ID],
    });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: FORD_TRANSIT_V363_DELIVERY_NORM_ID, work_group: "delivery",
      produced_parameter_ids: ["ford_transit_required_trip_count"],
    }));
  });
  test("uses the stricter weight or volume constraint and whole-trip ceiling", () => {
    const weightDriven = resolve(inputs());
    const volumeDriven = resolve(inputs({ cargo_weight_kg: explicit(1000, "kg"), cargo_volume_m3: explicit(31, "m3") }));
    expect(weightDriven).toMatchObject({ status: "APPLIED", calculated_ford_transit_required_trip_count: 3, blockers: [] });
    expect(volumeDriven).toMatchObject({ status: "APPLIED", calculated_ford_transit_required_trip_count: 3, blockers: [] });
    expect(weightDriven.parameter_values.ford_transit_required_trip_count.applicability).toContain("effective_usable_payload_kg=2132");
    expect(weightDriven.parameter_values.ford_transit_required_trip_count.applicability).toContain("headline_payload_as_universal_rate=false");
  });
  test("fails closed for missing limits, a wrong margin, arbitrary variant or conflict", () => {
    const missing = { ...inputs() };
    delete (missing as Record<string, ProfessionalParameterValueV4>).selected_verified_usable_loadspace_m3;
    expect(resolve(missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:selected_verified_usable_loadspace_m3"]) });
    expect(resolve(inputs({ payload_margin_for_error_kg: explicit(0, "kg") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining(["PROJECT_VALUE_INVALID:payload_margin_for_error_kg"]),
    });
    expect(resolve(inputs({ selected_vehicle_model_and_derivative: explicit("FORD_TRANSIT_GENERIC") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining([expect.stringContaining("PHYSICAL_NORM_VARIANT_CONFLICT")]),
    });
    expect(resolve(inputs({ ford_transit_required_trip_count: explicit(2, "trip") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")],
    });
  });
  test("runs through the exact consumer route and produces one delivery row", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("delivery");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Доставка материалов фургоном")).toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === FORD_TRANSIT_V363_DELIVERY_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("delivery_ford_transit_v363_selected_limits");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 3, unit: "trip", normSourceId: FORD_TRANSIT_V363_DELIVERY_SOURCE_ID });
    expect(rows[0]?.sourceParameters).toMatchObject({ normSourceProfile: "MANUFACTURER_TECHNICAL",
      includedInEstimate: true, includedInProcurement: false, parameterBlockerIds: [] });
  });
  test("changes trip money only after crossing a verified capacity boundary", () => {
    const twoTrips = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(4000), owner: "delivery", currency: "KGS" }));
    const threeTrips = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(5000), owner: "delivery", currency: "KGS" }));
    const first = twoTrips.rows.find((row) => row.normId === FORD_TRANSIT_V363_DELIVERY_NORM_ID)!;
    const second = threeTrips.rows.find((row) => row.normId === FORD_TRANSIT_V363_DELIVERY_NORM_ID)!;
    expect([first.quantity, second.quantity]).toEqual([2, 3]);
    expect(second.quantity * second.unitPrice - first.quantity * first.unitPrice).toBe(first.unitPrice);
    expect(first.unitPrice).toBeGreaterThan(0);
  });
  test("keeps incomplete exact input blocked and does not bind a generic delivery", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Доставка Ford Transit V363", { city: "Бишкек", countryCode: "KG" });
    const row = incomplete.items.find((item) => item.normId === FORD_TRANSIT_V363_DELIVERY_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 });
    expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false, conditionalStatus: "blocked_missing_parameters" });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([expect.stringContaining("массу груза"), expect.stringContaining("полезный объём")]));
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Доставка 5 тонн материалов", { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === FORD_TRANSIT_V363_DELIVERY_NORM_ID)).toBe(false);
  });
});
