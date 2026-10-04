import {
  BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
  BRIDGE_ASPHALT_COMPLETE_FORMULAS,
  BRIDGE_ASPHALT_COMPLETE_PARAMETERS,
  BRIDGE_ASPHALT_COMPLETE_PROFILE_SUMMARY,
  BRIDGE_ASPHALT_COMPLETE_RESOURCES,
  BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
  BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
  compileBridgeAsphaltCompletePreliminaryProfileR1,
} from "../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1";
import { validateIndependentCompletenessMapReferences } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";

function quantity(rows: readonly { row_id: string; quantity: string }[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

describe("complete bridge asphalt preliminary profile S27", () => {
  it("guards eight imported ancillary orders against each mapped formula, including area-based curing independent of screed thickness", async () => {
    const ids = [...["binder", "wearing"].flatMap(course => ["road-bitumen", "technical-kerosene", "hardwood-side-stop-bars"].map(id => `bridge:${course}:asphalt:material:${id}`)),
      "bridge:screed:material:curing-sheet", "bridge:screed:joint:waterstop"];
    const run = (amount?: string, thickness = 40) => compileCanonicalEstimateCore({ operation: amount ? "recalculate" : "compile", compilerVersion: "bridge-ancillary-order-contract",
      catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID, primaryMeasureParameterId: "area_m2", parameterDefinitions: [...BRIDGE_ASPHALT_COMPLETE_PARAMETERS],
      formulaDefinitions: [...BRIDGE_ASPHALT_COMPLETE_FORMULAS], resourceDefinitions: [...BRIDGE_ASPHALT_COMPLETE_RESOURCES],
      submittedParameters: { ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT, protective_screed_thickness_mm: thickness, bridge_screed_construction_joint_mode: "WATERSTOP",
        bridge_screed_construction_joint_waterstop_specification: "VALIDATION_FIXTURE: ПВХ по испытательному узлу", bridge_screed_construction_joint_waterstop_length_m: 18 },
      confirmedParameters: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT, rowOverrides: amount ? Object.fromEntries(ids.map(id => [id, { quantity: amount, includedInProcurement: true,
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE imported ancillary supply" } }])) : {},
      priceItems: [], currencyCode: "KGS", maximumResourceRows: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
    const baseline = await run();
    for (const amount of ["0", "0.01", "10000"]) {
      const result = await run(amount);
      expect(result.preliminaryNeeds).toEqual([]);
      for (const id of ids) {
        const definition = BRIDGE_ASPHALT_COMPLETE_RESOURCES.find(value => value.row_id === id)!;
        const originalFormula = BRIDGE_ASPHALT_COMPLETE_FORMULAS.find(value => value.formula_id === definition.formula_id)!;
        expect(definition.resource_graph.purchaseBalanceV1).toMatchObject({ quantityMode: "canonical_decimal", unitId: definition.unit_id, consumedExpression: originalFormula.expression_source });
        expect(definition.resource_graph.purchaseBalanceV1).not.toHaveProperty("plannedConsumptionExpression");
        expect(result.rows.find(value => value.row_id === id)).toMatchObject({ quantity: amount, included_in_procurement: amount === "10000",
          calculation_trace: { purchaseBalance: { quantum: null, consumed: baseline.rows.find(value => value.row_id === id)!.quantity, procurementReady: amount === "10000" } } });
      }
      for (const before of baseline.rows.filter(value => !ids.includes(value.row_id)))
        expect(result.rows.find(value => value.row_id === before.row_id)?.quantity).toBe(before.quantity);
      if (amount === "10000") expect(() => assertCanonicalPurchaseReadinessV1(result.rows)).not.toThrow();
      else expect(() => assertCanonicalPurchaseReadinessV1(result.rows)).toThrow("не хватает для расхода");
    }
    const thicker = await run(undefined, 65);
    expect(thicker.rows.find(value => value.row_id === "bridge:screed:material:curing-sheet")?.quantity).toBe("5280");
    expect((thicker.rows.find(value => value.row_id === "bridge:screed:material:curing-sheet")?.calculation_trace as any).purchaseBalance.consumed).toBe("5280");
    expect(thicker.rows.find(value => value.row_id === "bridge:screed:work:place")?.quantity).toBe("312");
  });
  it("reconciles imported screed accepted order with screed geometry and its selected contingency only", async () => {
    const result = await compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "bridge-concrete-order-contract",
      catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID, primaryMeasureParameterId: "area_m2",
      parameterDefinitions: [...BRIDGE_ASPHALT_COMPLETE_PARAMETERS], formulaDefinitions: [...BRIDGE_ASPHALT_COMPLETE_FORMULAS],
      resourceDefinitions: [...BRIDGE_ASPHALT_COMPLETE_RESOURCES], submittedParameters: { ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT },
      confirmedParameters: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT, currencyCode: "KGS", priceItems: [],
      rowOverrides: { "bridge:screed:material:ready-mix": { quantity: "225.125", provenance: { kind: "manual", reason: "VALIDATION_FIXTURE independent screed order" } } },
      maximumResourceRows: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(value => value.row_id === "bridge:screed:material:ready-mix")).toMatchObject({ quantity: "225.125", calculation_trace: {
      purchaseBalance: { plannedConsumption: "192", requiredSelectedOrder: "207.36", excessOrderAboveRequiredConsumption: "17.765" } } });
    for (const id of ["delivery:mixer-trips", "quality:delivery-acceptance", "document:delivery-tickets"])
      expect(result.rows.find(value => value.row_id === `bridge:screed:${id}`)?.quantity).toBe("29");
    expect(result.rows.find(value => value.row_id === "bridge:screed:work:place")?.quantity).toBe("192");
    expect(result.rows.find(value => value.row_id === "bridge:binder:asphalt:material:hot-dense-fine-mix")?.quantity).toBe("579.84");
  });
  it("binds each existing asphalt course to its own accepted order without changing installed consumption", async () => {
    const result = await compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "bridge-order-contract",
      catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID, primaryMeasureParameterId: "area_m2",
      parameterDefinitions: [...BRIDGE_ASPHALT_COMPLETE_PARAMETERS], formulaDefinitions: [...BRIDGE_ASPHALT_COMPLETE_FORMULAS],
      resourceDefinitions: [...BRIDGE_ASPHALT_COMPLETE_RESOURCES], submittedParameters: { ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT },
      confirmedParameters: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT, currencyCode: "KGS", priceItems: [],
      rowOverrides: { "bridge:binder:asphalt:material:hot-dense-fine-mix": { quantity: "600.125",
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE independent course order" } } },
      maximumResourceRows: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
    expect(result.preliminaryNeeds).toEqual([]);
    const find = (id: string) => result.rows.find(value => value.row_id === `bridge:${id}`)!;
    expect(find("binder:asphalt:material:hot-dense-fine-mix")).toMatchObject({ quantity: "600.125",
      calculation_trace: { purchaseBalance: { consumed: "579.84", excessOrderAboveRequiredConsumption: "20.285" } } });
    expect(find("wearing:asphalt:material:hot-dense-fine-mix").quantity).toBe("579.84");
    expect(find("binder:asphalt:delivery:truck-trips").quantity).toBe("31");
    expect(find("wearing:asphalt:delivery:truck-trips").quantity).toBe("29");
    expect(find("binder:asphalt:delivery:ton-km").quantity).toBe("12002.5");
    expect(find("binder:asphalt:delivery:truck-machine-hours").quantity).toBe("46.5");
    expect(find("binder:asphalt:quality:mix-temperature").quantity).toBe("31");
    expect(find("binder:asphalt:operation:mix-receiving-feed").quantity).toBe("579.84");
    const aliases = BRIDGE_ASPHALT_COMPLETE_PARAMETERS.filter(value => value.truth_metadata?.effective_resource_quantity_v1);
    expect(aliases).toHaveLength(3);
    expect(new Set(aliases.map(value => value.parameter_id)).size).toBe(3);
    expect(aliases.map(value => value.truth_metadata?.effective_resource_quantity_v1)).toEqual([
      { sourceRowId: "bridge:binder:asphalt:material:hot-dense-fine-mix", unitId: "t" },
      { sourceRowId: "bridge:wearing:asphalt:material:hot-dense-fine-mix", unitId: "t" },
      { sourceRowId: "bridge:screed:material:ready-mix", unitId: "m3" }]);
  });
  it("calculates the 150 by 32 m first estimate without a short-row ceiling", async () => {
    const compiled = await compileBridgeAsphaltCompletePreliminaryProfileR1({
      ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
    });

    expect(BRIDGE_ASPHALT_COMPLETE_PROFILE_SUMMARY.composedRows.total).toBeGreaterThan(150);
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.length).toBe(BRIDGE_ASPHALT_COMPLETE_RESOURCES.length - 4);
    expect(compiled.rows.filter((row) => row.row_id !== "bridge:leveling:applicability")
      .every((row) => Number(row.quantity) > 0)).toBe(true);
    expect(quantity(compiled.rows, "bridge:binder:asphalt:material:hot-dense-fine-mix")).toBeCloseTo(579.84, 6);
    expect(quantity(compiled.rows, "bridge:wearing:asphalt:material:hot-dense-fine-mix")).toBeCloseTo(579.84, 6);
    expect(quantity(compiled.rows, "bridge:screed:material:ready-mix")).toBeCloseTo(207.36, 6);
    expect(quantity(compiled.rows, "bridge:screed:reinforcement-mesh")).toBeCloseTo(21_312, 6);
    expect(quantity(compiled.rows, "bridge:screed:reinforcement-mesh-cards")).toBe(972);
    expect(quantity(compiled.rows, "bridge:screed:reinforcement-mesh-purchased-area")).toBe(5_832);
    expect(quantity(compiled.rows, "bridge:screed:mesh-cover-compatibility")).toBe(3);
    expect(quantity(compiled.rows, "bridge:screed:formwork-screw-boxes")).toBe(15);
    expect(quantity(compiled.rows, "bridge:screed:formwork-stakes")).toBe(364);
    expect(quantity(compiled.rows, "bridge:screed:formwork-braces")).toBe(243);
    expect(quantity(compiled.rows, "bridge:asphalt:continuous-tack-emulsion")).toBe(2_880);
    expect(quantity(compiled.rows, "bridge:drainage:tubes")).toBe(5);
    expect(quantity(compiled.rows, "bridge:waterproofing:membrane")).toBeCloseTo(5_376, 6);
    expect(quantity(compiled.rows, "bridge:waterproofing:membrane-rolls")).toBe(703);
    expect(quantity(compiled.rows, "bridge:waterproofing:primer")).toBeCloseTo(1_440, 6);
  });

  it("uses the current 100 m2 geometry for screed curing, joints, packages and one shared mobilization", async () => {
    const compiled = await compileBridgeAsphaltCompletePreliminaryProfileR1({
      area_m2: 100,
      bridge_length_m: 20,
      bridge_width_m: 5,
    });

    expect(quantity(compiled.rows, "bridge:screed:material:ready-mix")).toBeCloseTo(4.32, 6);
    for (const rowId of [
      "bridge:screed:work:finish-surface",
      "bridge:screed:work:install-curing",
      "bridge:screed:work:maintain-curing",
      "bridge:screed:work:remove-curing",
    ]) {
      expect(quantity(compiled.rows, rowId)).toBe(100);
    }
    expect(quantity(compiled.rows, "bridge:screed:material:curing-sheet")).toBe(110);

    expect(quantity(compiled.rows, "bridge:joint:installation")).toBe(10);
    expect(quantity(compiled.rows, "bridge:joint:sealant")).toBe(6);
    expect(quantity(compiled.rows, "bridge:joint:primer")).toBe(0.5);
    expect(quantity(compiled.rows, "bridge:joint:backer-cord")).toBe(10.5);

    expect(quantity(compiled.rows, "bridge:waterproofing:membrane")).toBe(112);
    expect(quantity(compiled.rows, "bridge:waterproofing:detail-membrane")).toBe(5);
    expect(quantity(compiled.rows, "bridge:waterproofing:membrane-rolls")).toBe(15);
    expect(quantity(compiled.rows, "bridge:waterproofing:membrane-purchased-area")).toBe(120);
    expect(quantity(compiled.rows, "bridge:screed:reinforcement-mesh")).toBe(444);
    expect(quantity(compiled.rows, "bridge:screed:reinforcement-mesh-cards")).toBe(22);
    expect(quantity(compiled.rows, "bridge:screed:reinforcement-mesh-purchased-area")).toBe(132);
    expect(quantity(compiled.rows, "bridge:screed:mesh-cover-compatibility")).toBe(3);
    expect(quantity(compiled.rows, "bridge:screed:spacers")).toBe(400);
    expect(quantity(compiled.rows, "bridge:screed:spacer-packages")).toBe(1);
    expect(quantity(compiled.rows, "bridge:joint:sealant-packages")).toBe(1);
    expect(quantity(compiled.rows, "bridge:joint:backer-cord-coils")).toBe(1);
    expect(quantity(compiled.rows, "bridge:asphalt:continuous-tack-emulsion")).toBe(60);
    expect(quantity(compiled.rows, "bridge:drainage:tubes")).toBe(1);
    expect(quantity(compiled.rows, "bridge:screed:formwork-screw-boxes")).toBe(2);
    expect(quantity(compiled.rows, "bridge:screed:formwork-stakes")).toBe(50);
    expect(quantity(compiled.rows, "bridge:screed:formwork-braces")).toBe(34);

    const incompatible = await compileBridgeAsphaltCompletePreliminaryProfileR1({
      area_m2: 100,
      bridge_length_m: 20,
      bridge_width_m: 5,
      bridge_spacer_height_mm: 30,
    });
    expect(quantity(incompatible.rows, "bridge:screed:mesh-cover-compatibility")).toBe(-12);

    const binderMobilization = compiled.rows.find((row) =>
      row.row_id === "bridge:binder:asphalt:mobilization:paver");
    const wearingMobilization = compiled.rows.find((row) =>
      row.row_id === "bridge:wearing:asphalt:mobilization:paver");
    expect(binderMobilization?.included_in_estimate).toBe(true);
    expect(wearingMobilization?.included_in_estimate).toBe(false);
    expect(wearingMobilization?.title_ru).toContain("повторная мобилизация не начисляется");

    const resized = await compileBridgeAsphaltCompletePreliminaryProfileR1({
      area_m2: 160,
      bridge_length_m: 20,
      bridge_width_m: 8,
    });
    expect(quantity(resized.rows, "bridge:joint:installation")).toBe(16);
    expect(quantity(resized.rows, "bridge:screed:work:finish-surface")).toBe(160);
    expect(quantity(resized.rows, "bridge:screed:material:curing-sheet")).toBe(176);
  });

  it("keeps independently authored completeness entries resolvable and user-facing values editable", () => {
    const rowIds = new Set(BRIDGE_ASPHALT_COMPLETE_RESOURCES.map((resource) => resource.row_id));
    const formulaIds = new Set(BRIDGE_ASPHALT_COMPLETE_RESOURCES.map((resource) => resource.formula_id));
    for (const entry of BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP.entries) {
      if (entry.resolution.kind === "NOT_APPLICABLE") continue;
      expect(rowIds.has(String(entry.resolution.rowId))).toBe(true);
      expect(formulaIds.has(String(entry.formulaId))).toBe(true);
    }
    for (const parameterId of [
      "area_m2",
      "bridge_length_m",
      "bridge_width_m",
      "binder_layer_thickness_mm",
      "wearing_layer_thickness_mm",
      "protective_screed_thickness_mm",
      "bridge_primer_l_per_m2",
      "bridge_membrane_m2_per_m2",
      "bridge_reinforcement_mesh_kg_per_m2",
      "bridge_mesh_lap_m",
      "bridge_spacer_height_mm",
      "bridge_minimum_top_cover_mm",
      "bridge_expansion_joint_count",
      "bridge_continuous_tack_coat_rate_l_per_m2",
      "bridge_leveling_area_m2",
      "bridge_drainage_area_per_outlet_m2",
    ]) {
      const parameter = BRIDGE_ASPHALT_COMPLETE_PARAMETERS.find((candidate) =>
        candidate.parameter_id === parameterId);
      expect(parameter?.truth_metadata?.visibility_role).toBe("USER_INPUT");
      expect(parameter?.truth_metadata?.source_confirmation_required).toBe(false);
    }
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: BRIDGE_ASPHALT_COMPLETE_FORMULAS,
      resourceDefinitions: BRIDGE_ASPHALT_COMPLETE_RESOURCES,
    })).toEqual([]);
  });

  it("detects removal of every required leaf resource", () => {
    const requiredRows = BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP.entries
      .filter((entry) => entry.resolution.kind !== "NOT_APPLICABLE")
      .map((entry) => String(entry.resolution.rowId));
    for (const removedRowId of requiredRows) {
      const errors = validateIndependentCompletenessMapReferences({
        completenessMap: BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
        formulaDefinitions: BRIDGE_ASPHALT_COMPLETE_FORMULAS,
        resourceDefinitions: BRIDGE_ASPHALT_COMPLETE_RESOURCES.filter(
          (resource) => resource.row_id !== removedRowId,
        ),
      });
      expect(errors.some((error) => /_(?:ROW|PARENT_ROW)_REFERENCE$/u.test(error))).toBe(true);
    }
  });
});
