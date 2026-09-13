import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, EPA_CD_COMPOSITE_NORM_ID,
  EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID, EPA_CD_COMPOSITE_SOURCE_ID, EPA_CD_CONCRETE_NORM_ID,
  EPA_CD_CONCRETE_PRODUCT_PROFILE_ID, EPA_CD_CONCRETE_SOURCE_ID, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";
function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T03:00:00.000Z", confidence: "high", applicability: "Exact EPA C&D fixture" };
}
function inputs(kind: "concrete" | "composite", changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  const common = { product_profile_id: explicit(kind === "concrete" ? EPA_CD_CONCRETE_PRODUCT_PROFILE_ID : EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID),
    volume_measurement_method_and_state: explicit("EPA_COMPATIBLE_VOLUME:measured loose container volume"),
    waste_material_class_confirmed: explicit(kind === "concrete" ? "EPA_CD_CONCRETE" : "EPA_CD_COMPOSITE_REMAINDER"),
    local_weighbridge_mass_kg_if_available: explicit("NOT_AVAILABLE"),
    local_hauler_container_payload_and_disposal_rules: explicit("SEPARATE_SCOPE:hauler schedule WH-1"),
    conversion_calculation_reference: explicit(kind === "concrete" ? "EPA_2016:860_LB_YD3" : "EPA_2016:417_LB_YD3") };
  return kind === "concrete" ? { ...common, measured_epa_compatible_concrete_debris_volume_m3: explicit(2, "m3"),
    concrete_piece_size_class: explicit("SMALL"), rebar_condition: explicit("WITH_REBAR"), ...changes } :
    { ...common, measured_epa_compatible_composite_cd_volume_m3: explicit(2, "m3"),
      composite_or_bulk_cd_row_selected: explicit("COMPOSITE_417_LB_YD3"),
      container_compaction_state: explicit("EPA_COMPATIBLE_STATE:loose remainder composite"), ...changes };
}
function resolve(kind: "concrete" | "composite", values = inputs(kind)) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "WASTE_VOLUME_TO_PLANNING_MASS", operation_class: "CONVERT",
    material_system: kind === "concrete" ? "US_EPA_2016_CD_CONCRETE" : "US_EPA_2016_CD_COMPOSITE_REMAINDER",
    scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: values });
}
function prompt(kind: "concrete" | "composite", volume = 2) {
  return kind === "concrete" ? ["US EPA 2016 concrete debris 860 lb/cubic yard;", `measured EPA-compatible volume: ${volume} m3;`,
    "volume measurement method and state: EPA_COMPATIBLE_VOLUME:measured loose container volume; waste material class: EPA_CD_CONCRETE;",
    "concrete piece size class: SMALL; rebar condition: WITH_REBAR; local weighbridge mass: NOT_AVAILABLE;",
    "local hauler rules: SEPARATE_SCOPE:hauler schedule WH-1; conversion calculation reference: EPA_2016:860_LB_YD3"].join(" ") :
    ["US EPA 2016 composite C&D 417 lb/cubic yard;", `measured EPA-compatible volume: ${volume} m3;`,
      "volume measurement method and state: EPA_COMPATIBLE_VOLUME:measured loose container volume; waste material class: EPA_CD_COMPOSITE_REMAINDER;",
      "composite or bulk C&D row: COMPOSITE_417_LB_YD3; container compaction state: EPA_COMPATIBLE_STATE:loose remainder composite;",
      "local weighbridge mass: NOT_AVAILABLE; local hauler rules: SEPARATE_SCOPE:hauler schedule WH-1;",
      "conversion calculation reference: EPA_2016:417_LB_YD3"].join(" ");
}
describe("US EPA C&D volume-to-planning-mass norms", () => {
  test("registers concrete and composite as separate source-bound profiles", () => {
    expect(constructionNormativeRegistryV1.get(EPA_CD_CONCRETE_SOURCE_ID)).toMatchObject({ source_type: "RESOURCE_ESTIMATE_NORM" });
    expect(constructionNormativeRegistryV1.get(EPA_CD_COMPOSITE_SOURCE_ID)).toMatchObject({ source_type: "RESOURCE_ESTIMATE_NORM" });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toEqual(expect.arrayContaining([
      expect.objectContaining({ norm_id: EPA_CD_CONCRETE_NORM_ID, work_group: "waste_removal" }),
      expect.objectContaining({ norm_id: EPA_CD_COMPOSITE_NORM_ID, work_group: "waste_removal" })]));
  });
  test("calculates each exact EPA row independently", () => {
    const concrete = resolve("concrete"), composite = resolve("composite");
    expect(concrete).toMatchObject({ status: "APPLIED", calculated_epa_cd_planning_mass_kg: expect.any(Number), blockers: [] });
    expect(composite).toMatchObject({ status: "APPLIED", calculated_epa_cd_planning_mass_kg: expect.any(Number), blockers: [] });
    if (concrete.status !== "APPLIED" || composite.status !== "APPLIED") throw new Error("EXPECTED_APPLIED_EPA_WASTE_NORMS");
    expect(concrete.calculated_epa_cd_planning_mass_kg).toBeCloseTo(1020.435445, 6);
    expect(composite.calculated_epa_cd_planning_mass_kg).toBeCloseTo(494.792535, 6);
  });
  test("local weighbridge mass overrides the preliminary conversion", () => {
    const result = resolve("concrete", inputs("concrete", { local_weighbridge_mass_kg_if_available: explicit(900, "kg") }));
    expect(result).toMatchObject({ status: "APPLIED", calculated_epa_cd_planning_mass_kg: 900 });
    expect(result.parameter_values.epa_cd_planning_mass_kg.applicability).toContain("mass_source=local_weighbridge");
  });
  test("fails closed for missing measurement and forbids the bulk-row substitution", () => {
    const missing = { ...inputs("concrete") }; delete (missing as Record<string, ProfessionalParameterValueV4>).volume_measurement_method_and_state;
    expect(resolve("concrete", missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:volume_measurement_method_and_state"]) });
    expect(resolve("composite", inputs("composite", { composite_or_bulk_cd_row_selected: explicit("BULK_484_LB_YD3") })))
      .toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["PHYSICAL_NORM_VARIANT_CONFLICT:composite_or_bulk_cd_row_selected"]) });
  });
  test("runs both profiles through the exact consumer route", () => {
    for (const kind of ["concrete", "composite"] as const) {
      expect(resolveDirectConsumerRepairOpenWorldOwner(prompt(kind))).toBe("waste_removal");
      const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(kind), { city: "Бишкек", countryCode: "KG" });
      const normId = kind === "concrete" ? EPA_CD_CONCRETE_NORM_ID : EPA_CD_COMPOSITE_NORM_ID;
      const row = draft.items.find((item) => item.normId === normId);
      expect(row).toMatchObject({ unit: "kg", unitPrice: null });
      expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false, includedInProcurement: false,
        parameterBlockerIds: ["PRICE_SOURCE_REQUIRED:local_hauler_disposal_tariff"] });
    }
  });
  test("changes quantity while leaving unverified disposal money at zero", () => {
    const one = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt("concrete", 1), owner: "waste_removal", currency: "KGS" }));
    const two = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt("concrete", 2), owner: "waste_removal", currency: "KGS" }));
    const first = one.rows.find((row) => row.normId === EPA_CD_CONCRETE_NORM_ID)!;
    const second = two.rows.find((row) => row.normId === EPA_CD_CONCRETE_NORM_ID)!;
    expect(second.quantity).toBeCloseTo(first.quantity * 2, 5);
    expect(first.quantity * first.unitPrice).toBe(0); expect(second.quantity * second.unitPrice).toBe(0);
  });
  test("blocks incomplete exact input and leaves generic waste removal unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("US EPA 2016 concrete debris 860 lb", { city: "Бишкек", countryCode: "KG" });
    const row = incomplete.items.find((item) => item.normId === EPA_CD_CONCRETE_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 }); expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false,
      conditionalStatus: "blocked_missing_parameters" });
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Вывезти строительный мусор", { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === EPA_CD_CONCRETE_NORM_ID || item.normId === EPA_CD_COMPOSITE_NORM_ID)).toBe(false);
  });
});
