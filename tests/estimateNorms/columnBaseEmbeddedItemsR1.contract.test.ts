import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  columnBaseEmbeddedItemsPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS,
  COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS,
  COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES,
  COLUMN_BASE_EMBEDDED_ITEMS_TARGETS,
  columnBaseEmbeddedItemsAcceptanceInputR1,
  compileColumnBaseEmbeddedItemsR1,
} from "../../src/lib/estimate/v4/columnBaseEmbeddedItemsR1";
import { CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";

function catalog(target: (typeof COLUMN_BASE_EMBEDDED_ITEMS_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId, releaseId: "prepared-column-base-embedded-items-test",
    namespace: "global", domain: "concrete", workKey: target.catalogId,
    titleRu: target.titleRu, definitionVersion: 4, applicability: {}, professionalMetadata: {},
    parameterSchema: COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id, ordinal: parameter.ordinal,
      valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
      unitId: parameter.unit_id, titleRu: parameter.title_ru, required: parameter.required,
      defaultValue: parameter.default_value, constraints: parameter.constraints_json ?? {},
      visibilityRole: "USER_INPUT",
    })),
  };
}

describe("column-base embedded items canonical family", () => {
  it("compiles all six exact catalog promises through the shared core", async () => {
    for (const target of COLUMN_BASE_EMBEDDED_ITEMS_TARGETS) {
      const input = columnBaseEmbeddedItemsAcceptanceInputR1(target.contextKey);
      const compiled = await compileColumnBaseEmbeddedItemsR1(input, { catalogId: target.catalogId });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:column-base-embedded-items")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
    }
  });

  it("reuses the accepted embedded-items graph", () => {
    expect(COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS).toBe(CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS);
    expect(COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS).toHaveLength(34);
    expect(COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES).toHaveLength(14);
  });

  it("allows documentary fields to be blank but exposes missing calculation quantities", async () => {
    const target = COLUMN_BASE_EMBEDDED_ITEMS_TARGETS[0];
    const input = { ...columnBaseEmbeddedItemsAcceptanceInputR1(target.contextKey) };
    for (const parameter of COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS) {
      if (parameter.value_type === "text") delete input[parameter.parameter_id];
    }
    delete input.positioning_worker_h;
    const compiled = await compileColumnBaseEmbeddedItemsR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["positioning_worker_h"] }),
    ]));
  });

  it("round-trips the shared editable parameter screen", () => {
    const target = COLUMN_BASE_EMBEDDED_ITEMS_TARGETS[4];
    const input = columnBaseEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...columnBaseEmbeddedItemsPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("embedded_item_count_piece");
    expect(plan.parameters).toEqual(input);
  });

  it("rejects neighboring curing identities", async () => {
    await expect(compileColumnBaseEmbeddedItemsR1(
      columnBaseEmbeddedItemsAcceptanceInputR1("standard"),
      { catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_standard" },
    )).rejects.toThrow("COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED");
  });
});
