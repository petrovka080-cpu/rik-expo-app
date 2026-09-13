import { buildDirectConsumerRepairOpenWorldAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { buildOwnedDomainEstimatorReasoningPlan } from "../../src/lib/estimate/ownedDomain/buildOwnedDomainEstimatorReasoningPlan";
import { resolveDirectConsumerRepairOpenWorldOwner } from "../../src/lib/estimate/ownedDomain/directConsumerRepairOpenWorldRouting";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import { BIA_TN10_MASONRY_NORM_ID, BIA_TN10_MASONRY_PRODUCT_PROFILE_ID, BIA_TN10_MASONRY_SOURCE_ID,
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1, constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../../src/lib/estimate/v4/domainFactory";

function explicit(value: string | number | boolean, unit_id: string | null = null): ProfessionalParameterValueV4 {
  return { value, unit_id, source_type: "USER_EXPLICIT", source_id: `test:${String(value)}`,
    captured_at: "2026-09-13T05:00:00.000Z", confidence: "high", applicability: "Exact selected BIA TN 10 Table 4 fixture" };
}
function inputs(changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {}) {
  return { product_profile_id: explicit(BIA_TN10_MASONRY_PRODUCT_PROFILE_ID),
    measured_net_brick_wall_area_m2: explicit(90, "m2"),
    gross_wall_area_and_opening_deductions: explicit("GROSS_M2=100,OPENINGS_M2=10,NET_M2=90"),
    fired_clay_brick_confirmed: explicit(true), brick_manufacturer_and_designation: explicit("Acme Brick Modular A-101"),
    specified_and_nominal_dimensions: explicit("specified 194x92x57 mm; nominal 200x100x67 mm"), joint_width_mm: explicit(10, "mm"),
    wall_thickness_and_wythe_configuration: explicit("WYTHE:single 100 mm veneer"), bond_pattern: explicit("RUNNING_BOND"),
    selected_bia_tn10_table_4_row: explicit("BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm"),
    selected_brick_quantity_per_m2: explicit(60, "piece_per_m2"), selected_mortar_quantity_per_m2: explicit(0.02, "m3_per_m2"),
    applicable_bond_correction_factors: explicit("BRICK_FACTOR=1.05,MORTAR_FACTOR=1.10"),
    selected_project_breakage_and_waste_allowances: explicit("BRICK_PERCENT=3,MORTAR_PERCENT=5"),
    supplier_package_quantities: explicit("BRICK_PIECES=500,MORTAR_M3=0.25"),
    project_architect_engineer_or_estimator_approval_reference: explicit("A-E-EST-BRICK-REV-C"), ...changes };
}
function resolve(values = inputs()) {
  return resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT",
    operation_class: "MEASURE", material_system: "BIA_TN10_FIRED_CLAY_BRICK", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values });
}
function prompt(area = 90) {
  return ["Brick masonry BIA TN 10 Table 4;", `net brick wall area: ${area} m2;`,
    `gross wall area and opening deductions: GROSS_M2=${area + 10},OPENINGS_M2=10,NET_M2=${area};`,
    "fired clay brick confirmed: true; brick manufacturer and designation: Acme Brick Modular A-101;",
    "specified and nominal dimensions: specified 194x92x57 mm, nominal 200x100x67 mm; joint width: 10 mm;",
    "wall thickness and wythe configuration: WYTHE:single 100 mm veneer; bond pattern: RUNNING_BOND;",
    "selected BIA TN10 Table 4 row: BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm;",
    "selected brick quantity per m2: 60; selected mortar quantity per m2: 0.02;",
    "applicable bond correction factors: BRICK_FACTOR=1.05,MORTAR_FACTOR=1.10;",
    "selected project breakage and waste allowances: BRICK_PERCENT=3,MORTAR_PERCENT=5;",
    "supplier package quantities: BRICK_PIECES=500,MORTAR_M3=0.25; project approval reference: A-E-EST-BRICK-REV-C"].join(" ");
}

