import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
  ELECOR_SELECTED_SUPPLIES,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileElectricalElecorCableChannelStandardS2723,
  electricalElecorCableChannelStandardMissingRows,
} from "../../src/lib/estimate/v4/electricalElecorCableChannelStandardS2723";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { selectCanonicalArtifactRows, buildCanonicalProcurementProjection } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const manual = { kind: "manual", reason: "VALIDATION_FIXTURE: selected whole packages, not warehouse stock" };
const channelId = "electrical-elecor:02:material:channel-packs";
const fastenerId = "electrical-elecor:03:fastener:packages";
const connectorId = "electrical-elecor:04:component:straight-connector-sets";
const quantity = (result: Awaited<ReturnType<typeof compileElectricalElecorCableChannelStandardS2723>>, id: string) =>
  result.rows.find(row => row.row_id === id)?.quantity;

describe("S27.23 IEK ELECOR 40x25 standard cable-channel profile", () => {
  test("reconciles all six physical controls from accepted packages while installation and independent delivery remain unchanged", async () => {
    const baseline = await compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT });
    const result = await compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      elecor_effective_channel_packs: "999" }, {
      [channelId]: { quantity: "6", provenance: manual }, [fastenerId]: { quantity: "4", provenance: manual },
      [connectorId]: { quantity: "14", provenance: manual },
    });
    expect(result.preliminaryNeeds).toEqual([]);
    for (const [id, expected] of Object.entries({
      "electrical-elecor:02:control:channel-order": "144", "electrical-elecor:02:control:channel-remainder": "39",
      "electrical-elecor:03:control:fastener-order": "400", "electrical-elecor:03:control:fastener-remainder": "199",
      "electrical-elecor:04:control:straight-connector-order": "56", "electrical-elecor:04:control:straight-connector-remainder": "7",
    })) expect(quantity(result, id)).toBe(expected);
    for (const id of ["electrical-elecor:02:operation:cutting", "electrical-elecor:03:fastener:points",
      "electrical-elecor:04:component:straight-connectors-net", "electrical-elecor:06:operation:channel-installation",
      "electrical-elecor:06:labor:installer-hours", "electrical-elecor:07:delivery:materials", "electrical-elecor:07:delivery:waste"])
      expect(quantity(result, id)).toBe(quantity(baseline, id));
    expect((result.rows.find(row => row.row_id === channelId)?.calculation_trace as Record<string, unknown>).purchaseBalance)
      .toMatchObject({ quantum: "1", plannedConsumption: "5", requiredSelectedOrder: "5", excessOrderAboveRequiredConsumption: "1", procurementReady: true });
    const reset = await compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      [channelId]: { quantity: null, provenance: manual },
    });
    expect(quantity(reset, channelId)).toBe("5");
    expect(quantity(reset, "electrical-elecor:02:control:channel-order")).toBe("120");
  });
  test("keeps saved shortages authoritative after JSON writer projection and filtered procurement selection", async () => {
    const result = await compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      [channelId]: { quantity: "4", includedInProcurement: true, provenance: manual },
      [fastenerId]: { quantity: "2", includedInProcurement: true, provenance: manual },
      [connectorId]: { quantity: "12", includedInProcurement: true, provenance: manual },
      "electrical-elecor:02:control:channel-remainder": { quantity: "999", includedInEstimate: true, provenance: manual },
    });
    const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(row => { delete row.procurement_readiness; return row; });
    const reopened = stored.map(row => canonicalEstimateRevisionRowFromStorage(row, null));
    for (const [rowId, q] of [[channelId, "4"], [fastenerId, "2"], [connectorId, "12"]]) {
      expect(reopened.find(row => row.rowId === rowId)).toMatchObject({ quantity: q, includedInProcurement: false,
        calculationTrace: { manualQuantityOverride: true, purchaseBalance: { consumptionShortage: "1", procurementReady: false } } });
    }
    expect(quantity(result, "electrical-elecor:02:control:channel-order")).toBe("96");
    expect(quantity(result, "electrical-elecor:03:control:fastener-remainder")).toBe("0");
    expect(quantity(result, "electrical-elecor:04:control:straight-connector-remainder")).toBe("0");
    expect(result.rows.find(row => row.row_id === "electrical-elecor:02:control:channel-remainder")?.included_in_estimate).toBe(false);
    const selection = selectCanonicalArtifactRows(stored);
    expect(selection.procurementRows.some(row => [channelId, fastenerId, connectorId].includes(String(row.row_id)))).toBe(false);
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "TEST", release_id: "TEST", catalog_id: "TEST", checksum_sha256: "TEST", row_count: stored.length },
      sourceRows: selection.sourceRows, procurementRows: selection.procurementRows })).toThrow("не хватает до расчётного заказа");
  });
  test("guards all eleven selected whole-item supplies before rounding and keeps zero a visible shortage", async () => {
    expect(ELECOR_SELECTED_SUPPLIES).toHaveLength(11);
    for (const supply of ELECOR_SELECTED_SUPPLIES) {
      await expect(compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT }, {
        [`electrical-elecor:${supply.rowId}`]: { quantity: "0.5", provenance: manual },
      })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    }
    await expect(compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      [channelId]: { quantity: "6.0000000001", provenance: manual },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const zero = await compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT }, {
      [channelId]: { quantity: "0", provenance: manual },
    });
    expect(quantity(zero, "electrical-elecor:02:control:channel-order")).toBe("0");
    expect(quantity(zero, "electrical-elecor:02:control:channel-remainder")).toBe("0");
    expect((zero.rows.find(row => row.row_id === channelId)?.calculation_trace as Record<string, unknown>).purchaseBalance)
      .toMatchObject({ consumptionShortage: "5", procurementReady: false });
  });
  test("uses actual selected packaging in title specifications as well as quantities", async () => {
    const result = await compileElectricalElecorCableChannelStandardS2723({ ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      channel_transport_pack_m: 25, accessory_items_per_set: 5, channel_section_length_m: 2.5 });
    expect(quantity(result, channelId)).toBe("5");
    expect(quantity(result, "electrical-elecor:02:control:channel-order")).toBe("125");
    expect(quantity(result, connectorId)).toBe("8");
    for (const [id, value] of [[channelId, "25"], [connectorId, "5"], ["electrical-elecor:05:component:inner-corner-sets", "5"],
      ["electrical-elecor:02:operation:cutting", "2.5"]]) {
      expect(result.rows.find(row => row.row_id === id)?.title_ru).toContain(` — ${value}`);
    }
    expect(result.rows.find(row => row.row_id === channelId)?.title_ru).not.toContain("по 24 м");
    expect(result.rows.find(row => row.row_id === connectorId)?.title_ru).not.toContain("по 4 шт");
  });
  test("binds an immutable official-source pack and an independent completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS.length,
      ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS.length,
      ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([25, 33, 41]);
    expect(new Set(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.length);

    const full = new Set(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(electricalElecorCableChannelStandardMissingRows(full)).toEqual([]);
    for (const rowId of full) {
      const mutated = new Set(full);
      mutated.delete(rowId);
      expect(electricalElecorCableChannelStandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("shows a useful estimate from route length while preserving unknown node accessories", async () => {
    const result = await compileElectricalElecorCableChannelStandardS2723({
      route_length_m: 100,
    });
    const expectedNeeds = [
      "electrical-elecor:05:component:inner-corner-sets",
      "electrical-elecor:05:component:outer-corner-sets",
      "electrical-elecor:05:component:flat-angle-sets",
      "electrical-elecor:05:component:tee-sets",
      "electrical-elecor:05:component:end-cap-sets",
      "electrical-elecor:05:operation:inner-corners",
      "electrical-elecor:05:operation:outer-corners",
      "electrical-elecor:05:operation:flat-angles",
      "electrical-elecor:05:operation:tees",
      "electrical-elecor:05:operation:end-caps",
    ].sort();

    expect(result.rows).toHaveLength(31);
    expect(result.preliminaryNeeds.map((need) => need.row_id).sort()).toEqual(expectedNeeds);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(10);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        row_id: "electrical-elecor:02:material:channel-packs",
        quantity: "5",
      }),
      expect.objectContaining({
        row_id: "electrical-elecor:03:fastener:packages",
        quantity: "3",
      }),
      expect.objectContaining({
        row_id: "electrical-elecor:04:component:straight-connector-sets",
        quantity: "13",
      }),
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("calculates complete nodes, packaging, order and remainder and recalculates by length", async () => {
    const complete = await compileElectricalElecorCableChannelStandardS2723({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileElectricalElecorCableChannelStandardS2723({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
    });
    const repacked = await compileElectricalElecorCableChannelStandardS2723({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      channel_transport_pack_m: 25,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    expect(complete.rows).toHaveLength(41);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(15);
    expect(quantity(complete, "electrical-elecor:02:material:channel-packs")).toBe("5");
    expect(quantity(complete, "electrical-elecor:02:control:channel-order")).toBe("120");
    expect(quantity(complete, "electrical-elecor:02:control:channel-remainder")).toBe("15");
    expect(quantity(complete, "electrical-elecor:02:operation:cutting")).toBe("50");
    expect(quantity(complete, "electrical-elecor:03:fastener:points")).toBe("201");
    expect(quantity(complete, "electrical-elecor:03:fastener:packages")).toBe("3");
    expect(quantity(complete, "electrical-elecor:04:component:straight-connectors-net")).toBe("49");
    expect(quantity(complete, "electrical-elecor:04:component:straight-connector-sets")).toBe("13");
    expect(quantity(complete, "electrical-elecor:04:control:straight-connector-order")).toBe("52");
    expect(quantity(complete, "electrical-elecor:04:control:straight-connector-remainder")).toBe("3");
    expect(quantity(complete, "electrical-elecor:05:component:inner-corner-sets")).toBe("1");
    expect(quantity(complete, "electrical-elecor:05:component:tee-sets")).toBe("1");

    expect(quantity(changed, "electrical-elecor:02:material:channel-packs")).toBe("6");
    expect(quantity(changed, "electrical-elecor:02:control:channel-order")).toBe("144");
    expect(quantity(changed, "electrical-elecor:02:operation:cutting")).toBe("65");
    expect(quantity(changed, "electrical-elecor:03:fastener:points")).toBe("261");
    expect(quantity(changed, "electrical-elecor:04:component:straight-connector-sets")).toBe("16");
    expect(quantity(changed, "electrical-elecor:06:labor:installer-hours")).toBe("32.5");

    expect(quantity(repacked, "electrical-elecor:02:material:channel-packs")).toBe("5");
    expect(quantity(repacked, "electrical-elecor:02:control:channel-order")).toBe("125");
    expect(quantity(repacked, "electrical-elecor:04:component:straight-connectors-net")).toBe("49");
    expect(quantity(repacked, "electrical-elecor:04:component:straight-connector-sets")).toBe("13");
  });
});
