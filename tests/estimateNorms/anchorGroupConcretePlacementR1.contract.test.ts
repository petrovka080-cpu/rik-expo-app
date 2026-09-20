import {
  ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
  ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS,
  anchorGroupConcretePlacementAcceptanceInputR1,
  compileAnchorGroupConcretePlacementR1,
} from "../../src/lib/estimate/v4/anchorGroupConcretePlacementR1";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import {
  concretePlacementPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";

describe("anchor group concrete placement canonical family", () => {
  it("compiles seven independent project schedules through the shared concrete-placement owner", async () => {
    const fixtures = new Set<string>();
    const rowCounts = new Set<number>();
    for (const target of ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS) {
      const input = anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey);
      const compiled = await compileAnchorGroupConcretePlacementR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const concrete = compiled.rows.find((row) => row.row_id === "material:concrete:ready-mix");
      const expected = Number(input.plan_dimension_concrete_volume_m3)
        * (1 + Number(input.selected_contingency_percent) / 100);
      expect(Number(concrete?.quantity)).toBeCloseTo(expected, 9);
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.map((row) => row.title_ru)).toEqual(expect.arrayContaining([
        "Укладка и уплотнение бетонной смеси",
        "Глубинный вибратор для уплотнения бетонной смеси",
        "Приёмочный контроль бетонной смеси и ведение журнала бетонирования",
        "Доставка товарного бетона автобетоносмесителями",
      ]));
      expect(compiled.rows.filter((row) => row.included_in_procurement).length)
        .toBeGreaterThanOrEqual(4);
      fixtures.add(JSON.stringify(input));
      rowCounts.add(compiled.rows.length);
    }
    expect(fixtures.size).toBe(7);
    expect(rowCounts.size).toBeGreaterThan(1);
  });

  it("recalculates ready-mix and delivery from their actual project dependencies", async () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[0];
    const input = anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey);
    const original = await compileAnchorGroupConcretePlacementR1(
      { ...input },
      { catalogId: target.catalogId },
    );
    const changed = await compileAnchorGroupConcretePlacementR1({
      ...input,
      plan_dimension_concrete_volume_m3: 10,
      placement_worker_h: 26,
      concrete_delivery_distance_km: 30,
    }, { catalogId: target.catalogId });
    const quantity = (rows: typeof original.rows, rowId: string) =>
      Number(rows.find((row) => row.row_id === rowId)?.quantity);
    expect(quantity(changed.rows, "material:concrete:ready-mix"))
      .toBeGreaterThan(quantity(original.rows, "material:concrete:ready-mix"));
    expect(quantity(changed.rows, "work:concrete:place-and-compact")).toBe(26);
    expect(quantity(changed.rows, "delivery:concrete:ready-mix"))
      .toBeGreaterThan(quantity(original.rows, "delivery:concrete:ready-mix"));
  });

  it("uses one exact NRMCA source and contains no legacy volume-derived rebar or formwork", () => {
    const serialized = JSON.stringify({
      parameters: ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
      resources: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
      source: ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA,
    });
    expect(serialized).toContain("READY_MIX_CONCRETE_ORDER");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS).toHaveLength(36);
    expect(ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES).toHaveLength(15);
  });

  it("rejects the former generic two-percent ready-mix allowance", async () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[0];
    const input = anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey);
    await expect(compileAnchorGroupConcretePlacementR1({
      ...input,
      selected_contingency_percent: 2,
    }, { catalogId: target.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("routes all 32 explicit values through the ordinary consumer baseline", () => {
    const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[0];
    const fixture = anchorGroupConcretePlacementAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...concretePlacementPromptDetailsR1(fixture)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-anchor-group-concrete-placement-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
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
      })),
    };
    const plan = buildCanonicalBaselinePlan({ catalog, prompt });
    expect(plan.primaryMeasureParameterId).toBe("plan_dimension_concrete_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