describe("BIA TN 10 selected fired-clay brick and mortar table route", () => {
  test("registers the reviewed source and executable exact binding", () => {
    expect(constructionNormativeRegistryV1.get(BIA_TN10_MASONRY_SOURCE_ID)).toMatchObject({
      source_type: "WORK_EXECUTION_STANDARD", operation_class_applicability: ["MEASURE"],
      material_system_applicability: ["BIA_TN10_FIRED_CLAY_BRICK"],
      product_profile_applicability: [BIA_TN10_MASONRY_PRODUCT_PROFILE_ID] });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1).toContainEqual(expect.objectContaining({
      norm_id: BIA_TN10_MASONRY_NORM_ID, work_group: "masonry",
      produced_parameter_ids: ["masonry_selected_brick_procurement_quantity_piece", "masonry_selected_mortar_procurement_quantity_m3"] }));
  });
  test("calculates both selected materials after exact corrections, waste and packages", () => {
    const first = resolve(), second = resolve();
    expect(first).toMatchObject({ status: "APPLIED", calculated_masonry_selected_brick_quantity_piece: 6000,
      calculated_masonry_selected_mortar_quantity_m3: 2.25, blockers: [] });
    expect(first.parameter_values.masonry_selected_brick_procurement_quantity_piece).toMatchObject({ value: 6000,
      unit_id: "piece", source_type: "APPLICABLE_NORM", source_id: BIA_TN10_MASONRY_SOURCE_ID });
    expect(first.parameter_values.masonry_selected_mortar_procurement_quantity_m3).toMatchObject({ value: 2.25, unit_id: "m3" });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });
  test("fails closed for non-clay material, inconsistent openings and an output conflict",
    () => {
      expect(resolve(inputs({ fired_clay_brick_confirmed: explicit(false) }))).toMatchObject({ status: "BLOCKED_NOT_APPLICABLE",
        blockers: expect.arrayContaining(["PHYSICAL_NORM_MATERIAL_SCOPE_INVALID:fired_clay_brick_confirmed"]) });
      expect(resolve(inputs({ gross_wall_area_and_opening_deductions: explicit("GROSS_M2=100,OPENINGS_M2=5,NET_M2=90") })))
        .toMatchObject({ status: "BLOCKED_NOT_APPLICABLE", blockers: expect.arrayContaining([
          "PROJECT_GEOMETRY_CONFLICT:gross_wall_area_and_opening_deductions"]) });
      expect(resolve(inputs({ masonry_selected_brick_procurement_quantity_piece: explicit(5500, "piece") })))
        .toMatchObject({ status: "BLOCKED_NOT_APPLICABLE", blockers: [expect.stringContaining("PHYSICAL_NORM_VALUE_CONFLICT")] });
    });
  test("uses the exact owner and emits separate price-blocked brick and mortar rows", () => {
    expect(resolveDirectConsumerRepairOpenWorldOwner(prompt())).toBe("masonry");
    const draft = buildDirectConsumerRepairOpenWorldAiDraft(prompt(), { city: "Бишкек", countryCode: "KG" });
    const rows = draft.items.filter((item) => item.normId === BIA_TN10_MASONRY_NORM_ID);
    expect(draft.selectedWork?.selectedWorkKey).toBe("masonry_bia_tn10_selected_table_4");
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => [row.quantity, row.unit])).toEqual([[6000, "pcs"], [2.25, "m3"]]);
    expect(rows.every((row) => row.unitPrice === null)).toBe(true);
    expect(rows.map((row) => row.sourceParameters?.parameterBlockerIds)).toEqual([
      ["PRICE_SOURCE_REQUIRED:brick_supplier_quote"], ["PRICE_SOURCE_REQUIRED:mortar_supplier_quote"]]);
  });
  test("changes both quantities independently while keeping unsupported money at zero", () => {
    const first = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(90), owner: "masonry", currency: "KGS" }));
    const second = compileDynamicProfessionalBoq(buildOwnedDomainEstimatorReasoningPlan({ text: prompt(100), owner: "masonry", currency: "KGS" }));
    const rows1 = first.rows.filter((row) => row.normId === BIA_TN10_MASONRY_NORM_ID);
    const rows2 = second.rows.filter((row) => row.normId === BIA_TN10_MASONRY_NORM_ID);
    expect(rows1.map((row) => row.quantity)).toEqual([6000, 2.25]);
    expect(rows2.map((row) => row.quantity)).toEqual([6500, 2.5]);
    expect([...rows1, ...rows2].every((row) => row.quantity * row.unitPrice === 0)).toBe(true);
  });
  test("keeps incomplete exact input blocked and generic masonry unbound", () => {
    const incomplete = buildDirectConsumerRepairOpenWorldAiDraft("Brick masonry BIA TN 10 Table 4",
      { city: "Бишкек", countryCode: "KG" });
    expect(incomplete.items.filter((item) => item.normId === BIA_TN10_MASONRY_NORM_ID)).toHaveLength(2);
    expect(incomplete.missingData).toEqual(expect.arrayContaining([expect.stringContaining("чистую площадь"),
      expect.stringContaining("производителя"), expect.stringContaining("поправки")]));
    const generic = buildDirectConsumerRepairOpenWorldAiDraft("Смета на кирпичную стену 90 м²",
      { city: "Бишкек", countryCode: "KG" });
    expect(generic.items.some((item) => item.normId === BIA_TN10_MASONRY_NORM_ID)).toBe(false);
  });
});
