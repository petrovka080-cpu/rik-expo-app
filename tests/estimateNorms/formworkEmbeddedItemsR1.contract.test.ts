import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  formworkEmbeddedItemsPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { PILE_CAP_EMBEDDED_ITEMS_FORMULAS } from "../../src/lib/estimate/v4/pileCapEmbeddedItemsR1";
import {
  FORMWORK_EMBEDDED_ITEMS_FORMULAS,
  FORMWORK_EMBEDDED_ITEMS_PARAMETERS,
  FORMWORK_EMBEDDED_ITEMS_RESOURCES,
  FORMWORK_EMBEDDED_ITEMS_SOURCE_ID,
  FORMWORK_EMBEDDED_ITEMS_TARGETS,
  compileFormworkEmbeddedItemsR1,
  formworkEmbeddedItemsAcceptanceInputR1,
} from "../../src/lib/estimate/v4/formworkEmbeddedItemsR1";

function catalog(target: (typeof FORMWORK_EMBEDDED_ITEMS_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-formwork-embedded-items-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: FORMWORK_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => ({
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
}

describe("formwork embedded items canonical family", () => {
  it("compiles all six exact identities through the shared core", async () => {
    for (const target of FORMWORK_EMBEDDED_ITEMS_TARGETS) {
      const compiled = await compileFormworkEmbeddedItemsR1(
        { ...formworkEmbeddedItemsAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some(
        (row) => row.row_id === "material:concrete:formwork-embedded-items",
      )).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:reinforcement")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:formwork")).toBe(false);
    }
  });

  it("keeps item identity and selected installation technology mandatory", async () => {
    expect(FORMWORK_EMBEDDED_ITEMS_FORMULAS).toBe(PILE_CAP_EMBEDDED_ITEMS_FORMULAS);
    expect(FORMWORK_EMBEDDED_ITEMS_PARAMETERS).toHaveLength(34);
    expect(FORMWORK_EMBEDDED_ITEMS_RESOURCES).toHaveLength(14);
    expect(JSON.stringify({
      parameters: FORMWORK_EMBEDDED_ITEMS_PARAMETERS,
      resources: FORMWORK_EMBEDDED_ITEMS_RESOURCES,
    })).toContain(FORMWORK_EMBEDDED_ITEMS_SOURCE_ID);
    const target = FORMWORK_EMBEDDED_ITEMS_TARGETS[0];
    const input = { ...formworkEmbeddedItemsAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "approved_embedment_design_reference", "embedded_item_schedule_reference",
      "approved_placement_drawing_reference", "tolerance_specification_reference",
      "installation_method_statement_reference",
    ]) delete input[parameterId];
    expect((await compileFormworkEmbeddedItemsR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    delete input.embedded_item_designation;
    expect((await compileFormworkEmbeddedItemsR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ missing_parameter_ids: ["embedded_item_designation"] }),
      ]));
  });

  it("keeps selected welding procedure and direct quantities editable", async () => {
    const target = FORMWORK_EMBEDDED_ITEMS_TARGETS[1];
    const input = { ...formworkEmbeddedItemsAcceptanceInputR1(target.contextKey) };
    delete input.approved_welding_procedure_reference;
    expect((await compileFormworkEmbeddedItemsR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ missing_parameter_ids: ["approved_welding_procedure_reference"] }),
      ]));
    Object.assign(input, {
      approved_welding_procedure_reference:
        formworkEmbeddedItemsAcceptanceInputR1(target.contextKey).approved_welding_procedure_reference,
    });
    delete input.positioning_worker_h;
    expect((await compileFormworkEmbeddedItemsR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ missing_parameter_ids: ["positioning_worker_h"] }),
      ]));
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = FORMWORK_EMBEDDED_ITEMS_TARGETS[4];
    const input = formworkEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...formworkEmbeddedItemsPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    expect(buildCanonicalBaselinePlan({ catalog: catalog(target), prompt }).parameters).toEqual(input);
  });

  it("does not claim neighboring curing identities", async () => {
    await expect(compileFormworkEmbeddedItemsR1(
      formworkEmbeddedItemsAcceptanceInputR1("standard"),
      { catalogId: "canonical-work:base:concrete_foundation_interior_formwork_cure_standard" },
    )).rejects.toThrow("FORMWORK_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED");
  });
});
