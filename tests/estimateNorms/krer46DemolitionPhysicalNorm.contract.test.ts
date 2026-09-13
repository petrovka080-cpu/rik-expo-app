import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, KRER46_DEMOLITION_NORM_ID,
  KRER46_DEMOLITION_PRODUCT_PROFILE_ID, KRER46_DEMOLITION_SOURCE_ID, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";
function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T06:00:00.000Z", confidence: "high", applicability: "Exact selected KRER 46 table fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(KRER46_DEMOLITION_PRODUCT_PROFILE_ID), measured_project_quantity: explicit(120, "m2"),
    demolished_element_type_and_material: explicit("reinforced-concrete partition wall, drawing DEM-21"),
    reconstruction_expansion_or_technical_re_equipment_scope: explicit("RECONSTRUCTION"),
    selected_norm_collection: explicit("KG_KRER_46"),
    selected_collection_edition_and_amendments: explicit("CURRENT_CONFIRMED:edition-2022 plus amendments through 2026-09-12"),
    selected_krer46_table_code: explicit("KRER46:46-04-009-01"),
    selected_table_work_composition: explicit("TABLE_SCOPE:dismantle selected reinforced-concrete partition element"),
    project_quantity_unit: explicit("m2"), selected_table_measurement_unit: explicit("m2"),
    quantity_normalization_calculation: explicit("SAME_UNIT:m2->m2,FACTOR=1"),
    retained_and_disposed_material_scope: explicit("PROJECT_SCOPE:steel retained; concrete debris weighed and disposed separately"),
    work_access_and_constraint_conditions: explicit("PROJECT_CONDITIONS:occupied reconstruction zone, restricted access"),
    applicable_methodical_instruction_coefficients: explicit("PROJECT_COEFFICIENTS:K=1.15 per approved methodical instruction"),
    selected_table_resource_rows: explicit("TABLE_RESOURCES:labor-1,machine-2,material-3 from 46-04-009-01"),
    current_price_level_and_regional_indices: explicit("PRICE_LEVEL:2026-Q3 Bishkek; indices set KG-2026-Q3"),
    estimator_approval_reference: explicit("EST-KRER46-REV-D"), ...changes };
}
function resolve(values = inputs()) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "KG_KRER46_DEMOLITION_TABLE_MEASUREMENT",
    operation_class: "MEASURE", material_system: "KG_KRER46_SELECTED_DEMOLITION_TABLE", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values });
}
function prompt(quantity = 120) {
  return ["Demolition KRER 46 table;", `measured project quantity: ${quantity} m2;`,
    "demolished element type and material: reinforced-concrete partition wall, drawing DEM-21; KRER46 project scope: RECONSTRUCTION;",
    "selected norm collection: KG_KRER_46; selected collection edition and amendments: CURRENT_CONFIRMED:edition-2022 plus amendments through 2026-09-12;",
    "selected KRER46 table code: KRER46:46-04-009-01; selected table work composition: TABLE_SCOPE:dismantle selected reinforced-concrete partition element;",
    "project quantity unit: m2; selected table measurement unit: m2; quantity normalization calculation: SAME_UNIT:m2->m2,FACTOR=1;",
    "retained and disposed material scope: PROJECT_SCOPE:steel retained, concrete debris weighed and disposed separately;",
    "work access and constraint conditions: PROJECT_CONDITIONS:occupied reconstruction zone, restricted access;",
    "applicable methodical instruction coefficients: PROJECT_COEFFICIENTS:K=1.15 per approved methodical instruction;",
    "selected table resource rows: TABLE_RESOURCES:labor-1,machine-2,material-3 from 46-04-009-01;",
    "current price level and regional indices: PRICE_LEVEL:2026-Q3 Bishkek, indices KG-2026-Q3; estimator approval reference: EST-KRER46-REV-D"].join(" ");
}

describe("exact KRER 46 demolition table same-unit route", () => {
  test("registers the official source and executable binding", () => {
    expect(constructionNormativeRegistryV1.get(KRER46_DEMOLITION_SOURCE_ID)).toMatchObject({ source_type: "RESOURCE_ESTIMATE_NORM",
      jurisdiction: "KG", operation_class_applicability: ["MEASURE"], exact_rate_code_required: true,
      material_system_applicability: ["KG_KRER46_SELECTED_DEMOLITION_TABLE"] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: KRER46_DEMOLITION_NORM_ID, work_group: "demolition",
      produced_parameter_ids: ["demolition_selected_table_quantity_routed"] }));
  });
  test("routes only the explicitly normalized same-unit project quantity", () => {
    const first = resolve(), second = resolve();
    expect(first).toMatchObject({ status: "APPLIED", calculated_demolition_selected_table_quantity: 120,
      calculated_demolition_selected_table_unit: "m2", blockers: [] });
    expect(first.parameter_values.demolition_selected_table_quantity_routed).toMatchObject({ value: 120, unit_id: "m2",
      source_type: "APPLICABLE_NORM", source_id: KRER46_DEMOLITION_SOURCE_ID });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });
  test("fails closed for repair scope, incompatible units and conflicting output", () => {
    expect(resolve(inputs({ reconstruction_expansion_or_technical_re_equipment_scope: explicit("REPAIR") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining([
        "PHYSICAL_NORM_SCOPE_INVALID:reconstruction_expansion_or_technical_re_equipment_scope=REPAIR"]) });
    expect(resolve(inputs({ selected_table_measurement_unit: explicit("m3"),
      quantity_normalization_calculation: explicit("SAME_UNIT:m2->m3,FACTOR=1") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining(["PHYSICAL_NORM_UNIT_CONFLICT:m2->m3"]) });
    expect(resolve(inputs({ demolition_selected_table_quantity_routed: explicit(121, "m2") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE", blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")] });
  });
  test("uses the exact owner and keeps the resource cost blocked", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("demolition");
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const row = draft.items.find((item) => item.normId === KRER46_DEMOLITION_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("demolition_krer46_selected_table");
    expect(row).toMatchObject({ quantity: 120, unit: "m2", unitPrice: null, normSourceId: KRER46_DEMOLITION_SOURCE_ID });
    expect(row?.sourceParameters).toMatchObject({ normSourceProfile: "KG_PRIMARY", includedInEstimate: false,
      includedInProcurement: false, parameterBlockerIds: ["PRICE_SOURCE_REQUIRED:krer46_selected_table_resource_rates"] });
  });
  test("changes quantity without fabricating table-resource money", () => {
    const first = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(120), owner: "demolition", currency: "KGS" }));
    const second = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(135), owner: "demolition", currency: "KGS" }));
    const row1 = first.rows.find((row) => row.normId === KRER46_DEMOLITION_NORM_ID)!;
    const row2 = second.rows.find((row) => row.normId === KRER46_DEMOLITION_NORM_ID)!;
    expect(row2.quantity - row1.quantity).toBe(15);
    expect(row1.quantity * row1.unitPrice).toBe(0); expect(row2.quantity * row2.unitPrice).toBe(0);
  });
  test("keeps incomplete exact input blocked and generic demolition unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Demolition KRER 46 table",
      { city: "Бишкек", countryCode: "KG" });
    expect(incomplete.items.find((item) => item.normId === KRER46_DEMOLITION_NORM_ID)).toMatchObject({ quantity: 0 });
    expect(incomplete.missingData).toEqual(expect.arrayContaining([expect.stringContaining("измеренный проектный объём"),
      expect.stringContaining("точный код таблицы"), expect.stringContaining("строки ресурсов")]));
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Смета на демонтаж перегородки 120 м²",
      { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === KRER46_DEMOLITION_NORM_ID)).toBe(false);
  });
});
