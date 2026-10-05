import { compileWetZoneWaterproofingCompletionS2735 as compile,
  WET_ZONE_COMPLETION_ACCEPTANCE_INPUT_S2735 as fixture,
  WET_ZONE_COMPLETION_DEFINITION_S2735 as definition,
  WET_ZONE_COMPLETION_ROWS_S2735 as ids } from "../../src/lib/estimate/v4/wetZoneWaterproofingCompletionS2735";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
const trace = (row: Record<string, unknown>) => row.calculation_trace as Record<string, unknown>;

describe("S27.35 reusable wet-zone waterproofing completion", () => {
  test("saves the known area and preserves local unknown facts without hidden fixture quantities", async () => {
    const result = await compile({ area_m2: 25 });
    expect(result.rows.map(row => [row.row_id, row.quantity])).toEqual([[ids.scope, "25"]]);
    expect(result.preliminaryNeeds).toHaveLength(21);
    expect(result.preliminaryNeeds.every(need => need.quantity === null)).toBe(true);
    expect(Object.keys(definition.runtimeInput)).not.toContain("waterproofing_productivity_m2_per_man_hour");
    expect(Object.keys(definition.runtimeInput)).not.toContain("junction_tape_length_m");
  });
  test("combines two-coat consumption before bucket rounding and discloses separate physical accessories", async () => {
    const result = await compile({ ...fixture });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(22);
    const membrane = result.rows.find(row => row.row_id === ids.membrane)!;
    expect(membrane.quantity).toBe("35");
    expect(trace(membrane).purchaseBalance).toEqual(expect.objectContaining({
      consumed: "32.5", quantum: "5", effectiveOrder: "35", remaining: "2.5", freeBeyondReserve: "2.5",
      consumptionShortage: "0", reserveDeficit: "0",
    }));
    expect(result.rows.find(row => row.row_id === ids.tape)?.quantity).toBe("20");
    expect(result.rows.find(row => row.row_id === ids.collars)?.quantity).toBe("3");
    expect(result.rows.find(row => row.row_id === ids.primer)?.quantity).toBe("5");
    expect(result.rows.filter(row => row.row_id === ids.membrane)).toHaveLength(1);
    expect(result.rows.some(row => row.unit_id === "set")).toBe(false);
  });
  test("uses actual stock, retained reserve and selected bucket; exact boundary stays one bucket", async () => {
    const result = await compile({ ...fixture, area_m2: 50, cl51_stock: 12, cl51_reserve: 3, selected_bucket_size_kg: "15" });
    expect(trace(result.rows.find(row => row.row_id === ids.membrane)!).purchaseBalance)
      .toEqual(expect.objectContaining({ consumed: "65", stock: "12", reserve: "3", effectiveOrder: "60",
        remaining: "7", freeBeyondReserve: "4", consumptionShortage: "0", reserveDeficit: "0" }));
    const exact = await compile({ ...fixture, area_m2: "3.846153846", selected_bucket_size_kg: "5" });
    expect(exact.rows.find(row => row.row_id === ids.membrane)?.quantity).toBe("5");
  });
  test.each(["under_ceramic_covering", "permanent_water_contact_excluded", "rear_surface_moisture_excluded",
    "chemical_exposure_excluded", "regional_tds_conditions_confirmed"])("requires the actual applicability fact %s", async flag => {
    const missing: Record<string, unknown> = { ...fixture }; delete missing[flag];
    const result = await compile(missing);
    expect(result.rows.some(row => row.row_id === ids.membrane)).toBe(false);
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.membrane)?.missing_parameter_ids).toContain(flag);
    await expect(compile({ ...fixture, [flag]: false })).rejects.toThrow();
  });
  test.each(["10", "7", "0"])("rejects an undocumented CL51 bucket %s", async value => {
    await expect(compile({ ...fixture, selected_bucket_size_kg: value })).rejects.toThrow();
  });
  test("keeps prior priming and manual preparation free of a second supply/equipment charge", async () => {
    const facts: Record<string, unknown> = { ...fixture, primer_mode: "ALREADY_PRIMED", equipment_mode: "MANUAL", delivery_mode: "INCLUDED_IN_SUPPLY" };
    for (const id of ["ct17_selected_total_consumption_l_m2", "ct17_container_l", "primer_worker_h", "equipment_designation", "equipment_machine_h", "delivery_trip_count"]) delete facts[id];
    const result = await compile(facts);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => row.row_id === ids.primer || row.row_id === ids.equipment || row.category === "delivery")).toBe(false);
    for (const id of [ids.quality, ids.documentation]) {
      const row = result.rows.find(row => row.row_id === id)!;
      expect(row.unit_price).toBeNull();
      expect(row.amount).toBeNull();
      expect(trace(row).resourceGraph).toEqual(expect.objectContaining({ costTreatment: "INCLUDED_IN_RESOURCE_ROWS", includedInResourceOwnerRowId: ids.labor }));
    }
  });
  test("does not invent a selected CT17 rate from its manufacturer's range", async () => {
    const facts: Record<string, unknown> = { ...fixture }; delete facts.ct17_selected_total_consumption_l_m2;
    const result = await compile(facts);
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.primer)?.missing_parameter_ids).toContain("ct17_selected_total_consumption_l_m2");
    await expect(compile({ ...fixture, ct17_selected_total_consumption_l_m2: 0.6 })).rejects.toThrow();
  });
  test("included delivery still needs confirmed supply boundaries and cannot disappear as an unknown fact", async () => {
    const facts: Record<string, unknown> = { ...fixture, delivery_mode: "INCLUDED_IN_SUPPLY" };
    delete facts.delivery_trip_count; delete facts.delivery_reference;
    const result = await compile(facts);
    expect(result.rows.some(row => row.row_id === ids.membrane)).toBe(false);
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.membrane)?.missing_parameter_ids).toContain("delivery_reference");
  });
  test("a supplier override recomputes the saved balance and blocks shortage", async () => {
    const result = await compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "wet-zone-order-contract",
      catalogId: "canonical-work:base:tile_stone_interior_ceramic_tile_waterproof_wet_zone", primaryMeasureParameterId: "area_m2",
      parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
      submittedParameters: { ...fixture }, confirmedParameters: { ...definition.runtimeInput }, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 22, hashJson: async value => estimateDeterministicHash(value),
      rowOverrides: { [ids.membrane]: { quantity: "30", provenance: { kind: "manual", reason: "DEMO supplier reduced order" } } },
    });
    expect(trace(result.rows.find(row => row.row_id === ids.membrane)!).purchaseBalance)
      .toEqual(expect.objectContaining({ effectiveOrder: "30", consumptionShortage: "2.5", procurementReady: false }));
  });
  test("does not allow a second price on controls already included in labor", async () => {
    const result = await compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "wet-zone-no-double-price",
      catalogId: "canonical-work:base:tile_stone_interior_ceramic_tile_waterproof_wet_zone", primaryMeasureParameterId: "area_m2",
      parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
      submittedParameters: { ...fixture }, confirmedParameters: { ...definition.runtimeInput }, currencyCode: "KGS", priceItems: [],
      maximumResourceRows: 22, hashJson: async value => estimateDeterministicHash(value),
      rowOverrides: { [ids.quality]: { unitPrice: "10", includedInEstimate: true, includedInProcurement: true,
        provenance: { kind: "manual", reason: "DEMO attempted duplicate control price" } } },
    });
    expect(result.rows.find(row => row.row_id === ids.quality)).toEqual(expect.objectContaining({
      included_in_estimate: false, included_in_procurement: false, ownership_status: "OWNED_EXCLUDED",
    }));
    expect(result.totals.amount).toBe("0");
    expect(result.totals.pricedRowCount).toBe(0);
  });
});
