import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { validateCanonicalEstimateParameterInputs } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import {
  ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_SCOPE_R1 as scope, ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1 as bases,
} from "../../src/lib/estimate/v4/roadCrossingSleevesJointResourcesR1";

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-joint-resource-test", semanticOwner: "rcs-test", sourceId: "actual-WPS-and-selected-product", normId: "no-universal-rate",
  sourceMetadata: { source_title: "Actual joint resources; TWI cost-basis boundary", source_document_version: "test-2026-10-03", definition_hash: "a".repeat(64),
    exact_locator: "https://www.twi-global.com/technical-knowledge/job-knowledge/welding-costs-096", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Подтверждённая карта MMA стыка выбранного футляра; не полная работа или приёмка WPS",
  ordinary: [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1], profile: [], conditional: parameters, rows,
  excludedUnownedAssumptions: ["WPS approval", "preparation/fit-up", "NDT/repairs/coating", "drying/storage", "lifting", "full crossing"],
});
// Synthetic verification facts ONLY. No fixture consumption, productivity,
// designation, WPS reference or price is admitted as a runtime default.
const fixture: Record<string, unknown> = {
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160, rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0, rcs_retained_spare_section_count: 1, rcs_supplier_bundle_section_count: 2,
  rcs_steel_density_kg_m3: 7850, rcs_raci_approved_ring_pitch_m: 2.5, rcs_raci_selected_elements_per_ring: 4,
  rcs_joint_wps_reference: "TEST-OWNED WPS applicable to fixture casing", rcs_joint_welding_process: bases.process,
  rcs_joint_electrode_designation: "TEST-OWNED electrode", rcs_joint_gross_electrode_kg_per_joint: 2,
  rcs_joint_electrode_retained_spare_kg: 1, rcs_joint_electrode_compatible_stock_kg: 0.5, rcs_joint_electrode_supplier_pack_kg: 2.5,
  rcs_joint_crew_designation: "TEST-OWNED welder and helper", rcs_joint_total_crew_person_hours_per_joint: 3,
  rcs_joint_crew_cost_basis: bases.labor, rcs_joint_equipment_designation: "TEST-OWNED welding equipment",
  rcs_joint_equipment_hours_per_joint: 4, rcs_joint_equipment_cost_basis: bases.equipment,
};
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-joint-test", catalogId: "canonical-work:expanded:road_crossing_sleeves",
    primaryMeasureParameterId: "rcs_crossing_length_m", parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas],
    resourceDefinitions: [...definition.resources], submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS",
    maximumResourceRows: definition.resources.length, rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const id = (key: string) => `rcs:joint:${key}`;
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);
const provenance = { kind: "manual", reason: "test-owned joint resource amendment" };

