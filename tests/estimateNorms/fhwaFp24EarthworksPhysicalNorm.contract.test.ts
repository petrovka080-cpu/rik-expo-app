import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, FHWA_FP24_SECTION208_NORM_ID,
  FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID, FHWA_FP24_SECTION208_SOURCE_ID, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";
function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T02:00:00.000Z", confidence: "high", applicability: "Exact FHWA FP-24 fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID), compacted_backfill_depth_m: explicit(1.2, "m"),
    fhwa_fp24_project_applicability_confirmed: explicit(true), project_supplemental_specification_revision: explicit("SUPPLEMENT_REF:PS-208 rev A"),
    structure_and_excavation_limits: explicit("LIMITS_REF:CIV-12"),
    material_source_and_section_704_01_qualification: explicit("SECTION_704_01:source M-4 approved"),
    material_class_and_rock_content: explicit("MATERIAL_CLASS:granular non-rocky"), selected_compacted_lift_thickness_m: explicit(0.15, "m"),
    moisture_condition_and_optimum_moisture: explicit("MOISTURE_REF:lab OMC-7"),
    aashto_t99_method_c_maximum_dry_density: explicit(1900, "kg/m3"), required_density_percent: explicit(95, "percent"),
    aashto_t310_or_approved_in_place_test_method: explicit("AASHTO_T310:nuclear gauge plan TP-3"), density_test_count_per_lift: explicit(2),
    even_placement_around_structure_sequence: explicit("SEQUENCE_REF:MS-208 step 4"),
    concrete_design_strength_before_backfill_percent: explicit(80, "percent"), running_waterway_condition: explicit("WATERWAY:none"),
    selected_compaction_equipment: explicit("EQUIPMENT:reversible plate compactor"),
    rocky_material_exception_procedure: explicit("ROCK_EXCEPTION:not applicable; hold point if encountered"),
    regional_code_and_geotechnical_specification: explicit("GEOTECH_REF:GEO-11 and local approval"), ...changes };
}
function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "STRUCTURAL_BACKFILL", operation_class: "BACKFILL",
    material_system: "FHWA_FP24_SECTION208_STRUCTURAL_BACKFILL", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: values });
}
function prompt(depth = 1.2) {
  return ["FHWA FP-24 Section 208 structural backfill; FHWA FP-24 project applicability confirmed;",
    `compacted backfill depth: ${depth} m; selected compacted lift thickness: 0.15 m;`,
    "project supplemental specification revision: SUPPLEMENT_REF:PS-208 rev A; structure and excavation limits: LIMITS_REF:CIV-12;",
    "material source and Section 704.01 qualification: SECTION_704_01:source M-4 approved; material class and rock content: MATERIAL_CLASS:granular non-rocky;",
    "moisture condition and optimum moisture: MOISTURE_REF:lab OMC-7; AASHTO T99 Method C maximum dry density: 1900 kg/m3;",
    "required density: 95%; AASHTO T310 test method: AASHTO_T310:nuclear gauge plan TP-3; density test count per lift: 2;",
    "even placement sequence: SEQUENCE_REF:MS-208 step 4; concrete design strength before backfill: 80%; running waterway condition: WATERWAY:none;",
    "selected compaction equipment: EQUIPMENT:reversible plate compactor; rocky material exception procedure: ROCK_EXCEPTION:not applicable;",
    "regional code and geotechnical specification: GEOTECH_REF:GEO-11 and local approval"].join(" ");
}
describe("FHWA FP-24 Section 208 structural backfill norm", () => {
  test("registers the exact public work standard", () => {
    expect(constructionNormativeRegistryV1.get(FHWA_FP24_SECTION208_SOURCE_ID)).toMatchObject({ source_type: "WORK_EXECUTION_STANDARD",
      operation_class_applicability: ["BACKFILL"], product_profile_applicability: [FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: FHWA_FP24_SECTION208_NORM_ID, work_group: "earthworks", produced_parameter_ids: ["fhwa_fp24_structural_backfill_lift_count"] }));
  });
  test("calculates selected compacted lifts and preserves testing requirements", () => {
    const result = resolve(inputs());
    expect(result).toMatchObject({ status: "APPLIED", calculated_fhwa_fp24_structural_backfill_lift_count: 8, blockers: [] });
    expect(result.parameter_values.fhwa_fp24_structural_backfill_lift_count).toMatchObject({ value: 8, unit_id: "lift",
      source_type: "APPLICABLE_NORM", source_id: FHWA_FP24_SECTION208_SOURCE_ID });
    expect(result.parameter_values.fhwa_fp24_structural_backfill_lift_count.applicability).toContain("density_test_count_per_lift=2");
  });
  test("fails closed for missing geotechnical input, excessive lift and weak concrete", () => {
    const missing = { ...inputs() }; delete (missing as Record<string, ProfessionalParameterValueV4>).regional_code_and_geotechnical_specification;
    expect(resolve(missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS",
      blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:regional_code_and_geotechnical_specification"]) });
    expect(resolve(inputs({ selected_compacted_lift_thickness_m: explicit(0.2, "m") }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:selected_compacted_lift_thickness_m"]) });
    expect(resolve(inputs({ concrete_design_strength_before_backfill_percent: explicit(70, "percent") }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining(["PHYSICAL_NORM_NOT_APPLICABLE:concrete_design_strength_before_backfill_percent"]) });
  });
  test("runs through the exact consumer route", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("earthworks");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Обратная засыпка траншеи")).toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === FHWA_FP24_SECTION208_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("earthworks_fhwa_fp24_section208_structural_backfill");
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ quantity: 8, unit: "lift", normSourceId: FHWA_FP24_SECTION208_SOURCE_ID });
    expect(rows[0]?.sourceParameters).toMatchObject({ includedInEstimate: true, includedInProcurement: false, parameterBlockerIds: [] });
  });
  test("changes quantity and money with independently changed compacted depth", () => {
    const one = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(0.6), owner: "earthworks", currency: "KGS" }));
    const two = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(1.2), owner: "earthworks", currency: "KGS" }));
    const first = one.rows.find((row) => row.normId === FHWA_FP24_SECTION208_NORM_ID)!;
    const second = two.rows.find((row) => row.normId === FHWA_FP24_SECTION208_NORM_ID)!;
    expect(first.quantity).toBe(4); expect(second.quantity).toBe(8);
    expect(second.quantity * second.unitPrice).toBeGreaterThan(first.quantity * first.unitPrice);
  });
  test("blocks incomplete exact input and leaves generic earthworks unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("FHWA FP-24 Section 208 structural backfill", { city: "Бишкек", countryCode: "KG" });
    const row = incomplete.items.find((item) => item.normId === FHWA_FP24_SECTION208_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 }); expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false,
      conditionalStatus: "blocked_missing_parameters" });
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Разработка котлована 500 м³", { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === FHWA_FP24_SECTION208_NORM_ID)).toBe(false);
  });
});
