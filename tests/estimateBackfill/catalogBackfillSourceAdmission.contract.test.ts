import {
  isSourceAllowedForBackfilledTemplate,
  resolveCatalogSourceEvidence,
} from "../../scripts/estimate/catalogBackfillConveyor";
import { getProductionWorkDefinition10000 } from "../../src/lib/ai/estimateTemplate10000";

describe("catalog backfill source admission", () => {
  it("does not manufacture source evidence from a generated catalog source id", () => {
    const definition = getProductionWorkDefinition10000(
      "concrete_foundation_interior_strip_foundation_pour_standard",
    );
    if (!definition) throw new Error("CATALOG_BACKFILL_TEST_DEFINITION_MISSING");
    const generatedCatalogSourceId =
      "src_professional_norm_pack_catalog_concrete_material_materials_kg_v1";

    expect(resolveCatalogSourceEvidence(generatedCatalogSourceId)).toBeNull();
    expect(isSourceAllowedForBackfilledTemplate({
      sourceId: generatedCatalogSourceId,
      definition,
    })).toBe(false);
  });
});
