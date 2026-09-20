import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { extractConcretePlacementCanonicalParametersR1, pedestalEmbeddedItemsPromptDetailsR1 } from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS } from "../../src/lib/estimate/v4/columnBaseEmbeddedItemsR1";
import {
  PEDESTAL_EMBEDDED_ITEMS_FORMULAS, PEDESTAL_EMBEDDED_ITEMS_PARAMETERS,
  PEDESTAL_EMBEDDED_ITEMS_RESOURCES, PEDESTAL_EMBEDDED_ITEMS_TARGETS,
  pedestalEmbeddedItemsAcceptanceInputR1, compilePedestalEmbeddedItemsR1,
} from "../../src/lib/estimate/v4/pedestalEmbeddedItemsR1";

function catalog(target: (typeof PEDESTAL_EMBEDDED_ITEMS_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return { catalogId: target.catalogId, releaseId: "prepared-pedestal-embedded-items-test", namespace: "global", domain: "concrete",
    workKey: target.catalogId, titleRu: target.titleRu, definitionVersion: 4, applicability: {}, professionalMetadata: {},
    parameterSchema: PEDESTAL_EMBEDDED_ITEMS_PARAMETERS.map((p) => ({ parameterId: p.parameter_id, ordinal: p.ordinal,
      valueType: p.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"], unitId: p.unit_id,
      titleRu: p.title_ru, required: p.required, defaultValue: p.default_value, constraints: p.constraints_json ?? {}, visibilityRole: "USER_INPUT" })) };
}
describe("pedestal embedded items canonical family", () => {
  it("compiles all six promises through the shared core", async () => {
    for (const target of PEDESTAL_EMBEDDED_ITEMS_TARGETS) {
      const compiled = await compilePedestalEmbeddedItemsR1({ ...pedestalEmbeddedItemsAcceptanceInputR1(target.contextKey) }, { catalogId: target.catalogId });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:pedestal-embedded-items")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
    }
  });
  it("shares formulas and keeps missing quantities editable", async () => {
    expect(PEDESTAL_EMBEDDED_ITEMS_FORMULAS).toBe(COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS);
    expect(PEDESTAL_EMBEDDED_ITEMS_PARAMETERS).toHaveLength(34);
    expect(PEDESTAL_EMBEDDED_ITEMS_RESOURCES).toHaveLength(14);
    const target = PEDESTAL_EMBEDDED_ITEMS_TARGETS[0];
    const input = { ...pedestalEmbeddedItemsAcceptanceInputR1(target.contextKey) };
    for (const p of PEDESTAL_EMBEDDED_ITEMS_PARAMETERS) if (p.value_type === "text") delete input[p.parameter_id];
    delete input.positioning_worker_h;
    expect((await compilePedestalEmbeddedItemsR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([expect.objectContaining({ missing_parameter_ids: ["positioning_worker_h"] })]));
  });
  it("round-trips the shared editable parameter screen", () => {
    const target = PEDESTAL_EMBEDDED_ITEMS_TARGETS[4];
    const input = pedestalEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pedestalEmbeddedItemsPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt })).toEqual(input);
    expect(buildCanonicalBaselinePlan({ catalog: catalog(target), prompt }).parameters).toEqual(input);
  });
});
