import { BUILT_IN_AI_10000_POST_BOQ_CASES } from "../../src/lib/ai/builtInAi10000";
import { getAi10000PostBoqArtifacts } from "./ai10000PostBoqTestHelpers";

describe("built-in AI 10000 post-BOQ catalog policy", () => {
  it("requires catalog policy for every governed case and runtime material rows", async () => {
    const artifacts = await getAi10000PostBoqArtifacts();

    expect(BUILT_IN_AI_10000_POST_BOQ_CASES.every((testCase) => testCase.requiredCatalogPolicies.length > 0)).toBe(true);
    expect(artifacts.matrix.all_material_rows_have_catalog_policy).toBe(true);
    expect(artifacts.matrix.catalog_binding_attempted_for_material_rows).toBe(true);
  });
});
