import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
  VALTEC_SELECTED_SUPPLIES,
  VALTEC_FLUID_SUPPLIES,
  WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS,
  WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS,
  WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES,
  WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileWaterValtecPpr20StandardS2723,
  waterValtecPpr20StandardMissingRows,
} from "../../src/lib/estimate/v4/waterValtecPpr20StandardS2723";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { selectCanonicalArtifactRows, buildCanonicalProcurementProjection } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { canonicalEstimateWorkProcess } from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/water-valtec-ppr20-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("S27.23 VALTEC PP-R 20 standard internal water route", () => {
  test('discloses included works and all their existing resources without inventing sequence or route fittings', async () => {
    const result = await compileWaterValtecPpr20StandardS2723({ route_length_m: 100 });
    const sourceRows = [...result.rows, ...result.preliminaryNeeds];
    const groups = canonicalEstimateWorkProcess(sourceRows.map(row => ({ rowId: row.row_id,
      operation: (row.calculation_trace as { resourceGraph?: { operationCompositionV1?: unknown } })?.resourceGraph?.operationCompositionV1,
      titleRu: typeof row.title_ru === 'string' ? row.title_ru : undefined,
    })));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.sequenceUnspecified).toBe(true);
    expect(groups[0]?.operations.map(step => step.operationId)).toEqual([
      'route', 'cutting', 'supports', 'straight', 'nodes', 'assembly', 'testing', 'flushing', 'completion',
    ]);
    expect(new Set(groups[0]?.operations.flatMap(step => step.resourceIds))).toEqual(new Set(sourceRows.map(row => row.row_id)));
    expect(groups[0]?.operations.find(step => step.operationId === 'straight')?.resourceIds)
      .toContain('water-ppr20:06:labor:straight-fusion');
    expect(groups[0]?.operations.find(step => step.operationId === 'route')?.resourceIds)
      .toContain('water-ppr20:08:delivery:materials');
    expect(groups[0]?.operations.find(step => step.operationId === 'flushing')?.resourceIds)
      .toEqual(expect.arrayContaining(['water-ppr20:07:material:flushing-water', 'water-ppr20:07:service:controlled-discharge']));
    expect(result.preliminaryNeeds.flatMap(need => need.missing_parameter_ids))
      .toEqual(expect.arrayContaining(['straight_coupling_count', 'elbow_count', 'tee_count', 'threaded_transition_count', 'terminal_cap_count']));
    expect(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.filter(row => row.resource_graph.costTreatment === 'OWN_COST'))
      .toEqual(expect.arrayContaining(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.filter(row => row.category === 'labor')));
    expect(sourceRows).toHaveLength(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length);
    for (const id of ['straight', 'nodes']) {
      expect(groups[0]?.operations.find(step => step.operationId === id)?.sharedResources)
        .toEqual([expect.objectContaining({ rowId: 'water-ppr20:04:equipment:fusion-machine' })]);
    }
    const complete = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT });
    const machines = complete.rows.filter(row => row.row_id === 'water-ppr20:04:equipment:fusion-machine');
    expect(machines).toHaveLength(1);
    // 48 straight sockets + 16 elbows + 6 tees + 4 transitions + 2 caps;
    // 129 seconds per socket + 0.5 hour setup. One total covers both subworks.
    expect(machines[0]?.quantity).toBe('3.223333333');
    expect(complete.rows).toHaveLength(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length);
  });
  test("guards both continuous water orders without changing test, flushing or controlled-discharge consumption", async () => {
    expect(VALTEC_FLUID_SUPPLIES).toHaveLength(2);
    const baseline = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT });
    for (const [test, flush, testGap, flushGap, testExcess, flushExcess] of [
      ["0", "0", "0.0137", "0.0411", "0", "0"],
      ["0", "0.0411", "0.0137", "0", "0", "0"],
      ["0.0137", "0", "0", "0.0411", "0", "0"],
      ["0.01", "0.04", "0.0037", "0.0011", "0", "0"],
      ["0.02", "0.05", "0", "0", "0.0063", "0.0089"],
    ]) {
      const result = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT }, Object.fromEntries([
        ["water-ppr20:07:material:test-water", test], ["water-ppr20:07:material:flushing-water", flush],
      ].map(([id, q]) => [id, { quantity: q, includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE continuous supply; physical consumption unchanged" } }])));
      const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(row => { delete row.procurement_readiness; return row; });
      const reopened = stored.map(row => canonicalEstimateRevisionRowFromStorage(row, null));
      for (const [id, q, consumed, gap, excess] of [["test-water", test, "0.0137", testGap, testExcess], ["flushing-water", flush, "0.0411", flushGap, flushExcess]]) {
        const baselineBalance = (baseline.rows.find(row => row.row_id === `water-ppr20:07:material:${id}`)?.calculation_trace as Record<string, unknown>).purchaseBalance;
        expect(baselineBalance).toMatchObject({ quantityMode: "canonical_decimal", quantum: null, consumed, consumptionShortage: "0", procurementReady: true });
        expect(reopened.find(row => row.rowId === `water-ppr20:07:material:${id}`)).toMatchObject({ quantity: q, includedInProcurement: gap === "0",
          calculationTrace: { manualQuantityOverride: true, calculatedQuantityBeforeOverride: consumed,
            purchaseBalance: { quantityMode: "canonical_decimal", quantum: null, consumed, consumptionShortage: gap,
              excessOrderAboveRequiredConsumption: excess, procurementReady: gap === "0" } } });
        const policy = WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.find(row => row.row_id === `water-ppr20:07:material:${id}`)?.resource_graph.purchaseBalanceV1;
        expect(policy).not.toHaveProperty("orderQuantumExpression");
        expect(policy).not.toHaveProperty("requirementBasis");
        expect(policy).not.toHaveProperty("plannedConsumptionExpression");
      }
      for (const row of baseline.rows.filter(row => !VALTEC_FLUID_SUPPLIES.some(value => row.row_id === `water-ppr20:${value.rowId}`)))
        expect(result.rows.find(value => value.row_id === row.row_id)?.quantity).toBe(row.quantity);
      const selection = selectCanonicalArtifactRows(stored);
      const build = () => buildCanonicalProcurementProjection({ revision: { id: "TEST", release_id: "TEST", catalog_id: "TEST", checksum_sha256: "TEST", row_count: stored.length },
        sourceRows: selection.sourceRows, procurementRows: selection.procurementRows });
      if (testGap !== "0" || flushGap !== "0") {
        let failure: unknown;
        try { build(); } catch (error) { failure = error; }
        expect(failure).toMatchObject({ code: "PROCUREMENT_MATERIAL_SHORTAGE",
          shortages: [["test-water", testGap], ["flushing-water", flushGap]]
            .filter(([, gap]) => gap !== "0")
            .map(([id, gap]) => expect.objectContaining({ rowId: `water-ppr20:07:material:${id}`,
              unitId: "m3", consumptionShortage: gap, reserveDeficit: "0" })) });
      } else expect(build).not.toThrow();
    }
  });
  test("reconciles accepted pipe and support supplies while installation, fusion, water and independent delivery retain their physical basis", async () => {
    const baseline = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT });
    const manual = { kind: "manual", reason: "VALIDATION_FIXTURE: whole supplied units, no inventory claim" };
    const result = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      valtec_effective_pipe_sections: "999" }, {
      "water-ppr20:02:material:pipe-sections": { quantity: "28", provenance: manual },
      "water-ppr20:03:fastener:support-packages": { quantity: "4", provenance: manual },
    });
    expect(result.preliminaryNeeds).toEqual([]);
    const controls = { "water-ppr20:02:control:pipe-order": "112", "water-ppr20:02:control:pipe-remainder": "7",
      "water-ppr20:02:control:pipe-mass": "18.592", "water-ppr20:03:control:support-order": "400", "water-ppr20:03:control:support-remainder": "199" };
    for (const [id, expected] of Object.entries(controls)) expect(result.rows.find(row => row.row_id === id)?.quantity).toBe(expected);
    for (const row of baseline.rows.filter(row => !Object.prototype.hasOwnProperty.call(controls, row.row_id)
      && !["water-ppr20:02:material:pipe-sections", "water-ppr20:03:fastener:support-packages"].includes(row.row_id))) {
      expect(result.rows.find(value => value.row_id === row.row_id)?.quantity).toBe(row.quantity);
    }
    expect((result.rows.find(row => row.row_id === "water-ppr20:02:material:pipe-sections")?.calculation_trace as Record<string, unknown>).purchaseBalance)
      .toMatchObject({ quantum: "1", plannedConsumption: "25", requiredSelectedOrder: "27", excessOrderAboveRequiredConsumption: "1", procurementReady: true });
    const reset = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      "water-ppr20:02:material:pipe-sections": { quantity: null, provenance: manual },
    });
    expect(reset.rows.find(row => row.row_id === "water-ppr20:02:control:pipe-order")?.quantity).toBe("108");
  });
  test("preserves shortage and manual provenance on reopen and blocks filtered procurement despite an edited informational forecast", async () => {
    const manual = { kind: "manual", reason: "VALIDATION_FIXTURE" };
    const result = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      "water-ppr20:02:material:pipe-sections": { quantity: "26", includedInProcurement: true, provenance: manual },
      "water-ppr20:03:fastener:support-packages": { quantity: "2", includedInProcurement: true, provenance: manual },
      "water-ppr20:02:control:pipe-remainder": { quantity: "999", includedInEstimate: true, provenance: manual },
    });
    const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(row => { delete row.procurement_readiness; return row; });
    const reopened = stored.map(row => canonicalEstimateRevisionRowFromStorage(row, null));
    for (const [id, q] of [["water-ppr20:02:material:pipe-sections", "26"], ["water-ppr20:03:fastener:support-packages", "2"]]) {
      expect(reopened.find(row => row.rowId === id)).toMatchObject({ quantity: q, includedInProcurement: false,
        calculationTrace: { manualQuantityOverride: true, purchaseBalance: { consumptionShortage: "1", procurementReady: false } } });
    }
    expect(result.rows.find(row => row.row_id === "water-ppr20:02:control:pipe-order")?.quantity).toBe("104");
    expect(result.rows.find(row => row.row_id === "water-ppr20:02:control:pipe-mass")?.quantity).toBe("17.264");
    expect(result.rows.find(row => row.row_id === "water-ppr20:03:control:support-remainder")?.quantity).toBe("0");
    expect(result.rows.find(row => row.row_id === "water-ppr20:02:control:pipe-remainder")?.included_in_estimate).toBe(false);
    const selection = selectCanonicalArtifactRows(stored);
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "TEST", release_id: "TEST", catalog_id: "TEST", checksum_sha256: "TEST", row_count: stored.length },
      sourceRows: selection.sourceRows, procurementRows: selection.procurementRows })).toThrow("не хватает до расчётного заказа");
  });
  test("validates all thirteen whole supplies before rounding and keeps zero as an explicit shortage", async () => {
    expect(VALTEC_SELECTED_SUPPLIES).toHaveLength(13);
    const manual = { kind: "manual", reason: "VALIDATION_FIXTURE" };
    for (const supply of VALTEC_SELECTED_SUPPLIES) await expect(compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      [`water-ppr20:${supply.rowId}`]: { quantity: "0.5", provenance: manual },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    await expect(compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      "water-ppr20:02:material:pipe-sections": { quantity: "28.0000000001", provenance: manual },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const zero = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      "water-ppr20:02:material:pipe-sections": { quantity: "0", provenance: manual },
    });
    for (const id of ["pipe-order", "pipe-remainder", "pipe-mass"]) expect(zero.rows.find(row => row.row_id === `water-ppr20:02:control:${id}`)?.quantity).toBe("0");
    expect((zero.rows.find(row => row.row_id === "water-ppr20:02:material:pipe-sections")?.calculation_trace as Record<string, unknown>).purchaseBalance)
      .toMatchObject({ consumptionShortage: "27", procurementReady: false });
  });
  test("uses the existing manufacturer two-metre option and selected support packaging in quantities and numeric titles", async () => {
    const result = await compileWaterValtecPpr20StandardS2723({ ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      pipe_section_length_m: 2, support_package_item: 125 });
    for (const [id, q] of [["02:material:pipe-sections", "53"], ["02:control:pipe-order", "106"], ["02:control:pipe-remainder", "1"],
      ["02:control:pipe-mass", "17.596"], ["02:operation:cutting", "53"], ["03:fastener:support-packages", "2"],
      ["03:control:support-order", "250"], ["03:control:support-remainder", "49"]]) expect(result.rows.find(row => row.row_id === `water-ppr20:${id}`)?.quantity).toBe(q);
    expect(result.rows.find(row => row.row_id === "water-ppr20:02:material:pipe-sections")?.title_ru).toContain(" — 2");
    expect(result.rows.find(row => row.row_id === "water-ppr20:02:material:pipe-sections")?.title_ru).not.toContain("Четырёхметровые");
    expect(result.rows.find(row => row.row_id === "water-ppr20:03:fastener:support-packages")?.title_ru).toContain(" — 125");
  });
  test("binds the restored official-source pack and independent completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS.length,
      WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS.length,
      WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([37, 38, 52]);
    expect(new Set(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length);

    const full = new Set(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(waterValtecPpr20StandardMissingRows(full)).toEqual([]);
    for (const rowId of full) {
      const mutated = new Set(full);
      mutated.delete(rowId);
      expect(waterValtecPpr20StandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("emits useful pipe, supports, labor, test and flushing rows from route length", async () => {
    const result = await compileWaterValtecPpr20StandardS2723({ route_length_m: 100 });
    const expectedNeeds = [
      "water-ppr20:04:component:straight-couplings",
      "water-ppr20:04:operation:socket-fusion",
      "water-ppr20:04:equipment:fusion-machine",
      "water-ppr20:04:consumable:cleaning-wipes",
      "water-ppr20:04:control:fusion-cycles",
      "water-ppr20:05:component:elbows",
      "water-ppr20:05:component:tees",
      "water-ppr20:05:component:threaded-transitions",
      "water-ppr20:05:component:terminal-caps",
      "water-ppr20:05:operation:elbows",
      "water-ppr20:05:operation:tees",
      "water-ppr20:05:operation:threaded-transitions",
      "water-ppr20:05:operation:terminal-caps",
      "water-ppr20:05:consumable:cleaning-wipes",
      "water-ppr20:05:consumable:thread-seal",
      "water-ppr20:05:labor:node-installation",
      "water-ppr20:05:control:total-fusion-sockets",
      "water-ppr20:06:labor:straight-fusion",
    ].sort();

    expect(result.rows).toHaveLength(34);
    expect(result.preliminaryNeeds.map((need) => need.row_id).sort()).toEqual(expectedNeeds);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(12);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "water-ppr20:02:material:pipe-sections", quantity: "27" }),
      expect.objectContaining({ row_id: "water-ppr20:02:control:pipe-order", quantity: "108" }),
      expect.objectContaining({ row_id: "water-ppr20:03:fastener:support-packages", quantity: "3" }),
      expect.objectContaining({ row_id: "water-ppr20:06:labor:route-installation", quantity: "25" }),
      expect.objectContaining({ row_id: "water-ppr20:07:control:test-pressure", quantity: "6" }),
      expect.objectContaining({ row_id: "water-ppr20:07:material:flushing-water", quantity: "0.0411" }),
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("calculates complete fittings, consumables and procurement and recalculates by length", async () => {
    const complete = await compileWaterValtecPpr20StandardS2723({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileWaterValtecPpr20StandardS2723({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
    });
    const changedNodes = await compileWaterValtecPpr20StandardS2723({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      elbow_count: 10,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    expect(complete.rows).toHaveLength(52);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(21);
    expect(quantity(complete, "water-ppr20:02:material:pipe-sections")).toBe("27");
    expect(quantity(complete, "water-ppr20:02:control:pipe-order")).toBe("108");
    expect(quantity(complete, "water-ppr20:02:control:pipe-remainder")).toBe("3");
    expect(quantity(complete, "water-ppr20:02:control:pipe-mass")).toBe("17.928");
    expect(quantity(complete, "water-ppr20:03:fastener:support-points")).toBe("201");
    expect(quantity(complete, "water-ppr20:04:component:straight-couplings")).toBe("24");
    expect(quantity(complete, "water-ppr20:04:operation:socket-fusion")).toBe("48");
    expect(quantity(complete, "water-ppr20:04:equipment:fusion-machine")).toBe("3.223333333");
    expect(quantity(complete, "water-ppr20:04:consumable:cleaning-wipes")).toBe("48");
    expect(quantity(complete, "water-ppr20:05:consumable:cleaning-wipes")).toBe("28");
    expect(quantity(complete, "water-ppr20:05:consumable:thread-seal")).toBe("1");
    expect(quantity(complete, "water-ppr20:05:control:total-fusion-sockets")).toBe("76");
    expect(quantity(complete, "water-ppr20:06:labor:straight-fusion")).toBe("4");
    expect(quantity(complete, "water-ppr20:05:labor:node-installation")).toBe("1.6");
    expect(quantity(complete, "water-ppr20:07:material:test-water")).toBe("0.0137");
    expect(quantity(complete, "water-ppr20:07:material:flushing-water")).toBe("0.0411");

    expect(quantity(changed, "water-ppr20:02:material:pipe-sections")).toBe("35");
    expect(quantity(changed, "water-ppr20:02:control:pipe-order")).toBe("140");
    expect(quantity(changed, "water-ppr20:02:control:pipe-remainder")).toBe("3.5");
    expect(quantity(changed, "water-ppr20:02:control:pipe-mass")).toBe("23.24");
    expect(quantity(changed, "water-ppr20:03:fastener:support-points")).toBe("261");
    expect(quantity(changed, "water-ppr20:06:labor:route-installation")).toBe("32.5");
    expect(quantity(changed, "water-ppr20:07:operation:pressure-test")).toBe("2");
    expect(quantity(changed, "water-ppr20:07:material:flushing-water")).toBe("0.05343");

    expect(quantity(changedNodes, "water-ppr20:02:control:pipe-order")).toBe("108");
    expect(quantity(changedNodes, "water-ppr20:05:control:total-fusion-sockets")).toBe("80");
    expect(quantity(changedNodes, "water-ppr20:04:equipment:fusion-machine")).toBe("3.366666667");
    expect(quantity(changedNodes, "water-ppr20:05:consumable:cleaning-wipes")).toBe("32");
    expect(quantity(changedNodes, "water-ppr20:05:labor:node-installation")).toBe("1.8");
  });
});
