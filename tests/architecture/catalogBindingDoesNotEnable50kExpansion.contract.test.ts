import { readProjectFile } from "./catalogBindingArchitectureTestHelpers";

describe("catalog binding does not enable 50k expansion", () => {
  it("keeps this wave scoped out of builtInAi50000 expansion code", () => {
    const bindingSource = readProjectFile("src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts");
    expect(bindingSource).not.toMatch(/builtInAi50000|50000|shard|phase/i);
  });
});
