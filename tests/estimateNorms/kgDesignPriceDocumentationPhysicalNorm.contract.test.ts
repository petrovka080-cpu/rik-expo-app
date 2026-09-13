import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, KG_DESIGN_PRICE_NORM_ID,
  KG_DESIGN_PRICE_PRODUCT_PROFILE_ID, KG_DESIGN_PRICE_SOURCE_ID, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";
function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T07:00:00.000Z", confidence: "high", applicability: "Exact KG design-price table fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(KG_DESIGN_PRICE_PRODUCT_PROFILE_ID),
    project_object_type: explicit("CHEMICAL_INDUSTRY:urea production plant"), design_stage: explicit("WORKING_DOCUMENTATION"),
    selected_price_collection_section: explicit("KG_DESIGN_PRICE_SECTION_9_CHEMICAL_INDUSTRY_2016"),
    selected_collection_edition_and_amendments: explicit("CURRENT_CONFIRMED:2016 edition plus Order 52-NPA amendments reviewed 2026-09-12"),
    selected_price_table_and_row: explicit("SECTION9:TABLE-9.4-ROW-250K-UREA"),
    project_capacity_measure: explicit(250000, "ton_per_year"), project_capacity_unit: explicit("ton_per_year"),
    selected_table_capacity_range: explicit("MIN=200000,MAX=300000"), selected_table_measurement_unit: explicit("ton_per_year"),
    quantity_normalization_calculation: explicit("SAME_UNIT:ton_per_year->ton_per_year,FACTOR=1"),
    selected_table_base_price_values: explicit("TABLE_BASE_VALUES:A_KGS=1250000,B_KGS_PER_UNIT=3.5"),
    applicable_design_stage_coefficient: explicit("STAGE_COEFFICIENT=0.6"),
    deliverable_composition: explicit("DELIVERABLES:approved working-documentation sections per row 9.4"),
    design_section_cost_allocation: explicit("SECTION_ALLOCATION:technology=0.45,architecture=0.15,utilities=0.40"),
    additional_and_excluded_work_scope: explicit("PROJECT_SCOPE:survey excluded, environmental section additional by separate task"),
    current_price_level_conversion_and_indices: explicit("PRICE_CONVERSION:2016_BASE_TO_2026_Q3_INDEX=1.42,KG_BISHKEK"),
    estimator_approval_reference: explicit("EST-DESIGN-S9-REV-E"), ...changes };
}
function resolve(values = inputs()) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "KG_DESIGN_PRICE_TABLE_MEASUREMENT",
    operation_class: "MEASURE", material_system: "KG_DESIGN_PRICE_SELECTED_TABLE", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values });
}
function prompt(capacity = 250000) {
  return ["Design KG Minstroy Section 9 table; project object type: CHEMICAL_INDUSTRY:urea production plant;",
    "design stage: WORKING_DOCUMENTATION; selected price collection section: KG_DESIGN_PRICE_SECTION_9_CHEMICAL_INDUSTRY_2016;",
    "selected collection edition and amendments: CURRENT_CONFIRMED:2016 edition plus Order 52-NPA amendments reviewed 2026-09-12;",
    "selected price table and row: SECTION9:TABLE-9.4-ROW-250K-UREA;", `project capacity measure: ${capacity} ton_per_year;`,
    "project capacity unit: ton_per_year; selected table capacity range: MIN=200000,MAX=300000;",
    "selected table measurement unit: ton_per_year; quantity normalization calculation: SAME_UNIT:ton_per_year->ton_per_year,FACTOR=1;",
    "selected table base price values: TABLE_BASE_VALUES:A_KGS=1250000,B_KGS_PER_UNIT=3.5;",
    "applicable design stage coefficient: STAGE_COEFFICIENT=0.6;",
    "deliverable composition: DELIVERABLES:approved working-documentation sections per row 9.4;",
    "design section cost allocation: SECTION_ALLOCATION:technology=0.45,architecture=0.15,utilities=0.40;",
    "additional and excluded work scope: PROJECT_SCOPE:survey excluded, environmental section additional by separate task;",
    "current price level conversion and indices: PRICE_CONVERSION:2016_BASE_TO_2026_Q3_INDEX=1.42,KG_BISHKEK;",
    "estimator approval reference: EST-DESIGN-S9-REV-E"].join(" ");
}

