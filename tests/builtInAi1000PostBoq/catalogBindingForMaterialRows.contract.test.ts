import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ catalog binding", () => {
  it("attempts catalog binding for every material row", async () => {
    const { matrix, catalogBindings } = await getAi1000PostBoqArtifacts();

    expect(matrix.catalog_binding_attempted_for_material_rows).toBe(true);
    expect(catalogBindings.every((trace) => trace.catalog_binding_missing_rows.length === 0)).toBe(true);
  });
});
