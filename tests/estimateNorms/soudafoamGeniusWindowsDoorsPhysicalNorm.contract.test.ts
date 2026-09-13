import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID,
  SOUDAFOAM_GENIUS_NORM_ID, SOUDAFOAM_GENIUS_SOURCE_ID, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";
function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T01:00:00.000Z", confidence: "high", applicability: "Exact Soudafoam Genius fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID),
    qualified_joint_length_linear_m: explicit(100, "linear_m"), joint_width_mm: explicit(20, "mm"),
    joint_depth_mm: explicit(50, "mm"), total_joint_volume_l: explicit(100, "l"), exact_product_master_code: explicit("9900539"),
    package_volume_ml: explicit(600, "ml"), en_17333_1_reference_joint_geometry: explicit("EN_17333_1_GEOMETRY:onsite mock-up J-01"),
    can_temperature_c: explicit(20, "celsius"), ambient_temperature_c: explicit(18, "celsius"),
    surface_temperature_c: explicit(16, "celsius"), substrate_type_and_condition: explicit("SUBSTRATE:PVCu clean sound"),
    surface_moistening_condition: explicit("MOISTENING:before each layer"), application_layer_count: explicit(2),
    onsite_validated_joint_yield_m_per_can: explicit(12.5, "m_per_can"), storage_and_expiry_condition: explicit("STORAGE:valid batch indoor"),
    external_uv_and_weather_protection_scope: explicit("SEPARATE_SCOPE:external flashing"),
    frame_fixings_tapes_membranes_and_sealants_scope: explicit("SEPARATE_SCOPE:joint system schedule WD-02"), ...changes };
}
function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "WINDOW_DOOR_JOINT_FOAM", operation_class: "INSTALL",
    material_system: "SOUDAFOAM_WINDOW_DOOR_GENIUS_9900539_600ML", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: values });
}
function prompt(length = 100) {
  return ["Soudafoam Window Door Genius master 9900539 package 600 ml;", `qualified joint length: ${length} m; joint width: 20 mm; joint depth: 50 mm; total joint volume: ${length} l;`,
    "EN 17333-1 reference joint geometry: EN_17333_1_GEOMETRY:onsite mock-up J-01; can temperature: 20 c;",
    "ambient temperature: 18 c; surface temperature: 16 c; substrate type and condition: SUBSTRATE:PVCu clean sound;",
    "surface moistening condition: MOISTENING:before each layer; application layer count: 2;",
    "onsite validated joint yield: 12.5 m/can; storage and expiry condition: STORAGE:valid batch indoor;",
    "external UV and weather protection scope: SEPARATE_SCOPE:external flashing;",
    "frame fixings tapes membranes and sealants scope: SEPARATE_SCOPE:joint system schedule WD-02"].join(" ");
}
describe("Soudafoam Window & Door Genius exact joint norm", () => {
  test("registers the exact 9900539 600 ml product", () => {
    expect(constructionNormativeRegistryV1.get(SOUDAFOAM_GENIUS_SOURCE_ID)).toMatchObject({ source_type: "MANUFACTURER_PASSPORT",
      operation_class_applicability: ["INSTALL"], product_profile_applicability: [SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: SOUDAFOAM_GENIUS_NORM_ID, work_group: "windows_doors", produced_parameter_ids: ["soudafoam_genius_required_can_count"] }));
  });
  test("rounds cans from onsite validated yield rather than the approximate TDS headline", () => {
    const result = resolve(inputs());
    expect(result).toMatchObject({ status: "APPLIED", calculated_soudafoam_genius_required_can_count: 8, blockers: [] });
    expect(result.parameter_values.soudafoam_genius_required_can_count).toMatchObject({ value: 8, unit_id: "can",
      source_type: "APPLICABLE_NORM", source_id: SOUDAFOAM_GENIUS_SOURCE_ID });
    expect(result.parameter_values.soudafoam_genius_required_can_count.applicability).toContain("tds_16m_used_as_project_rate=false");
  });
  test("fails closed for missing geometry, wrong package and conflicting volume", () => {
    const missing = { ...inputs() }; delete (missing as Record<string, ProfessionalParameterValueV4>).joint_depth_mm;
    expect(resolve(missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:joint_depth_mm"]) });
    expect(resolve(inputs({ package_volume_ml: explicit(750, "ml") }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PHYSICAL_NORM_VARIANT_CONFLICT:package_volume_ml"]) });
    expect(resolve(inputs({ total_joint_volume_l: explicit(90, "l") }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PROJECT_VALUE_CONFLICT:total_joint_volume_l"]) });
  });
  test("runs through the exact consumer route", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("windows_doors");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Герметизация оконного шва пеной")).toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === SOUDAFOAM_GENIUS_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("windows_doors_soudafoam_genius_9900539");
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ quantity: 8, unit: "can", normSourceId: SOUDAFOAM_GENIUS_SOURCE_ID });
    expect(rows[0]?.sourceParameters).toMatchObject({ includedInEstimate: true, includedInProcurement: true, parameterBlockerIds: [] });
  });
  test("changes quantity and money with independently changed qualified joint length", () => {
    const one = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(50), owner: "windows_doors", currency: "KGS" }));
    const two = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(100), owner: "windows_doors", currency: "KGS" }));
    const first = one.rows.find((row) => row.normId === SOUDAFOAM_GENIUS_NORM_ID)!;
    const second = two.rows.find((row) => row.normId === SOUDAFOAM_GENIUS_NORM_ID)!;
    expect(first.quantity).toBe(4); expect(second.quantity).toBe(8);
    expect(second.quantity * second.unitPrice).toBeGreaterThan(first.quantity * first.unitPrice);
  });
  test("blocks incomplete exact input and leaves generic window work unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Soudafoam Genius 9900539 600 ml", { city: "Бишкек", countryCode: "KG" });
    const row = incomplete.items.find((item) => item.normId === SOUDAFOAM_GENIUS_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 }); expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false,
      conditionalStatus: "blocked_missing_parameters" });
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Установить два окна ПВХ", { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === SOUDAFOAM_GENIUS_NORM_ID)).toBe(false);
  });
});
