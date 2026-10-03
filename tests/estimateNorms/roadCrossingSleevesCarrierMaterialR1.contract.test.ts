import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CARRIER_PARAMETERS_R1 as carrier, ROAD_CROSSING_SLEEVES_CARRIER_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_CARRIER_COST_BASIS_R1 as basis } from "../../src/lib/estimate/v4/roadCrossingSleevesCasingMaterialR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";

const original = [{ id: "rcs_crossing_length_m", title: "Длина футляра", unitId: "m", min: 0.000001 },
  { id: "rcs_carrier_outside_diameter_mm", title: "Наружный диаметр рабочей трубы", unitId: "mm", min: 0.000001 }]
  .map(p => ({ ...p, valueType: "decimal" as const, kind: "ordinary" as const }));
const definition = buildAutomaticConstructionOwnerR1({ contract: "owned-carrier-supply-test", semanticOwner: "carrier-test",
  sourceId: "owned-fixture-not-approved", normId: "no-universal-carrier-norm", sourceMetadata: { source_title: "Synthetic carrier supply test",
    source_document_version: "test", definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "owned test" },
  applicabilityRu: "Одна выбранная рабочая труба", ordinary: [...original, ...carrier.filter(p => p.kind === "ordinary")],
  conditional: carrier.filter(p => p.kind === "conditional"), profile: [], rows, excludedUnownedAssumptions: ["No full crossing or actual approval"],
});
const fixture: Record<string, unknown> = { rcs_crossing_length_m: 35, rcs_carrier_outside_diameter_mm: 160,
  rcs_carrier_supply_mode: modes.newSections, rcs_carrier_product_designation: "TEST selected compatible carrier",
  rcs_carrier_total_end_extension_m: 2, rcs_carrier_physical_supply_section_length_m: 6,
  rcs_carrier_damaged_whole_section_count: 1, rcs_carrier_compatible_whole_section_stock_count: 3,
  rcs_carrier_retained_whole_section_count: 2, rcs_carrier_supplier_bundle_section_count: 4, rcs_carrier_pipe_cost_basis: basis };
const order = "rcs:carrier:ordered_length_m";
const provenance = { kind: "manual", reason: "owned carrier purchase exception" };
const compile = (submittedParameters = fixture, rowOverrides?: Record<string, Record<string, unknown>>) => compileCanonicalEstimateCore({
  operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "carrier-supply-test", catalogId: "owned-carrier-test",
  primaryMeasureParameterId: "rcs_crossing_length_m", parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas],
  resourceDefinitions: [...definition.resources], submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS",
  maximumResourceRows: definition.resources.length, rowOverrides, hashJson: estimateDeterministicHash,
});
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === `rcs:carrier:${key}`)?.quantity);

