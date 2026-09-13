import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID,
  RAIN_BIRD_XFD_DRIPLINE_NORM_ID, RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID,
  constructionNormativeRegistryV1, resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";

function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T00:00:00.000Z", confidence: "high", applicability: "Exact Rain Bird XFD fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID),
    approved_dripline_route_linear_m: explicit(200, "linear_m"),
    irrigated_planting_area_and_layout: explicit("LAYOUT_REF:IRR-01 rev C"), exact_xfd_model: explicit("XFD-06-12-500"),
    emitter_spacing_cm: explicit(30.5, "cm"), emitter_flow_l_h: explicit(2.3, "l/h"),
    zone_inlet_pressure_bar: explicit(2, "bar"), maximum_lateral_length_table_check: explicit("TABLE_CELL_CONFIRMED:2 bar/30.5 cm/2.3 l-h"),
    zone_total_flow_l_h: explicit(920, "l/h"), zone_hydraulic_design: explicit("HYDRAULIC_DESIGN:IRR-HYD-01 rev B"),
    water_source_and_quality: explicit("WATER_SOURCE:filtered municipal water test WQ-7"), filtration_mesh: explicit(120),
    pressure_regulation_scope: explicit("PRESSURE_SCOPE:zone regulator PR-1"),
    header_and_manifold_schedule: explicit("SCHEDULE_REF:MAN-01"), fitting_schedule: explicit("SCHEDULE_REF:FIT-01"),
    flush_point_schedule: explicit("SCHEDULE_REF:FL-01"), elevation_and_slope_conditions: explicit("SITE_REF:TOPO-01 max slope 3%"),
    selected_coil_length_m: explicit(152.4, "linear_m"), reusable_coil_remainder_plan: explicit("CUT_PLAN:CP-01 reuse tagged remnants"),
    project_cutting_allowance_percent: explicit(5, "percent"), ...changes };
}
function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "DRIP_IRRIGATION", operation_class: "INSTALL",
    material_system: "RAIN_BIRD_XFD_06_12_500", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: values });
}
function prompt(route = 200) {
  return ["Rain Bird XFD D39717E model XFD-06-12-500;", `approved dripline route: ${route} m;`,
    "irrigated planting layout: LAYOUT_REF:IRR-01 rev C; emitter spacing: 30.5 cm; emitter flow: 2.3 l/h;",
    "zone inlet pressure: 2 bar; maximum lateral table check: TABLE_CELL_CONFIRMED:2 bar/30.5 cm/2.3 l-h;",
    "zone total flow: 920 l/h; zone hydraulic design: HYDRAULIC_DESIGN:IRR-HYD-01 rev B;",
    "water source and quality: WATER_SOURCE:filtered municipal water test WQ-7; filtration: 120 mesh;",
    "pressure regulation scope: PRESSURE_SCOPE:zone regulator PR-1; header and manifold schedule: SCHEDULE_REF:MAN-01;",
    "fitting schedule: SCHEDULE_REF:FIT-01; flush point schedule: SCHEDULE_REF:FL-01;",
    "elevation and slope conditions: SITE_REF:TOPO-01 max slope 3%; selected coil length: 152.4 m;",
    "reusable coil remainder plan: CUT_PLAN:CP-01 reuse tagged remnants; project cutting allowance: 5%"].join(" ");
}

describe("Rain Bird XFD exact route physical norm", () => {
  test("registers the exact manufacturer profile", () => {
    expect(constructionNormativeRegistryV1.get(RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID)).toMatchObject({
      source_type: "MANUFACTURER_PASSPORT", operation_class_applicability: ["INSTALL"],
      product_profile_applicability: [RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: RAIN_BIRD_XFD_DRIPLINE_NORM_ID, work_group: "landscaping",
      produced_parameter_ids: ["rain_bird_xfd_project_dripline_linear_m"] }));
  });
  test("uses route identity and only the explicit project cutting allowance", () => {
    const result = resolve(inputs());
    expect(result).toMatchObject({ status: "APPLIED", calculated_rain_bird_xfd_project_dripline_linear_m: 210, blockers: [] });
    expect(result.parameter_values.rain_bird_xfd_project_dripline_linear_m).toMatchObject({
      value: 210, unit_id: "linear_m", source_type: "APPLICABLE_NORM", source_id: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID });
    expect(result.parameter_values.rain_bird_xfd_project_dripline_linear_m.applicability).toContain("manufacturer_waste_default=false");
  });
  test("fails closed for missing hydraulics, wrong model and unverified filtration", () => {
    const missing = { ...inputs() }; delete (missing as Record<string, ProfessionalParameterValueV4>).zone_hydraulic_design;
    expect(resolve(missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:zone_hydraulic_design"]) });
    expect(resolve(inputs({ exact_xfd_model: explicit("XFD-09-18-500") }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PHYSICAL_NORM_VARIANT_CONFLICT:exact_xfd_model"]) });
    expect(resolve(inputs({ filtration_mesh: explicit(80) }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:filtration_mesh"]) });
  });
  test("runs through the exact consumer route", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("landscaping");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Монтаж капельного полива")).toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === RAIN_BIRD_XFD_DRIPLINE_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("landscaping_rain_bird_xfd_06_12_500");
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ quantity: 210, unit: "linear_m", normSourceId: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID });
    expect(rows[0]?.sourceParameters).toMatchObject({ includedInEstimate: true, includedInProcurement: false, parameterBlockerIds: [] });
  });
  test("changes quantity and money with independently changed approved route", () => {
    const one = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(100), owner: "landscaping", currency: "KGS" }));
    const two = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(200), owner: "landscaping", currency: "KGS" }));
    const first = one.rows.find((row) => row.normId === RAIN_BIRD_XFD_DRIPLINE_NORM_ID)!;
    const second = two.rows.find((row) => row.normId === RAIN_BIRD_XFD_DRIPLINE_NORM_ID)!;
    expect(first.quantity).toBe(105); expect(second.quantity).toBe(210);
    expect(second.quantity * second.unitPrice).toBeGreaterThan(first.quantity * first.unitPrice);
  });
  test("blocks incomplete exact input and leaves generic landscaping unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Rain Bird XFD D39717E XFD-06-12-500", { city: "Бишкек", countryCode: "KG" });
    const row = incomplete.items.find((item) => item.normId === RAIN_BIRD_XFD_DRIPLINE_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 });
    expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false, conditionalStatus: "blocked_missing_parameters" });
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Озеленение участка 500 м²", { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === RAIN_BIRD_XFD_DRIPLINE_NORM_ID)).toBe(false);
  });
});