describe("actual road-casing joint resources through the shared compiler", () => {
  it("derives site joints, gross consumption, supply balance, total crew and equipment hours", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, value] of Object.entries({ site_joint_count: 2, electrode_consumed: 4, electrode_spare: 1, electrode_stock: 0.5,
      electrode_total: 5, electrode_need: 4.5, electrode_packs: 2, electrode_ordered: 5, electrode_remaining: 1.5, electrode_free: 0.5,
      crew_person_hours: 6, equipment_hours: 8 })) expect(q(result, key)).toBe(value);
    expect(parameters.some(p => /site_joint_count|total_consumption|total_hours/u.test(p.id))).toBe(false);
  });

  it.each([12, 12.001, 24, 24.001, 36, 36.001])("length %s updates joints without a supplier-bundle welding charge", async length => {
    const result = await compile({ ...fixture, rcs_crossing_length_m: length });
    const joints = Math.ceil(length / 12) - 1;
    expect(q(result, "site_joint_count")).toBe(joints);
    if (joints === 0) {
      expect(result.rows.map(r => r.row_id)).toEqual([id("site_joint_count")]);
      expect(result.preliminaryNeeds).toHaveLength(0);
    } else {
      expect(q(result, "electrode_consumed")).toBe(joints * 2);
      expect(q(result, "crew_person_hours")).toBe(joints * 3);
      expect(q(result, "equipment_hours")).toBe(joints * 4);
    }
  });

  it("does not ask for WPS, electrode, crew or equipment facts with no site joints", async () => {
    const input: Record<string, unknown> = { ...fixture, rcs_crossing_length_m: 12 };
    for (const parameter of parameters) delete input[parameter.id];
    const result = await compile(input);
    expect(result.rows.map(r => r.row_id)).toEqual([id("site_joint_count")]);
    expect(q(result, "site_joint_count")).toBe(0);
    expect(result.preliminaryNeeds).toHaveLength(0);
    const schema = [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...parameters].map((p, ordinal) => ({
      parameterId: p.id, ordinal, valueType: p.valueType, unitId: p.unitId, titleRu: p.title,
      required: p.kind !== "conditional", defaultValue: p.defaultValue ?? null,
      constraints: definition.parameters.find(candidate => candidate.parameter_id === p.id)?.constraints_json ?? {},
    }));
    expect(validateCanonicalEstimateParameterInputs({ schema, rawInputs: input }).issues).toEqual([]);
    const withJoints = await compile({ ...input, rcs_crossing_length_m: 12.001 });
    expect(withJoints.preliminaryNeeds.find(n => n.row_id === id("electrode_ordered"))?.missing_parameter_ids).toContain("rcs_joint_wps_reference");
    expect(validateCanonicalEstimateParameterInputs({ schema, rawInputs: { ...input, rcs_crossing_length_m: 12.001 } })
      .issues.filter(issue => issue.code === "REQUIRED_WHEN").map(issue => issue.parameterId)).toEqual(parameters.map(p => p.id));
  });

  it("cannot add a manual paid joint resource to an inapplicable one-section branch", async () => {
    const result = await compile({ ...fixture, rcs_crossing_length_m: 12 }, {
      [id("crew_person_hours")]: { quantity: "999", provenance },
    });
    expect(result.rows.some(r => r.row_id === id("crew_person_hours"))).toBe(false);
    expect(result.preliminaryNeeds).toHaveLength(0);
  });
  it.each(["rcs_crossing_length_m", "rcs_planned_physical_section_length_m"])("manual quantity cannot decide unknown joint applicability fact %s", async key => {
    const input = { ...fixture }; delete input[key];
    const result = await compile(input, {
      [id("electrode_ordered")]: { quantity: "99", provenance },
      [id("crew_person_hours")]: { quantity: "99", provenance },
      [id("equipment_hours")]: { quantity: "99", provenance },
    });
    for (const row of ["electrode_ordered", "crew_person_hours", "equipment_hours"]) {
      expect(result.rows.some(r => r.row_id === id(row))).toBe(false);
      expect(result.preliminaryNeeds.find(n => n.row_id === id(row))?.missing_parameter_ids).toContain(key);
    }
  });

  it("supplier casing bundles and spare sections never add installed joints or welding resources", async () => {
    const result = await compile({ ...fixture, rcs_supplier_bundle_section_count: 10, rcs_retained_spare_section_count: 8 });
    expect(q(result, "site_joint_count")).toBe(2);
    expect(q(result, "electrode_consumed")).toBe(4);
    expect(q(result, "crew_person_hours")).toBe(6);
  });

  it("rounds actual mass packs, never process consumption, and keeps excess stock as free remainder", async () => {
    const larger = await compile({ ...fixture, rcs_joint_electrode_supplier_pack_kg: 3 });
    expect(q(larger, "electrode_consumed")).toBe(4);
    expect(q(larger, "electrode_ordered")).toBe(6);
    expect(q(larger, "electrode_free")).toBe(1.5);
    const stocked = await compile({ ...fixture, rcs_joint_electrode_compatible_stock_kg: 10 });
    expect(q(stocked, "electrode_ordered")).toBe(0);
    expect(q(stocked, "electrode_remaining")).toBe(6);
    expect(q(stocked, "electrode_free")).toBe(5);
  });

  it("owns one electrode purchase, crew and personnel-free equipment, never balances or another weld charge", async () => {
    const result = await compile();
    expect(result.rows.filter(r => r.included_in_estimate).map(r => r.row_id)).toEqual([
      id("electrode_ordered"), id("crew_person_hours"), id("equipment_hours"),
    ]);
    expect(result.rows.filter(r => r.included_in_procurement).map(r => r.row_id)).toEqual([
      id("electrode_ordered"), id("crew_person_hours"), id("equipment_hours"),
    ]);
    expect(result.rows.find(r => r.row_id === id("crew_person_hours"))?.unit_id).toBe("man_hour");
    expect(result.rows.find(r => r.row_id === id("equipment_hours"))?.unit_id).toBe("machine_hour");
    expect(result.rows.filter(r => r.included_in_estimate).every(r => r.unit_price === null)).toBe(true);
    const priced = await compile(fixture, {
      [id("electrode_ordered")]: { unitPrice: "10", provenance }, [id("crew_person_hours")]: { unitPrice: "20", provenance },
      [id("equipment_hours")]: { unitPrice: "30", provenance },
    });
    expect(priced.totals.amount).toBe("410");
  });

  it.each(["rcs_joint_wps_reference", "rcs_joint_welding_process"])("unknown %s gates joint resources even with manual quantity", async key => {
    const input = { ...fixture }; delete input[key];
    const result = await compile(input, { [id("electrode_ordered")]: { quantity: "99", provenance } });
    expect(q(result, "site_joint_count")).toBe(2);
    for (const row of ["electrode_ordered", "crew_person_hours", "equipment_hours"]) {
      expect(result.preliminaryNeeds.find(n => n.row_id === id(row))?.missing_parameter_ids).toContain(key);
      expect(result.rows.some(r => r.row_id === id(row))).toBe(false);
    }
  });

  it("missing actual gross consumption blocks its balance, not independent crew/equipment", async () => {
    const input = { ...fixture }; delete input.rcs_joint_gross_electrode_kg_per_joint;
    const result = await compile(input);
    expect(result.preliminaryNeeds.find(n => n.row_id === id("electrode_ordered"))).toMatchObject({
      quantity: null, missing_parameter_ids: ["rcs_joint_gross_electrode_kg_per_joint"],
    });
    expect(q(result, "crew_person_hours")).toBe(6);
    expect(q(result, "equipment_hours")).toBe(8);
  });

  it.each(["rcs_joint_electrode_designation", "rcs_joint_crew_cost_basis", "rcs_joint_equipment_cost_basis"])("missing %s stays at its exact resource gate", async key => {
    const input = { ...fixture }; delete input[key];
    const result = await compile(input);
    const blocked = key === "rcs_joint_electrode_designation" ? "electrode_ordered"
      : key === "rcs_joint_crew_cost_basis" ? "crew_person_hours" : "equipment_hours";
    expect(result.preliminaryNeeds.find(n => n.row_id === id(blocked))?.missing_parameter_ids).toContain(key);
  });

  it.each([
    { rcs_joint_welding_process: "TIG" }, { rcs_joint_equipment_cost_basis: "Персонал включён" },
    { rcs_joint_crew_cost_basis: "Оборудование и электроды включены" }, { rcs_joint_gross_electrode_kg_per_joint: 0 },
    { rcs_joint_electrode_supplier_pack_kg: 0 }, { rcs_joint_electrode_compatible_stock_kg: -1 },
    { rcs_joint_electrode_retained_spare_kg: -1 }, { rcs_joint_total_crew_person_hours_per_joint: -1 },
    { rcs_joint_equipment_hours_per_joint: -1 },
  ])("rejects incompatible process/cost basis and invalid actual rates: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });

  it("keeps resource quantity editable and explicitly returns to the recalculated formula", async () => {
    const pin = { [id("crew_person_hours")]: { quantity: "7", provenance } };
    expect(q(await compile(fixture, pin), "crew_person_hours")).toBe(7);
    const changed = { ...fixture, rcs_crossing_length_m: 37 };
    expect(q(await compile(changed, pin), "crew_person_hours")).toBe(7);
    expect(q(await compile(changed), "crew_person_hours")).toBe(9);
    expect(q(await compile(changed), "electrode_consumed")).toBe(6);
  });

  it("does not install universal rates, full scope or pretend that a WPS reference proves approval", () => {
    expect(parameters.every(p => p.defaultValue == null)).toBe(true);
    expect(definition.runtimeInput).toEqual({});
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false, process: "MMA_ONLY" });
    expect(scope.excluded).toMatch(/fit-up/u);
    expect(rows.some(r => /fuel|electricity|operator|gas/u.test(r.rowId))).toBe(false);
  });
});