describe("disjoint working carrier pipe supply through the existing core", () => {
  it("balances installed sections, original cutting, additional losses, stock, reserve, whole-pack order and remainder", async () => {
    const result = await compile(fixture, { [order]: { unitPrice: "4", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    for (const [key, value] of Object.entries({ installed_length_m: 37, installed_section_count: 7, cutting_remainder_m: 5,
      damaged_section_count: 1, compatible_stock_section_count: 3, retained_section_count: 2, consumed_section_count: 8,
      total_section_need: 10, new_section_need: 7, supplier_bundle_count: 2, ordered_section_count: 8,
      ordered_length_m: 48, remaining_section_count: 3, free_section_count: 1 })) expect(q(result, key)).toBe(value);
    expect(result.rows.filter(row => row.included_in_estimate || row.included_in_procurement).map(row => row.row_id)).toEqual([order]);
    expect(result.totals.amount).toBe("192");
  });
  it("supply bundles and reserve change purchase, never installed carrier or its geometric offcut", async () => {
    const result = await compile({ ...fixture, rcs_carrier_supplier_bundle_section_count: 10, rcs_carrier_retained_whole_section_count: 9 });
    expect(q(result, "ordered_length_m")).toBe(120);
    expect(q(result, "installed_length_m")).toBe(37); expect(q(result, "installed_section_count")).toBe(7);
    expect(q(result, "cutting_remainder_m")).toBe(5);
  });
  it("compatible whole stock can remove the new order while preserving consumed and retained sections", async () => {
    const result = await compile({ ...fixture, rcs_carrier_compatible_whole_section_stock_count: 12 });
    expect(q(result, "ordered_length_m")).toBe(0); expect(q(result, "remaining_section_count")).toBe(4);
    expect(q(result, "free_section_count")).toBe(2); expect(q(result, "installed_length_m")).toBe(37);
  });
  it.each([modes.customerSupplied, modes.other])("known inactive new-section supply %s retains installed length without an executor order", async mode => {
    const input: Record<string, unknown> = { ...fixture, rcs_carrier_supply_mode: mode };
    for (const fact of carrier.filter(p => p.kind === "conditional")) delete input[fact.id];
    const result = await compile(input, { [order]: { quantity: "999", unitPrice: "9", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map(row => row.row_id)).toEqual(["rcs:carrier:installed_length_m"]);
    expect(q(result, "installed_length_m")).toBe(37); expect(result.totals.amount).toBe("0");
  });
  it("unknown supply is a local undecided branch; it does not hide the known installed length", async () => {
    const input = { ...fixture }; delete input.rcs_carrier_supply_mode;
    const result = await compile(input);
    expect(q(result, "installed_length_m")).toBe(37);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_carrier_supply_mode"))).toBe(true);
    expect(result.rows.some(row => row.included_in_procurement)).toBe(false);
  });
  it.each(["rcs_carrier_product_designation", "rcs_carrier_outside_diameter_mm", "rcs_carrier_total_end_extension_m",
    "rcs_carrier_physical_supply_section_length_m", "rcs_carrier_damaged_whole_section_count", "rcs_carrier_compatible_whole_section_stock_count",
    "rcs_carrier_retained_whole_section_count", "rcs_carrier_supplier_bundle_section_count", "rcs_carrier_pipe_cost_basis"])(
    "manual carrier order never replaces missing original %s", async missing => {
      const input = { ...fixture }; delete input[missing];
      const result = await compile(input, { [order]: { quantity: "999", provenance } });
      expect(result.preliminaryNeeds.find(need => need.row_id === order)).toMatchObject({ quantity: "999", missing_parameter_ids: [missing] });
      expect(result.rows.some(row => row.row_id === order && row.included_in_procurement)).toBe(false);
    });
  it.each([{ rcs_carrier_total_end_extension_m: -1 }, { rcs_carrier_physical_supply_section_length_m: 0 },
    { rcs_carrier_compatible_whole_section_stock_count: 0.5 }, { rcs_carrier_damaged_whole_section_count: -1 },
    { rcs_carrier_supplier_bundle_section_count: 0 }, { rcs_carrier_pipe_cost_basis: "Всё включено с монтажом и доставкой" }])(
    "rejects invalid actual quantities or overlapping pipe price ownership: %j", async patch => {
      await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    });
  it("explicit zero extensions/loss/stock/reserve stay known; a purchase exception retains original formula balances", async () => {
    const input = { ...fixture, rcs_carrier_total_end_extension_m: 0, rcs_carrier_damaged_whole_section_count: 0,
      rcs_carrier_compatible_whole_section_stock_count: 0, rcs_carrier_retained_whole_section_count: 0 };
    const result = await compile(input, { [order]: { quantity: "99", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "installed_length_m")).toBe(35);
    expect(q(result, "ordered_length_m")).toBe(99); expect(q(result, "remaining_section_count")).toBe(2);
    expect(result.rows.find(row => row.row_id === order)?.calculation_trace).toMatchObject({ manualAmendment: provenance,
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "48" });
    expect(definition.runtimeInput).toEqual({});
  });
});