describe("exact KG design-price collection table capacity route", () => {
  test("registers the official source and executable documentation binding", () => {
    expect(constructionNormativeRegistryV1.get(KG_DESIGN_PRICE_SOURCE_ID)).toMatchObject({ source_type: "RESOURCE_ESTIMATE_NORM",
      jurisdiction: "KG", operation_class_applicability: ["MEASURE"], exact_rate_code_required: true,
      material_system_applicability: ["KG_DESIGN_PRICE_SELECTED_TABLE"] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: KG_DESIGN_PRICE_NORM_ID, work_group: "documentation",
      produced_parameter_ids: ["documentation_selected_table_capacity_routed"] }));
  });
  test("routes only the exact in-range capacity in the selected table unit", () => {
    const first = resolve(), second = resolve();
    expect(first).toMatchObject({ status: "APPLIED", calculated_documentation_selected_table_capacity: 250000,
      calculated_documentation_selected_table_unit: "ton_per_year", blockers: [] });
    expect(first.parameter_values.documentation_selected_table_capacity_routed).toMatchObject({ value: 250000,
      unit_id: "ton_per_year", source_type: "APPLICABLE_NORM", source_id: KG_DESIGN_PRICE_SOURCE_ID });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });
  test("fails closed for another sector, out-of-range capacity and output conflict", () => {
    expect(resolve(inputs({ project_object_type: explicit("RESIDENTIAL:apartment building") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining(["PHYSICAL_NORM_SECTOR_INVALID:project_object_type"]) });
    expect(resolve(inputs({ project_capacity_measure: explicit(350000, "ton_per_year") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining([
        "PHYSICAL_NORM_CAPACITY_RANGE_INVALID:selected_table_capacity_range"]) });
    expect(resolve(inputs({ documentation_selected_table_capacity_routed: explicit(249000, "ton_per_year") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")] });
  });
  test("uses the exact documentation owner and keeps full price calculation blocked", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("documentation");
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const row = draft.items.find((item) => item.normId === KG_DESIGN_PRICE_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("documentation_kg_selected_design_price_table");
    expect(row).toMatchObject({ quantity: 250000, unit: "ton_per_year", unitPrice: null, normSourceId: KG_DESIGN_PRICE_SOURCE_ID });
    expect(row?.sourceParameters).toMatchObject({ normSourceProfile: "KG_PRIMARY", includedInEstimate: false,
      includedInProcurement: false, parameterBlockerIds: ["PRICE_SOURCE_REQUIRED:kg_design_selected_table_full_price_calculation"] });
  });
  test("changes capacity without inventing a generic percentage or price", () => {
    const first = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(240000), owner: "documentation", currency: "KGS" }));
    const second = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(260000), owner: "documentation", currency: "KGS" }));
    const row1 = first.rows.find((row) => row.normId === KG_DESIGN_PRICE_NORM_ID)!;
    const row2 = second.rows.find((row) => row.normId === KG_DESIGN_PRICE_NORM_ID)!;
    expect(row2.quantity - row1.quantity).toBe(20000);
    expect(row1.quantity * row1.unitPrice).toBe(0); expect(row2.quantity * row2.unitPrice).toBe(0);
    expect(row2.calculationTrace).toContain("genericConstructionPercent=false");
  });
  test("keeps incomplete exact input blocked and generic design work unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Design KG Minstroy Section 9 table",
      { city: "Бишкек", countryCode: "KG" });
    expect(incomplete.items.find((item) => item.normId === KG_DESIGN_PRICE_NORM_ID)).toMatchObject({ quantity: 0 });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([expect.stringContaining("отраслевой объект"),
      expect.stringContaining("проектную мощность"), expect.stringContaining("базовые значения")]));
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Смета на проектирование жилого дома",
      { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === KG_DESIGN_PRICE_NORM_ID)).toBe(false);
  });
});
