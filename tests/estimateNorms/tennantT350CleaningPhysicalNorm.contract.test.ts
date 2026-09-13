import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, TENNANT_T350_CONVENTIONAL_NORM_ID,
  TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID, TENNANT_T350_CONVENTIONAL_SOURCE_ID,
  constructionNormativeRegistryV1, resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";
function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`, captured_at: "2026-09-12T22:00:00.000Z",
    confidence: "high", applicability: "Exact Tennant fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID), cleanable_hard_floor_area_m2: explicit(5590, "m2"),
    machine_variant: explicit("TENNANT_T350_24_INCH_600_MM_DUAL_DISK"), cleaning_path_mm: explicit(600, "mm"),
    cleaning_technology_mode: explicit("CONVENTIONAL"), required_pass_count: explicit(2), soil_type: explicit("LIGHT_DUST"),
    obstruction_factor: explicit(1.1), dump_fill_cycle_allowance: explicit(0.25, "equipment_hour"),
    battery_runtime_allowance: explicit(0.35, "equipment_hour"), manual_detail_cleaning_scope: explicit("SEPARATE_SCOPE:edges and corners"),
    operator_labor_scope: explicit("SEPARATE_SCOPE:one trained operator"), ...changes };
}
function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "MECHANIZED_HARD_FLOOR_CLEANING", operation_class: "CLEAN",
    material_system: "TENNANT_T350_600MM_DUAL_DISK_CONVENTIONAL", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: values });
}
function prompt(area = 5590) {
  return [`Уборка Tennant T350 24 inch 600 мм dual-disk conventional; чистая площадь твёрдого пола: ${area} м²;`,
    "число проходов: 2; вид загрязнения: LIGHT_DUST; коэффициент препятствий: 1.1;",
    "часы слива и заполнения: 0.25 ч; часы ограничения батареи: 0.35 ч;",
    "ручная детальная уборка: SEPARATE_SCOPE:edges and corners; труд оператора: SEPARATE_SCOPE:one trained operator"].join(" ");
}
describe("Tennant T350 conventional practical cleaning norm", () => {
  test("registers the exact manufacturer variant", () => {
    expect(constructionNormativeRegistryV1.get(TENNANT_T350_CONVENTIONAL_SOURCE_ID)).toMatchObject({ source_type: "MANUFACTURER_PASSPORT",
      operation_class_applicability: ["CLEAN"], product_profile_applicability: [TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: TENNANT_T350_CONVENTIONAL_NORM_ID, work_group: "cleaning", produced_parameter_ids: ["tennant_t350_project_equipment_hours"] }));
  });
  test("calculates manufacturer base and only explicit project adjustments", () => {
    const result = resolve(inputs());
    expect(result).toMatchObject({ status: "APPLIED", calculated_tennant_t350_project_equipment_hours: 5, blockers: [] });
    expect(result.parameter_values.tennant_t350_project_equipment_hours).toMatchObject({ value: 5, unit_id: "equipment_hour",
      source_type: "APPLICABLE_NORM", source_id: TENNANT_T350_CONVENTIONAL_SOURCE_ID });
    expect(result.parameter_values.tennant_t350_project_equipment_hours.applicability).toContain("ec_h2o_variant=false");
  });
  test("fails closed for missing adjustments, wrong mode and conflicting hours", () => {
    const missing = { ...inputs() }; delete (missing as Record<string, ProfessionalParameterValueV4>).obstruction_factor;
    expect(resolve(missing)).toMatchObject({ status: "BLOCKED_REQUIRED_INPUTS", blockers: expect.arrayContaining(["PROJECT_VALUE_REQUIRED_EXPLICIT:obstruction_factor"]) });
    expect(resolve(inputs({ cleaning_technology_mode: explicit("EC_H2O") }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([expect.stringContaining("cleaning_technology_mode=EC_H2O")]) });
    expect(resolve(inputs({ tennant_t350_project_equipment_hours: explicit(4, "equipment_hour") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")] });
  });
  test("runs through the exact consumer route", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("cleaning");
    expect(resolveDirectConsumerRepairOpenWorldOwner("Уборка пола машиной")).toBeNull();
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === TENNANT_T350_CONVENTIONAL_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("cleaning_tennant_t350_600mm_conventional");
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ quantity: 5, unit: "equipment_hour", normSourceId: TENNANT_T350_CONVENTIONAL_SOURCE_ID });
    expect(rows[0]?.sourceParameters).toMatchObject({ includedInEstimate: true, includedInProcurement: false, parameterBlockerIds: [] });
  });
  test("changes equipment quantity and money with independently changed area", () => {
    const one = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(2795), owner: "cleaning", currency: "KGS" }));
    const two = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(5590), owner: "cleaning", currency: "KGS" }));
    const first = one.rows.find((row) => row.normId === TENNANT_T350_CONVENTIONAL_NORM_ID)!;
    const second = two.rows.find((row) => row.normId === TENNANT_T350_CONVENTIONAL_NORM_ID)!;
    expect(first.quantity).toBeCloseTo(2.8, 9); expect(second.quantity).toBeCloseTo(5, 9);
    expect(second.quantity * second.unitPrice).toBeGreaterThan(first.quantity * first.unitPrice);
  });
  test("blocks incomplete exact input and leaves generic cleaning unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Tennant T350 600 мм conventional", { city: "Бишкек", countryCode: "KG" });
    const row = incomplete.items.find((item) => item.normId === TENNANT_T350_CONVENTIONAL_NORM_ID);
    expect(row).toMatchObject({ quantity: 0 }); expect(row?.sourceParameters).toMatchObject({ includedInEstimate: false, conditionalStatus: "blocked_missing_parameters" });
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Генеральная уборка пола 500 м²", { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === TENNANT_T350_CONVENTIONAL_NORM_ID)).toBe(false);
  });
});
