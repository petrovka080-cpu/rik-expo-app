import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
  P113_SELECTED_SUPPLIES,
  compileDrywallCeilingP113FullCycleS2723,
  drywallCeilingP113FullCycleMissingRows,
} from "../../src/lib/estimate/v4/drywallCeilingP113FullCycleS2723";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const manual = { kind: "manual", reason: "VALIDATION_FIXTURE selected whole P113 supply; no project approval" };
const ppId = "ceiling-p113-full:02:material:pp-profile-pieces";
const boardId = "ceiling-p113-full:03:material:gsp-sheets";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json",
);

describe("S27.23 complete KNAUF P113 ceiling", () => {
  test("binds the graph to the independently authored official-source pack", () => {
    const bytes = readFileSync(SOURCE_PACK_PATH);
    const sourcePack = JSON.parse(bytes.toString("utf8")) as Record<string, any>;

    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256);
    expect(sourcePack).toMatchObject({
      authoredIndependentlyFromDefinitionRows: true,
      schemaVersion: "drywall-ceiling-p113-full-cycle-s27-23.v1",
    });
    expect(sourcePack.sources[0]).toMatchObject({
      sourceId: "KNAUF_P11_TECHNICAL_SHEET_2025_02",
      authority: "ООО КНАУФ ГИПС",
    });
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS).toHaveLength(43);
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS).toHaveLength(38);
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES).toHaveLength(54);
  });

  test("returns the useful 500 m2 estimate immediately and keeps geometry-dependent rows visible", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
    });

    expect(result.rows).toHaveLength(47);
    expect(result.preliminaryNeeds.map((need) => need.row_id)).toEqual([
      "ceiling-p113-full:02:material:pn-profile-pieces",
      "ceiling-p113-full:02:fastener:perimeter-packages",
      "ceiling-p113-full:02:consumable:sealing-tape-rolls",
      "ceiling-p113-full:02:operation:perimeter-installation",
      "ceiling-p113-full:04:material:separation-tape-rolls",
      "ceiling-p113-full:06:material:control-joint-pieces",
      "ceiling-p113-full:06:operation:control-joint-installation",
    ]);
    expect(result.preliminaryNeeds.slice(0, 5).every((need) =>
      need.missing_parameter_ids.includes("room_length_m")
      && need.missing_parameter_ids.includes("room_width_m")
    )).toBe(true);
    expect(result.preliminaryNeeds.slice(5).every((need) =>
      need.missing_parameter_ids.includes("control_joint_length_m")
    )).toBe(true);
    expect(result.rows.find((row) =>
      row.row_id === "ceiling-p113-full:02:material:pp-profile-pieces")?.quantity).toBe("508");
    expect(result.rows.find((row) =>
      row.row_id === "ceiling-p113-full:03:material:gsp-sheets")?.quantity).toBe("219");
  });

  test("uses accepted whole supplies for seven controls while keeping installed area, norms and explicit transport unchanged", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
      p113_effective_pp_items: 9999 }, {
      [ppId]: { quantity: "510", provenance: manual }, [boardId]: { quantity: "220", provenance: manual },
      "ceiling-p113-full:04:material:joint-compound-bags": { quantity: "10", provenance: manual },
      "ceiling-p113-full:04:material:joint-tape-rolls": { quantity: "10", provenance: manual },
      "ceiling-p113-full:05:material:primer-cans": { quantity: "7", provenance: manual },
    });
    const quantity = (suffix: string) => result.rows.find(row => row.row_id === `ceiling-p113-full:${suffix}`)?.quantity;
    expect(quantity("02:control:pp-profile-order")).toBe("1530");
    expect(quantity("02:control:pp-profile-remainder")).toBe("80");
    expect(quantity("03:control:gsp-order")).toBe("528");
    expect(quantity("03:control:gsp-remainder")).toBe("28");
    expect(quantity("04:control:joint-compound-remainder")).toBe("50");
    expect(quantity("04:control:joint-tape-remainder")).toBe("150");
    expect(quantity("05:control:primer-remainder")).toBe("20");
    expect(result.derivedParameters.p113_effective_pp_items).toBe("510");
    const original = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT });
    for (const row of original.rows.filter(row => /:operation:|:delivery:|:equipment:|:control:.*-net$/u.test(row.row_id))) {
      expect(result.rows.find(value => value.row_id === row.row_id)?.quantity).toBe(row.quantity);
    }
    expect((result.rows.find(row => row.row_id === ppId)?.calculation_trace as Record<string, unknown>).purchaseBalance).toMatchObject({
      quantityMode: "supply_quantum", quantum: "1", plannedConsumption: "484", requiredSelectedOrder: "508", excessOrderAboveRequiredConsumption: "2" });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(() => assertCanonicalPurchaseReadinessV1(result.rows)).not.toThrow();
  });

  test("persists selected-order deficits despite positive physical forecast excess and manual informational controls", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, {
      [ppId]: { quantity: "500", includedInProcurement: true, provenance: manual },
      [boardId]: { quantity: "210", includedInProcurement: true, provenance: manual },
      "ceiling-p113-full:02:control:pp-profile-remainder": { quantity: "999", includedInEstimate: true, provenance: manual },
    });
    const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(row => { delete row.procurement_readiness; return row; });
    const reopened = stored.map(row => canonicalEstimateRevisionRowFromStorage(row, null));
    expect(reopened.find(row => row.rowId === ppId)).toMatchObject({ quantity: "500", includedInProcurement: false,
      calculationTrace: { manualQuantityOverride: true, purchaseBalance: { plannedConsumption: "484", requiredSelectedOrder: "508", consumptionShortage: "8", procurementReady: false } } });
    expect(reopened.find(row => row.rowId === boardId)).toMatchObject({ quantity: "210", includedInProcurement: false,
      calculationTrace: { purchaseBalance: { consumptionShortage: "9", procurementReady: false } } });
    expect(result.rows.find(row => row.row_id === "ceiling-p113-full:03:control:gsp-remainder")?.quantity).toBe("4");
    expect(result.rows.find(row => row.row_id === "ceiling-p113-full:02:control:pp-profile-remainder")?.included_in_estimate).toBe(false);
    const selection = selectCanonicalArtifactRows(stored);
    expect(selection.procurementRows.some(row => row.row_id === ppId || row.row_id === boardId)).toBe(false);
    expect(() => assertCanonicalPurchaseReadinessV1(reopened)).toThrow("не хватает до расчётного заказа");
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "P113-saved", release_id: "TEST", catalog_id: "TEST", checksum_sha256: "TEST", row_count: stored.length },
      sourceRows: selection.sourceRows, procurementRows: selection.procurementRows })).toThrow("Закупка не готова");
    const unmodifiedControls = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, {
      [ppId]: { quantity: "500", provenance: manual }, [boardId]: { quantity: "210", provenance: manual },
    });
    expect(unmodifiedControls.rows.find(row => row.row_id === "ceiling-p113-full:02:control:pp-profile-remainder")?.quantity).toBe("50");
  });

  test("guards all seventeen actual whole-supply owners, permits zero with a deficit and preserves geometry needs", async () => {
    expect(P113_SELECTED_SUPPLIES).toHaveLength(17);
    const guarded = DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES.filter(row => row.resource_graph.purchaseBalanceV1);
    expect(guarded.map(row => row.row_id).sort()).toEqual(P113_SELECTED_SUPPLIES.map(supply => `ceiling-p113-full:${supply.rowId}`).sort());
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS.filter(parameter => parameter.truth_metadata?.visibility_role === "INTERNAL_ONLY")).toHaveLength(5);
    for (const supply of P113_SELECTED_SUPPLIES) await expect(compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, {
      [`ceiling-p113-full:${supply.rowId}`]: { quantity: "0.5", provenance: manual },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    await expect(compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, {
      [ppId]: { quantity: "510.0000000001", provenance: manual },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const zero = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, { [ppId]: { quantity: "0", provenance: manual } });
    expect((zero.rows.find(row => row.row_id === ppId)?.calculation_trace as Record<string, unknown>).purchaseBalance).toMatchObject({ consumptionShortage: "508", procurementReady: false });
    expect(zero.rows.find(row => row.row_id === "ceiling-p113-full:02:control:pp-profile-remainder")?.quantity).toBe("0");
    const missing = await compileDrywallCeilingP113FullCycleS2723({ area_m2: 500 });
    expect(missing.preliminaryNeeds).toHaveLength(7);
    expect(missing.preliminaryNeeds.every(need => need.missing_parameter_ids.every(id => !id.startsWith("p113_effective_")))).toBe(true);
  });

  test("recomputes the selected whole-supply threshold and physical controls after the actual package size changes, and resets accepted quantities", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT, profile_piece_length_m: 4 }, {
      [ppId]: { quantity: "380", provenance: manual },
    });
    expect((result.rows.find(row => row.row_id === ppId)?.calculation_trace as Record<string, unknown>).purchaseBalance).toMatchObject({
      plannedConsumption: "363", requiredSelectedOrder: "381", effectiveOrder: "380", consumptionShortage: "1" });
    expect(result.rows.find(row => row.row_id === "ceiling-p113-full:02:control:pp-profile-order")?.quantity).toBe("1520");
    expect(result.rows.find(row => row.row_id === "ceiling-p113-full:02:control:pp-profile-remainder")?.quantity).toBe("70");
    const reset = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT });
    expect(reset.rows.find(row => row.row_id === ppId)?.quantity).toBe("508");
    expect(reset.rows.find(row => row.row_id === "ceiling-p113-full:02:control:pp-profile-order")?.quantity).toBe("1524");
  });

  test("calculates the complete 500 m2 procurement, operations and package residue", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
    });
    const quantity = (rowId: string) =>
      result.rows.find((row) => row.row_id === rowId)?.quantity;

    expect(result.rows).toHaveLength(54);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(new Set(result.rows.map((row) => row.section)).size).toBe(8);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(28);
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
    expect(quantity("ceiling-p113-full:02:material:pp-profile-pieces")).toBe("508");
    expect(quantity("ceiling-p113-full:02:control:pp-profile-order")).toBe("1524");
    expect(quantity("ceiling-p113-full:02:control:pp-profile-remainder")).toBe("74");
    expect(quantity("ceiling-p113-full:02:material:pn-profile-pieces")).toBe("32");
    expect(quantity("ceiling-p113-full:02:fastener:perimeter-packages")).toBe("2");
    expect(quantity("ceiling-p113-full:02:consumable:sealing-tape-rolls")).toBe("4");
    expect(quantity("ceiling-p113-full:03:material:gsp-sheets")).toBe("219");
    expect(quantity("ceiling-p113-full:03:control:gsp-order")).toBe("525.6");
    expect(quantity("ceiling-p113-full:03:control:gsp-remainder")).toBe("25.6");
    expect(quantity("ceiling-p113-full:03:fastener:tn25-packages")).toBe("12");
    expect(quantity("ceiling-p113-full:04:material:joint-compound-bags")).toBe("9");
    expect(quantity("ceiling-p113-full:04:control:joint-compound-remainder")).toBe("25");
    expect(quantity("ceiling-p113-full:04:material:joint-tape-rolls")).toBe("9");
    expect(quantity("ceiling-p113-full:04:control:joint-tape-remainder")).toBe("75");
    expect(quantity("ceiling-p113-full:05:material:primer-cans")).toBe("6");
    expect(quantity("ceiling-p113-full:05:control:primer-remainder")).toBe("10");
    expect(quantity("ceiling-p113-full:06:material:control-joint-pieces")).toBe("7");
  });

  test("recalculates from changed area and detects every independently required removal", async () => {
    const changed = await compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
      area_m2: 600,
    });
    expect(changed.rows.find((row) =>
      row.row_id === "ceiling-p113-full:02:material:pp-profile-pieces")?.quantity).toBe("609");
    expect(changed.rows.find((row) =>
      row.row_id === "ceiling-p113-full:03:material:gsp-sheets")?.quantity).toBe("263");

    const fullRowIds = new Set(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES.map((row) => row.row_id));
    expect(drywallCeilingP113FullCycleMissingRows(fullRowIds)).toEqual([]);
    for (const component of DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries) {
      for (const requiredRowId of component.requiredRowIds) {
        const mutated = new Set(fullRowIds);
        mutated.delete(requiredRowId);
        expect(drywallCeilingP113FullCycleMissingRows(mutated)).toContain(requiredRowId);
      }
    }
  });
});
