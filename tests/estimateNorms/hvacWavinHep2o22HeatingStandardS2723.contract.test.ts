import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
  WAVIN_SELECTED_SUPPLIES,
  WAVIN_FLUID_SUPPLIES,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileHvacWavinHep2o22HeatingStandardS2723,
  hvacWavinHep2o22HeatingStandardMissingRows,
} from "../../src/lib/estimate/v4/hvacWavinHep2o22HeatingStandardS2723";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { selectCanonicalArtifactRows, buildCanonicalProcurementProjection } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("S27.23 Wavin Hep2O 22 mm internal-heating route", () => {
  const fixture = { ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT };
  const manual = { kind: "manual", reason: "VALIDATION_FIXTURE: accepted supply, physical consumption unchanged" };
  const prefix = "hvac-hep2o22:";
  const q = (result: Awaited<ReturnType<typeof compileHvacWavinHep2o22HeatingStandardS2723>>, id: string) => result.rows.find(row => row.row_id === prefix + id)!;
  const projection = (result: Awaited<ReturnType<typeof compileHvacWavinHep2o22HeatingStandardS2723>>) => {
    const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(row => { delete row.procurement_readiness; return row; });
    const selection = selectCanonicalArtifactRows(stored);
    return { reopened: stored.map(row => canonicalEstimateRevisionRowFromStorage(row, null)), build: () => buildCanonicalProcurementProjection({
      revision: { id: "TEST", release_id: "TEST", catalog_id: "TEST", checksum_sha256: "TEST", row_count: stored.length },
      sourceRows: selection.sourceRows, procurementRows: selection.procurementRows }) };
  };
  test("rejects impossible or zero internal diameter before squaring volume even with manual safety and fluid overrides", async () => {
    for (const outer of [4, 6]) for (const overrides of [undefined, {
      [prefix + "02:control:pipe-inside-diameter"]: { quantity: "17.7", includedInEstimate: false, includedInProcurement: false, provenance: manual },
      [prefix + "07:material:test-water"]: { quantity: "0", includedInProcurement: true, provenance: manual },
    }]) await expect(compileHvacWavinHep2o22HeatingStandardS2723({ ...fixture, pipe_outer_diameter_mm: outer, pipe_wall_thickness_mm: 3 }, overrides))
      .rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    const valid = await compileHvacWavinHep2o22HeatingStandardS2723(fixture);
    expect(q(valid, "02:control:pipe-inside-diameter").quantity).toBe("17.7");
    expect(q(valid, "02:control:pipe-inside-diameter").calculation_trace).toMatchObject({ formulaOutputBounds: { status: "PASSED", formulaQuantity: "17.7", unitId: "mm" } });
    expect(q(valid, "07:material:test-water").quantity).toBe("0.024605739");
    const alternate = await compileHvacWavinHep2o22HeatingStandardS2723({ ...fixture, pipe_outer_diameter_mm: 8, pipe_wall_thickness_mm: 3 });
    expect(q(alternate, "02:control:pipe-inside-diameter").quantity).toBe("2");
    const missing = await compileHvacWavinHep2o22HeatingStandardS2723({ ...fixture, pipe_wall_thickness_mm: null }, {
      [prefix + "02:control:pipe-inside-diameter"]: { quantity: "17.7", provenance: manual },
    });
    expect(missing.rows.find(row => row.row_id === prefix + "02:control:pipe-inside-diameter")).toBeUndefined();
    expect(missing.preliminaryNeeds.find(row => row.row_id === prefix + "02:control:pipe-inside-diameter"))
      .toMatchObject({ quantity: "17.7", need_state: "QUANTITY_REQUIRED", missing_parameter_ids: ["pipe_wall_thickness_mm"] });
  });
  test("propagates accepted bundles and supports to exactly six controls, retaining physical installation and independent delivery", async () => {
    const baseline = await compileHvacWavinHep2o22HeatingStandardS2723(fixture);
    const result = await compileHvacWavinHep2o22HeatingStandardS2723(fixture, {
      [prefix + "02:material:pipe-bundles"]: { quantity: "2", provenance: manual },
      [prefix + "03:fastener:support-packages"]: { quantity: "4", provenance: manual },
    });
    const controlIds = ["02:control:ordered-sections", "02:control:ordered-length", "02:control:available-before-losses", "02:control:pipe-remainder",
      "03:control:support-order", "03:control:support-remainder"];
    controlIds.forEach((id, index) => expect(q(result, id).quantity).toBe(["40", "240", "140", "135", "400", "199"][index]));
    for (const row of baseline.rows.filter(row => ![...controlIds, "02:material:pipe-bundles", "03:fastener:support-packages"].includes(row.row_id.slice(prefix.length))))
      expect(result.rows.find(value => value.row_id === row.row_id)?.quantity).toBe(row.quantity);
    expect(q(result, "02:operation:cutting").quantity).toBe("19");
    expect(q(result, "02:material:pipe-reserve").quantity).toBe("5");
    expect(q(result, "02:material:pipe-expected-waste").quantity).toBe("5");
    expect((q(result, "02:material:pipe-bundles").calculation_trace as Record<string, unknown>).purchaseBalance)
      .toMatchObject({ requirementBasis: "selected_supply_order", plannedConsumption: "1", requiredSelectedOrder: "1", effectiveOrder: "2", excessOrderAboveRequiredConsumption: "1" });
    expect(projection(result).build).not.toThrow();
  });
  test("blocks a retained-reserve deficit even when the accepted pipe covers installation and expected waste, including on reopen", async () => {
    const result = await compileHvacWavinHep2o22HeatingStandardS2723({ ...fixture, route_length_m: 110 }, {
      [prefix + "02:material:pipe-bundles"]: { quantity: "1", includedInProcurement: true, provenance: manual },
    });
    for (const [id, value] of [["02:control:ordered-length", "120"], ["02:control:available-before-losses", "10"],
      ["02:control:pipe-remainder", "4.5"], ["02:material:pipe-reserve", "5.5"], ["02:material:pipe-expected-waste", "5.5"]]) expect(q(result, id).quantity).toBe(value);
    const { reopened, build } = projection(result);
    expect(reopened.find(row => row.rowId === prefix + "02:material:pipe-bundles")).toMatchObject({ quantity: "1", includedInProcurement: false,
      calculationTrace: { manualQuantityOverride: true, purchaseBalance: { plannedConsumption: "1", requiredSelectedOrder: "2", consumptionShortage: "1", procurementReady: false } } });
    expect(build).toThrow("не хватает до расчётного заказа 1 item");
    const ready = await compileHvacWavinHep2o22HeatingStandardS2723({ ...fixture, route_length_m: 110 }, {
      [prefix + "02:material:pipe-bundles"]: { quantity: "2", provenance: manual },
    });
    expect(projection(ready).build).not.toThrow();
  });
  test("guards all fifteen whole supplies at raw precision and keeps zero and under-order shortages visible", async () => {
    expect(WAVIN_SELECTED_SUPPLIES).toHaveLength(15);
    for (const supply of WAVIN_SELECTED_SUPPLIES) await expect(compileHvacWavinHep2o22HeatingStandardS2723(fixture, {
      [prefix + supply.rowId]: { quantity: "1.5", provenance: manual },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    await expect(compileHvacWavinHep2o22HeatingStandardS2723(fixture, { [prefix + "02:material:pipe-bundles"]: {
      quantity: "1.0000000001", provenance: manual } })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const valid = await compileHvacWavinHep2o22HeatingStandardS2723(fixture, { [prefix + "02:material:pipe-bundles"]: { quantity: "1.0000", provenance: manual } });
    expect(q(valid, "02:material:pipe-bundles").included_in_procurement).toBe(true);
    const zero = await compileHvacWavinHep2o22HeatingStandardS2723(fixture, {
      [prefix + "02:material:pipe-bundles"]: { quantity: "0", provenance: manual },
      [prefix + "03:fastener:support-packages"]: { quantity: "2", includedInProcurement: true, provenance: manual },
    });
    for (const id of ["ordered-sections", "ordered-length", "available-before-losses", "pipe-remainder"]) expect(q(zero, "02:control:" + id).quantity).toBe("0");
    expect(q(zero, "03:control:support-remainder").quantity).toBe("0");
    expect(projection(zero).build).toThrow("не хватает до расчётного заказа");
  });
  test("guards each fluid independently without changing test or fill consumption and preserves shortages after JSON reopen", async () => {
    expect(WAVIN_FLUID_SUPPLIES).toHaveLength(3);
    const baseline = await compileHvacWavinHep2o22HeatingStandardS2723(fixture);
    for (const [id, consumed, partial, gap, positive, excess] of [
      ["test-water", "0.024605739", "0.02", "0.004605739", "0.03", "0.005394261"],
      ["fill-water", "0.024605739", "0.02", "0.004605739", "0.03", "0.005394261"],
      ["inhibitor", "0.24605739", "0.2", "0.04605739", "0.3", "0.05394261"],
    ]) for (const [accepted, shortage, over] of [["0", consumed, "0"], [partial, gap, "0"], [positive, "0", excess]]) {
      const rowId = prefix + "07:material:" + id;
      const result = await compileHvacWavinHep2o22HeatingStandardS2723(fixture, { [rowId]: { quantity: accepted, includedInProcurement: true, provenance: manual } });
      const { reopened, build } = projection(result);
      expect(reopened.find(row => row.rowId === rowId)).toMatchObject({ quantity: accepted, includedInProcurement: shortage === "0",
        calculationTrace: { calculatedQuantityBeforeOverride: consumed, purchaseBalance: { quantityMode: "canonical_decimal", quantum: null,
          consumed, consumptionShortage: shortage, excessOrderAboveRequiredConsumption: over, procurementReady: shortage === "0" } } });
      for (const before of baseline.rows.filter(row => row.row_id !== rowId)) expect(result.rows.find(row => row.row_id === before.row_id)?.quantity).toBe(before.quantity);
      if (shortage === "0") expect(build).not.toThrow();
      else { let error: unknown; try { build(); } catch (failure) { error = failure; }
        expect(error).toMatchObject({ code: "PROCUREMENT_MATERIAL_SHORTAGE", shortages: [expect.objectContaining({ rowId, consumptionShortage: shortage })] }); }
    }
  });
  test("keeps typed actual packaging visible without changing the declared source defaults", async () => {
    const result = await compileHvacWavinHep2o22HeatingStandardS2723({ ...fixture, pipe_bundle_item: 10, pipe_section_length_m: 3, support_package_item: 125 });
    expect(q(result, "02:material:pipe-bundles").quantity).toBe("4");
    expect(q(result, "02:control:ordered-length").quantity).toBe("120");
    expect(q(result, "02:control:required-sections").quantity).toBe("37");
    expect(q(result, "02:material:pipe-bundles").title_ru).toMatch(/10$/u);
    expect(q(result, "02:control:required-sections").title_ru).toMatch(/3$/u);
    expect(q(result, "03:fastener:support-packages").title_ru).toMatch(/125$/u);
  });
  test("binds the restored official-source pack and independent completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS.length,
      HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS.length,
      HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([45, 49, 69]);
    expect(new Set(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.length);

    const full = new Set(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(hvacWavinHep2o22HeatingStandardMissingRows(full)).toEqual([]);
    for (const rowId of full) {
      const mutated = new Set(full);
      mutated.delete(rowId);
      expect(hvacWavinHep2o22HeatingStandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("emits the immediate route estimate while unresolved layout resources stay visible", async () => {
    const result = await compileHvacWavinHep2o22HeatingStandardS2723({ route_length_m: 100 });

    expect(result.rows).toHaveLength(41);
    expect(result.preliminaryNeeds).toHaveLength(28);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(10);
    expect(result.preliminaryNeeds.map((need) => need.row_id)).toEqual(expect.arrayContaining([
      "hvac-hep2o22:03:fastener:supports",
      "hvac-hep2o22:04:component:smartsleeves",
      "hvac-hep2o22:05:component:straight-connectors",
      "hvac-hep2o22:05:component:elbows",
      "hvac-hep2o22:05:component:tees",
      "hvac-hep2o22:05:component:threaded-adapters",
      "hvac-hep2o22:05:component:stop-ends",
    ]));
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "hvac-hep2o22:02:material:pipe-expected-waste", quantity: "5" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:material:pipe-reserve", quantity: "5" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:required-sections", quantity: "19" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:material:pipe-bundles", quantity: "1" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:ordered-length", quantity: "120" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:available-before-losses", quantity: "20" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:pipe-remainder", quantity: "15" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:03:control:support-max-span", quantity: "0.5" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:06:labor:route-installation", quantity: "25" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:test-pressure", quantity: "6" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:low-test-pressure", quantity: "0.75" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:high-pressure-pump", quantity: "15" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:reduced-test-pressure", quantity: "2" }),
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("calculates complete procurement and recalculates pipe packages and tests", async () => {
    const complete = await compileHvacWavinHep2o22HeatingStandardS2723({
      ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileHvacWavinHep2o22HeatingStandardS2723({
      ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
      support_count: 261,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    expect(complete.rows).toHaveLength(69);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(23);
    expect(quantity(complete, "hvac-hep2o22:02:material:pipe-expected-waste")).toBe("5");
    expect(quantity(complete, "hvac-hep2o22:02:material:pipe-reserve")).toBe("5");
    expect(quantity(complete, "hvac-hep2o22:02:control:required-sections")).toBe("19");
    expect(quantity(complete, "hvac-hep2o22:02:material:pipe-bundles")).toBe("1");
    expect(quantity(complete, "hvac-hep2o22:02:control:ordered-sections")).toBe("20");
    expect(quantity(complete, "hvac-hep2o22:02:control:ordered-length")).toBe("120");
    expect(quantity(complete, "hvac-hep2o22:02:control:available-before-losses")).toBe("20");
    expect(quantity(complete, "hvac-hep2o22:02:control:pipe-remainder")).toBe("15");
    expect(quantity(complete, "hvac-hep2o22:03:fastener:supports")).toBe("201");
    expect(quantity(complete, "hvac-hep2o22:03:fastener:support-packages")).toBe("3");
    expect(quantity(complete, "hvac-hep2o22:04:component:smartsleeves")).toBe("40");
    expect(quantity(complete, "hvac-hep2o22:04:consumable:wipe-packages")).toBe("1");
    expect(quantity(complete, "hvac-hep2o22:05:component:straight-connectors")).toBe("14");
    expect(quantity(complete, "hvac-hep2o22:05:consumable:ptfe")).toBe("1");
    expect(quantity(complete, "hvac-hep2o22:05:labor:node-installation")).toBe("2");
    expect(quantity(complete, "hvac-hep2o22:07:material:test-water")).toBe("0.024605739");
    expect(quantity(complete, "hvac-hep2o22:07:material:inhibitor")).toBe("0.24605739");
    expect(quantity(complete, "hvac-hep2o22:07:control:low-test-pressure")).toBe("0.75");
    expect(quantity(complete, "hvac-hep2o22:07:control:low-test-hold")).toBe("45");
    expect(quantity(complete, "hvac-hep2o22:07:control:test-pressure")).toBe("6");
    expect(quantity(complete, "hvac-hep2o22:07:control:high-pressure-pump")).toBe("15");
    expect(quantity(complete, "hvac-hep2o22:07:control:reduced-test-pressure")).toBe("2");
    expect(quantity(complete, "hvac-hep2o22:07:control:test-record")).toBe("45");

    expect(quantity(changed, "hvac-hep2o22:02:control:required-sections")).toBe("24");
    expect(quantity(changed, "hvac-hep2o22:02:material:pipe-bundles")).toBe("2");
    expect(quantity(changed, "hvac-hep2o22:02:control:ordered-sections")).toBe("40");
    expect(quantity(changed, "hvac-hep2o22:02:control:ordered-length")).toBe("240");
    expect(quantity(changed, "hvac-hep2o22:02:control:available-before-losses")).toBe("110");
    expect(quantity(changed, "hvac-hep2o22:02:control:pipe-remainder")).toBe("103.5");
    expect(quantity(changed, "hvac-hep2o22:03:fastener:supports")).toBe("261");
    expect(quantity(changed, "hvac-hep2o22:06:labor:route-installation")).toBe("32.5");
    expect(quantity(changed, "hvac-hep2o22:07:operation:high-pressure-test")).toBe("2");
  });
});
