import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import {
  ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS,
  ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS,
  anchorGroupConcretePlacementAcceptanceInputR1,
  anchorGroupConcretePlacementMissingRequiredRowsR2,
  compileAnchorGroupConcretePlacementR1,
} from "../../src/lib/estimate/v4/anchorGroupConcretePlacementR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";

describe("anchor group concrete placement professional profile", () => {
  it("inherits the two ancillary order guards without moving installation or curing consumption", async () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[1];
    const ids = ["anchor-group-pour:material:curing-sheet", "anchor-group-pour:joint:waterstop"];
    const run = (amounts?: string[]) => compileCanonicalEstimateCore({ operation: amounts ? "recalculate" : "compile", compilerVersion: "anchor-ancillary-order-contract",
      catalogId: target.catalogId, primaryMeasureParameterId: "plan_dimension_concrete_volume_m3", parameterDefinitions: [...ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS],
      formulaDefinitions: [...ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS], resourceDefinitions: [...ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES],
      submittedParameters: { ...anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey), construction_joint_mode: "WATERSTOP",
        construction_joint_waterstop_specification: "VALIDATION_FIXTURE: ПВХ по испытательному узлу", construction_joint_waterstop_length_m: 18 },
      confirmedParameters: {}, rowOverrides: amounts ? Object.fromEntries(ids.map((id, index) => [id, { quantity: amounts[index], includedInProcurement: true,
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE ancillary supply" } }])) : {},
      priceItems: [], currencyCode: "KGS", maximumResourceRows: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
    const baseline = await run();
    for (const amounts of [["0", "0"], ["100", "20"]]) {
      const result = await run(amounts);
      expect(result.preliminaryNeeds).toEqual([]);
      for (const [index, id] of ids.entries()) {
        const before = baseline.rows.find(value => value.row_id === id)!;
        expect(result.rows.find(value => value.row_id === id)).toMatchObject({ quantity: amounts[index], included_in_procurement: amounts[index] !== "0",
          calculation_trace: { purchaseBalance: { quantityMode: "canonical_decimal", quantum: null, consumed: before.quantity, procurementReady: amounts[index] !== "0" } } });
      }
      for (const before of baseline.rows.filter(value => !ids.includes(value.row_id)))
        expect(result.rows.find(value => value.row_id === before.row_id)?.quantity).toBe(before.quantity);
      if (amounts[0] === "0") expect(() => assertCanonicalPurchaseReadinessV1(result.rows)).toThrow("не хватает для расхода");
      else expect(() => assertCanonicalPurchaseReadinessV1(result.rows)).not.toThrow();
    }
  });
  it("keeps the imported owner's source binding and reconciles its own accepted concrete order", async () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[1];
    const result = await compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "anchor-order-contract", catalogId: target.catalogId,
      primaryMeasureParameterId: "plan_dimension_concrete_volume_m3", parameterDefinitions: [...ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS],
      formulaDefinitions: [...ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS], resourceDefinitions: [...ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES],
      submittedParameters: { ...anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey) },
      confirmedParameters: {},
      rowOverrides: { "anchor-group-pour:material:ready-mix": { quantity: "25.125", provenance: { kind: "manual", reason: "VALIDATION_FIXTURE anchor order" } } },
      priceItems: [], currencyCode: "KGS", maximumResourceRows: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES.length,
      hashJson: async value => estimateDeterministicHash(value) });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(value => value.row_id === "anchor-group-pour:material:ready-mix")).toMatchObject({ quantity: "25.125",
      calculation_trace: { purchaseBalance: { plannedConsumption: "18", requiredSelectedOrder: "19.8", excessOrderAboveRequiredConsumption: "5.325" } } });
    for (const id of ["delivery:mixer-trips", "quality:delivery-acceptance", "document:delivery-tickets"])
      expect(result.rows.find(value => value.row_id === `anchor-group-pour:${id}`)?.quantity).toBe("4");
    expect(result.rows.find(value => value.row_id === "anchor-group-pour:work:place")?.quantity).toBe("18");
    const derived = ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS.find(value => value.truth_metadata.effective_resource_quantity_v1)!;
    expect(derived.truth_metadata).toMatchObject({ visibility_role: "INTERNAL_ONLY", effective_resource_quantity_v1: {
      sourceRowId: "anchor-group-pour:material:ready-mix", unitId: "m3" } });
    expect(derived.truth_metadata).not.toHaveProperty("guide");
  });
  it("compiles all seven contexts as complete, calculated concrete-placement estimates", async () => {
    const fixtures = new Set<string>();
    for (const target of ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS) {
      const input = anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey);
      const compiled = await compileAnchorGroupConcretePlacementR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
      const concrete = rows.get("anchor-group-pour:material:ready-mix");
      const expected = Number(input.plan_dimension_concrete_volume_m3)
        * (1 + Number(input.selected_contingency_percent) / 100);
      expect(Number(concrete?.quantity)).toBeCloseTo(expected, 9);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows).toHaveLength(ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS.length);
      expect(compiled.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(anchorGroupConcretePlacementMissingRequiredRowsR2(new Set(rows.keys())))
        .toEqual([]);
      expect(rows.get("anchor-group-pour:work:receive"))
        .toEqual(expect.objectContaining({ unit_id: "m3" }));
      expect(rows.get("anchor-group-pour:work:consolidate"))
        .toEqual(expect.objectContaining({ unit_id: "m3" }));
      expect(rows.get("anchor-group-pour:equipment:pump"))
        .toEqual(expect.objectContaining({ unit_id: "machine_hour" }));
      expect(rows.get("anchor-group-pour:quality:slump"))
        .toEqual(expect.objectContaining({ unit_id: "pcs" }));
      expect(rows.get("anchor-group-pour:document:pour-log"))
        .toEqual(expect.objectContaining({ unit_id: "document" }));
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(7);
  });

  it("calculates the reported 20 m3 high-load case without one-hour placeholders", async () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.find(
      (candidate) => candidate.contextKey === "high_load",
    )!;
    const compiled = await compileAnchorGroupConcretePlacementR1({
      plan_dimension_concrete_volume_m3: 20,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) =>
      compiled.rows.find((row) => row.row_id === rowId)?.quantity;
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(36);
    expect(quantity("anchor-group-pour:material:ready-mix")).toBe("22");
    expect(quantity("anchor-group-pour:work:place")).toBe("20");
    expect(quantity("anchor-group-pour:equipment:pump")).toBe("0.625");
    expect(quantity("anchor-group-pour:equipment:vibrator")).toBe("5.32");
    expect(quantity("anchor-group-pour:delivery:mixer-trips")).toBe("3");
    expect(quantity("anchor-group-pour:quality:slump")).toBe("1");
    expect(compiled.rows.some((row) => row.quantity === "1"
      && row.unit_id === "man_hour")).toBe(false);
  });

  it("keeps assumptions visible, sources traceable and adjacent scope excluded", () => {
    const serialized = JSON.stringify({
      parameters: ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
      resources: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
      source: ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
    });
    expect(serialized).toContain("nrmca_cip31_ready_mix_order");
    expect(serialized).toContain("anchor_group_concrete_placement_high_load_preliminary_profile_r2");
    expect(serialized).toContain("VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS).toHaveLength(26);
    expect(ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES).toHaveLength(38);
  });

  it("rejects an order reserve outside the sourced 4-10 percent range", async () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[0];
    await expect(compileAnchorGroupConcretePlacementR1({
      plan_dimension_concrete_volume_m3: 20,
      selected_contingency_percent: 2,
    }, { catalogId: target.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("maps Latin and Cyrillic cubic-metre prompts to the primary volume", () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[1];
    const consumers = new Map<string, string[]>();
    for (const resource of ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES) {
      const formula = resource.formula_id;
      const definition = ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS.find(
        (parameter) => parameter.parameter_id === "plan_dimension_concrete_volume_m3",
      );
      if (definition && formula) {
        consumers.set(definition.parameter_id, [formula]);
      }
    }
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-anchor-group-concrete-placement-profile-r2-test",
      namespace: "global",
      domain: "concrete",
      workKey: "concrete_foundation_interior_anchor_group_pour_high_load",
      titleRu: target.titleRu,
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        visibilityRole: "USER_INPUT",
        valueSourceRole: parameter.parameter_id === "plan_dimension_concrete_volume_m3"
          ? "USER_MEASURED"
          : "SOURCE_BACKED_PRELIMINARY_PROFILE",
        semanticParameterKey: String(parameter.truth_metadata.semantic_parameter_key),
        formulaConsumers: consumers.get(parameter.parameter_id) ?? [],
      })),
    };
    for (const prompt of [
      `${target.titleRu} — 20 m3`,
      `${target.titleRu} — 20 m³`,
      `${target.titleRu} — 20 м3`,
      `${target.titleRu} — 20 м³`,
    ]) {
      const plan = buildCanonicalBaselinePlan({ catalog, prompt });
      expect(plan.primaryMeasureParameterId).toBe("plan_dimension_concrete_volume_m3");
      expect(plan.parameters.plan_dimension_concrete_volume_m3).toBe("20");
    }
  });
});
